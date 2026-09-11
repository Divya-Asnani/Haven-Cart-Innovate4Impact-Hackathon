import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, RefreshControl, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  Bell, Settings, User, ChevronDown, CheckSquare, Square,
  HelpCircle, Home, FileText, RefreshCw, Activity,
  ChevronRight, LogOut, Shield
} from 'lucide-react-native';
import { api, clearResponderTokens } from '../api';
import { ResponderAlertsPanel } from '../components/ResponderAlertsPanel';
import { alignResponderKeyVersion, generateAndStoreResponderKeyPair, getCurrentKeyVersion, getResponderPublicKey } from '../storage/responderCrypto';

/* Shield icon from lucide */
const ShieldIcon = ({ size = 18 }: { size?: number }) => (
  <Shield size={size} color="#2563EB" />
);


export const MedicalDashboardScreen = () => {
  const navigation = useNavigation<any>();
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [selectedCases, setSelectedCases] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All Cases');
  const [alerts, setAlerts] = useState<any[]>([]);
  const [showAlerts, setShowAlerts] = useState(false);

  const fetchCases = async () => {
    try {
      setLoading(true);
      const data = await api.getMedicalCases();
      setCases(data || []);
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes('401') || err.message?.includes('403')) {
        handleLogout();
      } else {
        Alert.alert('Error', err.message || 'Could not fetch assigned cases.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const ensureKey = async () => {
      try {
        let version = await getCurrentKeyVersion();
        let pubKeyPem = await getResponderPublicKey(version);
        if (version === 0 || !pubKeyPem) {
          const keyPair = await generateAndStoreResponderKeyPair();
          version = keyPair.version;
          pubKeyPem = keyPair.publicKeyPem;
        }
        if (pubKeyPem) {
          const registration = await api.registerResponderPublicKey(pubKeyPem, 'medical');
          if (registration?.version && registration.version !== version) {
            await alignResponderKeyVersion(version, registration.version);
          }
        }
      } catch (e) {
        console.warn('Failed to ensure responder key', e);
      }
    };
    ensureKey();
    fetchCases();
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try { setAlerts((await api.getMedicalAlerts()) || []); } catch (err) { console.error(err); }
  };

  const refreshPortal = () => { fetchCases(); fetchAlerts(); };

  const handleAssignToMe = async (caseId: string) => {
    try {
      await api.assignMedicalCaseToMe(caseId);
      await fetchCases();
    } catch (err: any) {
      Alert.alert('Assignment failed', err.message || 'Could not assign this case.');
    }
  };

  const handleLogout = async () => {
    await clearResponderTokens();
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  const isResolved = (c: any) => c.case_status === 'RESOLVED' || c.case_status === 'CLOSED' || c.assignment_status === 'RESOLVED';

  const activeCases = cases.filter(c => !isResolved(c) && c.assignment_status !== 'REJECTED');

  const totalCount = cases.length;
  const highRiskCount = cases.filter(c => c.risk_level === 'HIGH').length;
  const resolvedCount = cases.filter(c => isResolved(c)).length;
  const pendingCount = cases.filter(c => !isResolved(c)).length;

  const displayedCases = cases.filter(c => {
    if (activeFilter === 'High Risk' && c.risk_level !== 'HIGH') return false;
    if (activeFilter === 'Medium Risk' && c.risk_level !== 'MEDIUM') return false;
    if (activeFilter === 'Low Risk' && c.risk_level !== 'LOW') return false;
    if (activeFilter === 'Medical' && !c.medical_help_requested) return false;
    if (activeFilter === 'Resolved' && !isResolved(c)) return false;
    if (searchQuery) {
      if (!c.case_id.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    }
    return true;
  });

  const toggleSelectCase = (caseId: string) => {
    setSelectedCases(prev => ({ ...prev, [caseId]: !prev[caseId] }));
  };

  const toggleSelectAll = () => {
    const allSelected = displayedCases.length > 0 && displayedCases.every(c => selectedCases[c.case_id]);
    const next: Record<string, boolean> = {};
    if (!allSelected) {
      displayedCases.forEach(c => { next[c.case_id] = true; });
    }
    setSelectedCases(next);
  };

  const handleMarkSelectedResolved = async () => {
    const selectedIds = Object.keys(selectedCases).filter(id => selectedCases[id]);
    if (selectedIds.length === 0) {
      Alert.alert('Selection', 'Please select at least one case to resolve.');
      return;
    }
    try {
      setLoading(true);
      const resolvedIds: string[] = [];
      for (const caseId of selectedIds) {
        const c = cases.find(item => item.case_id === caseId);
        if (c) {
          if (c.assignment_id) await api.updateMedicalAssignment(c.assignment_id, 'RESOLVED');
          else await api.resolveMedicalCase(caseId);
          resolvedIds.push(caseId);
        }
      }
      setCases(current => current.map(c => resolvedIds.includes(c.case_id)
        ? { ...c, assignment_status: 'RESOLVED', case_status: 'RESOLVED' }
        : c));
      Alert.alert('Success', 'Selected cases marked as resolved.');
      setSelectedCases({});
      fetchCases();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not resolve cases.');
    } finally {
      setLoading(false);
    }
  };

  /* ─── Stat Card ─── */
  const StatCard = ({ label, value, color = '#1E293B' }: { label: string; value: number; color?: string }) => (
    <View style={{
      flex: 1, backgroundColor: '#FFFFFF', padding: 14, borderRadius: 10,
      borderWidth: 1, borderColor: '#E2E8F0',
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
    }}>
      <Text style={{ fontSize: 16, fontWeight: '600', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Text>
      <Text style={{ fontSize: 30, fontWeight: '800', color, marginTop: 4 }}>{value}</Text>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8F9FB' }} edges={['top', 'left', 'right']}>

      {/* ═══ TOP BAR ═══ */}
      <View style={{
        height: 56, backgroundColor: '#2563EB',
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, zIndex: 50,
      }}>
        <Text style={{ fontSize: 17, fontWeight: '900', color: '#FFF', letterSpacing: 1.5 }}>HAVENCART</Text>

        {/* Pill Nav Tabs */}
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {[{ label: 'Cases', active: !showAlerts }, { label: 'Alerts', active: showAlerts }].map(t => (
            <TouchableOpacity key={t.label} style={{
              backgroundColor: t.active ? '#FFF' : 'transparent',
              paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
            }} onPress={() => setShowAlerts(t.label === 'Alerts')}>
              <Text style={{ color: t.active ? '#2563EB' : '#FFF', fontSize: 12, fontWeight: '700' }}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Profile + Refresh */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity
            onPress={refreshPortal}
            style={{
              backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 5,
              borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 4,
            }}>
            <RefreshCw size={12} color="#FFF" />
            <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '600' }}>Refresh</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setProfileDropdownOpen(!profileDropdownOpen)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' }}>
              <User size={14} color="#2563EB" />
            </View>
            <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '600' }}>Medical</Text>
            <ChevronDown size={12} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Dropdown */}
        {profileDropdownOpen && (
          <View style={{
            position: 'absolute', top: 52, right: 16,
            backgroundColor: '#FFF', borderRadius: 8,
            borderWidth: 1, borderColor: '#E2E8F0',
            shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5,
            width: 150, padding: 4, zIndex: 100,
          }}>
            <TouchableOpacity style={{ padding: 10 }}>
              <Text style={{ fontSize: 13, color: '#334155', fontWeight: '500' }}>View Profile</Text>
            </TouchableOpacity>
            <View style={{ height: 1, backgroundColor: '#F1F5F9' }} />
            <TouchableOpacity onPress={handleLogout} style={{ padding: 10, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <LogOut size={14} color="#EF4444" />
              <Text style={{ fontSize: 13, color: '#EF4444', fontWeight: '600' }}>Log Out</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ═══ BODY (sidebar + main) ═══ */}
      <View style={{ flex: 1, flexDirection: 'row' }}>

        {/* ── LEFT SIDEBAR ── */}
        <View style={{
          width: 72, backgroundColor: '#FFF',
          borderRightWidth: 1, borderRightColor: '#E2E8F0',
          alignItems: 'center', paddingTop: 20, gap: 18,
        }}>
          {[
            { icon: FileText, label: 'Cases', active: true },
          ].map(item => (
            <TouchableOpacity key={item.label} style={{
              alignItems: 'center', gap: 3,
              ...(item.active ? { backgroundColor: '#FFE4E6', padding: 8, borderRadius: 10, width: 58 } : { padding: 8 }),
            }}>
              <item.icon size={18} color={item.active ? '#2563EB' : '#94A3B8'} />
              <Text style={{ fontSize: 9, color: item.active ? '#2563EB' : '#94A3B8', fontWeight: item.active ? '700' : '500' }}>{item.label}</Text>
            </TouchableOpacity>
          ))}
          <View style={{ flex: 1 }} />
        </View>

        {/* ── MAIN AREA ── */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refreshPortal} tintColor="#2563EB" />}
        >
          {showAlerts && <ResponderAlertsPanel alerts={alerts} color="#2563EB" onRefresh={fetchAlerts} onAlertPress={(alert) => alert.case_id && navigation.navigate('MedicalCaseDetail', { caseId: alert.case_id })} />}
          {/* Title */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <ShieldIcon size={20} />
            <Text style={{ fontSize: 24, fontWeight: '800', color: '#1E293B' }}>Medical Cases</Text>
          </View>
          <Text style={{ fontSize: 16, color: '#64748B', marginBottom: 20, marginLeft: 28 }}>
            Manage and monitor active safety incidents and escalation requests.
          </Text>

          {/* Stat Cards */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
            <StatCard label="Total Cases" value={totalCount} />
            <StatCard label="High Risk" value={highRiskCount} color="#2563EB" />
            <StatCard label="Resolved" value={resolvedCount} color="#10B981" />
            <StatCard label="Pending" value={pendingCount} color="#F59E0B" />
          </View>

          {/* Filter & Search Row */}
          <View style={{ marginBottom: 14, gap: 10 }}>
            <TextInput
              placeholder="Search by Case ID..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={{ backgroundColor: '#FFF', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', fontSize: 16 }}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {['All Cases', 'High Risk', 'Medium Risk', 'Low Risk', 'Resolved'].map(f => {
                const isActive = activeFilter === f;
                return (
                  <TouchableOpacity key={f} onPress={() => setActiveFilter(f)} style={{
                    backgroundColor: isActive ? '#2563EB' : '#FFF',
                    borderWidth: 1, borderColor: isActive ? '#2563EB' : '#CBD5E1',
                    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6,
                  }}>
                    <Text style={{ color: isActive ? '#FFF' : '#64748B', fontSize: 14, fontWeight: '600' }}>{f}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Action Row */}
          <View style={{
            flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
            padding: 10, backgroundColor: '#FFF', borderRadius: 8,
            borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 10,
          }}>
            <TouchableOpacity onPress={toggleSelectAll} style={{
              borderWidth: 1, borderColor: '#CBD5E1', paddingHorizontal: 10, paddingVertical: 5,
              borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 4,
            }}>
              <Text style={{ color: '#64748B', fontSize: 16, fontWeight: '600' }}>Select All</Text>
              <ChevronDown size={10} color="#64748B" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleMarkSelectedResolved} style={{
              backgroundColor: '#2563EB', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 6,
            }}>
              <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>Mark Selected Resolved</Text>
            </TouchableOpacity>
          </View>

          {/* Case List */}
          {displayedCases.length === 0 ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Text style={{ color: '#94A3B8', fontSize: 16, fontStyle: 'italic' }}>No active cases found.</Text>
            </View>
          ) : (
            displayedCases.map(c => {
              const isSelected = !!selectedCases[c.case_id];
              const riskColor = c.risk_level === 'HIGH' ? '#2563EB' : c.risk_level === 'MEDIUM' ? '#D97706' : '#15803D';
              const riskBg = c.risk_level === 'HIGH' ? '#FFE4E6' : c.risk_level === 'MEDIUM' ? '#FEF3C7' : '#DCFCE7';
              return (
                <View key={c.case_id} style={{
                  flexDirection: 'row', alignItems: 'center', gap: 10,
                  padding: 12, backgroundColor: '#FFF', borderRadius: 8,
                  borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 6,
                }}>
                  <TouchableOpacity onPress={() => toggleSelectCase(c.case_id)}>
                    {isSelected
                      ? <CheckSquare size={18} color="#2563EB" />
                      : <Square size={18} color="#CBD5E1" />}
                  </TouchableOpacity>

                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => navigation.navigate('MedicalCaseDetail', { caseId: c.case_id, assignmentId: c.assignment_id, c })}
                      style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: 17, fontWeight: '700', color: '#2563EB' }}>
                        #{c.case_id.split('-')[0].toUpperCase()}
                      </Text>
                      <View style={{ backgroundColor: riskBg, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4 }}>
                        <Text style={{ color: riskColor, fontSize: 16, fontWeight: '800' }}>{c.risk_level}</Text>
                      </View>
                      {c.medical_help_requested && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                          <Activity size={10} color="#2563EB" />
                          <Text style={{ color: '#2563EB', fontSize: 16, fontWeight: '700' }}>MEDICAL</Text>
                        </View>
                      )}
                      <View style={{ flex: 1 }} />
                      <Text style={{ fontSize: 16, color: '#94A3B8', fontWeight: '500' }}>
                        {c.assignment_status || c.case_status}
                      </Text>
                    </TouchableOpacity>
                    {!c.assignment_id && !isResolved(c) && <TouchableOpacity onPress={() => handleAssignToMe(c.case_id)} style={{ backgroundColor: '#2563EB', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 5 }}><Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>Assign to Me</Text></TouchableOpacity>}
                    {c.assignment_id && <Text style={{ color: '#15803D', fontSize: 12, fontWeight: '700' }}>Assigned</Text>}
                    <ChevronRight size={14} color="#CBD5E1" />
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};
