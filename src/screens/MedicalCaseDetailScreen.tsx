import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, RefreshControl, Modal, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import {
  Bell, Settings, User, ChevronDown, ChevronRight,
  HelpCircle, Home, FileText, RefreshCw,
  Activity, MapPin, Paperclip, Clock, CheckCircle, LogOut, ArrowLeft, Shield
} from 'lucide-react-native';
import { api, responderAuthFetch, clearResponderTokens } from '../api';
import { unwrapPEKForResponder } from '../storage/responderCrypto';
import { decryptPayload } from '../storage/evidenceCrypto';
import forge from 'node-forge';

/* Shield icon from lucide */
const ShieldIcon = ({ size = 18 }: { size?: number }) => (
  <Shield size={size} color="#2563EB" />
);


export const MedicalCaseDetailScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();

  const initialCase = route.params?.c || route.params?.caseData;
  const caseId = route.params?.caseId || initialCase?.case_id;
  const [caseData, setCaseData] = useState<any>(initialCase);
  const assignmentId = caseData?.assignment_id || route.params?.assignmentId;

  const handleAssignToMe = async () => {
    try {
      setUpdating(true);
      await api.assignMedicalCaseToMe(caseId);
      await fetchCaseDetail();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not assign case.');
    } finally {
      setUpdating(false);
    }
  };

  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const [evidenceList, setEvidenceList] = useState<any[]>([]);
  const [showEvidence, setShowEvidence] = useState(false);
  const [fetchingEvidence, setFetchingEvidence] = useState(false);

  const [decryptingId, setDecryptingId] = useState<string | null>(null);
  const [decryptedModalVisible, setDecryptedModalVisible] = useState(false);
  const [activeDecryptedItem, setActiveDecryptedItem] = useState<{
    type: string;
    content: string;
    title: string;
    filename?: string;
    capturedAt?: string;
  } | null>(null);

  const fetchCaseDetail = async () => {
    try {
      setLoading(true);
      const data = await api.getMedicalCases();
      const updatedCase = data.find((c: any) => c.case_id === caseId);
      if (updatedCase) setCaseData(updatedCase);
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes('401') || err.message?.includes('403')) {
        handleLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (caseId) {
      api.recordCaseView(caseId).catch(err => console.error('Failed to log case view:', err));
      if (!initialCase) fetchCaseDetail();
    } else {
      navigation.goBack();
    }
  }, [caseId]);

  if (!caseData) return null;

  const handleLogout = async () => {
    await clearResponderTokens();
    navigation.reset({ index: 0, routes: [{ name: 'ResponderLogin' }] });
  };

  const handleStatusUpdate = async (status: string) => {
    try {
      setUpdating(true);
      const updatedAssignment = assignmentId
        ? await api.updateMedicalAssignment(assignmentId, status)
        : await api.resolveMedicalCase(caseData.case_id);
      setCaseData((current: any) => ({
        ...current,
        assignment_status: updatedAssignment.assignment_status ?? status,
        case_status: status === 'RESOLVED' ? 'RESOLVED' : current.case_status,
      }));
      await fetchCaseDetail();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not update status');
    } finally {
      setUpdating(false);
    }
  };

  const handleViewEvidence = async () => {
    if (showEvidence) {
      setShowEvidence(false);
      return;
    }

    try {
      setFetchingEvidence(true);
      const data = await api.getMedicalCaseEvidence(caseData.case_id);
      setEvidenceList(data || []);
      setShowEvidence(true);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not fetch evidence');
    } finally {
      setFetchingEvidence(false);
    }
  };

  const handleDecryptEvidence = async (ev: any) => {
    try {
      setDecryptingId(ev.id);

      // 1. Check access grant
      const grantRes = await responderAuthFetch(`/medical/evidence/${ev.id}/decrypt`);
      if (!grantRes.ok) {
        const err = await grantRes.json();
        throw new Error(err.detail || 'Access denied or grant revoked.');
      }

      const grantData = await grantRes.json();

      // 2. Unwrap PEK locally using Responder's Private Key if available
      let pekHex: string | undefined = undefined;
      if (grantData.wrapped_evidence_key) {
        try {
          pekHex = await unwrapPEKForResponder(grantData.wrapped_evidence_key, grantData.key_encryption_version);
        } catch (e) {
          console.warn('PEK unwrap fallback triggered:', e);
        }
      }

      // 3. Download encrypted payload from Storage URL
      const storageUrl = grantData.signed_url || ev.signed_url;
      if (!storageUrl) throw new Error('Signed download URL not available.');

      const fileRes = await fetch(storageUrl);
      if (!fileRes.ok) throw new Error('Failed to download encrypted file from storage.');

      const storageContent = await fileRes.text();

      // 4. Parse envelope and decrypt payload
      let decryptedText = '';
      try {
        const rawContent = storageContent.trim();
        const envelope = JSON.parse(rawContent);

        if (!envelope || !envelope.ciphertext || !envelope.iv || !envelope.tag) {
          throw new Error('Invalid evidence envelope structure.');
        }

        const encryptedHex = forge.util.decode64(envelope.ciphertext);
        decryptedText = await decryptPayload(encryptedHex, envelope.iv, envelope.tag, pekHex);
      } catch (e: any) {
        console.error('Evidence decryption error:', e);
        Alert.alert('Decryption Failed', e.message || 'Could not decrypt this payload with your responder key.');
        return;
      }

      const evType = (ev.evidence_type || 'TEXT').toUpperCase();
      let displayContent = decryptedText;

      if (evType === 'PHOTO' || ev.mime_type?.startsWith('image')) {
        const cleanBase64 = displayContent.replace(/[\r\n\s]/g, '');
        if (cleanBase64.startsWith('data:')) {
          displayContent = cleanBase64;
        } else {
          displayContent = `data:${ev.mime_type || 'image/jpeg'};base64,${cleanBase64}`;
        }
      }

      setActiveDecryptedItem({
        type: evType,
        content: displayContent,
        title: `${evType} Evidence`,
        filename: ev.original_filename,
        capturedAt: ev.captured_at,
      });
      setDecryptedModalVisible(true);

    } catch (err: any) {
      Alert.alert('Decryption Failed', err.message || 'An error occurred during decryption.');
    } finally {
      setDecryptingId(null);
    }
  };

  const caseIdShort = caseData.case_id.split('-')[0].toUpperCase();
  const riskColor = caseData.risk_level === 'HIGH' ? '#2563EB' : caseData.risk_level === 'MEDIUM' ? '#D97706' : '#15803D';
  const riskBg = caseData.risk_level === 'HIGH' ? '#DBEAFE' : caseData.risk_level === 'MEDIUM' ? '#FEF3C7' : '#DCFCE7';

  /* ─── Section Card ─── */
  const SectionCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={{
      backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0',
      marginBottom: 14, overflow: 'hidden',
      shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 3, elevation: 1,
    }}>
      <View style={{ backgroundColor: '#F8F9FB', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 }}>{title}</Text>
      </View>
      <View style={{ padding: 16 }}>{children}</View>
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

        <View style={{ flexDirection: 'row', gap: 4 }}>
          {[{ label: 'Cases', active: true }].map(t => (
            <TouchableOpacity key={t.label} style={{
              backgroundColor: t.active ? '#FFF' : 'transparent',
              paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
            }}>
              <Text style={{ color: t.active ? '#2563EB' : '#FFF', fontSize: 12, fontWeight: '700' }}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity onPress={fetchCaseDetail} style={{
            backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 5,
            borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 4,
          }}>
            <RefreshCw size={12} color="#FFF" />
            <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '600' }}>Refresh</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setProfileDropdownOpen(!profileDropdownOpen)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' }}>
              <User size={14} color="#2563EB" />
            </View>
            <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '600' }}>Medical</Text>
            <ChevronDown size={12} color="#FFF" />
          </TouchableOpacity>
        </View>

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

      {/* ═══ BODY ═══ */}
      <View style={{ flex: 1, flexDirection: 'row' }}>

        {/* ── LEFT SIDEBAR ── */}
        <View style={{
          width: 72, backgroundColor: '#FFF',
          borderRightWidth: 1, borderRightColor: '#E2E8F0',
          alignItems: 'center', paddingTop: 20, gap: 18,
        }}>
          {[{ icon: FileText, label: 'Cases', active: true }].map(item => (
            <TouchableOpacity key={item.label} style={{
              alignItems: 'center', gap: 3,
              ...(item.active ? { backgroundColor: '#DBEAFE', padding: 8, borderRadius: 10, width: 58 } : { padding: 8 }),
            }}>
              <item.icon size={18} color={item.active ? '#2563EB' : '#94A3B8'} />
              <Text style={{ fontSize: 9, color: item.active ? '#2563EB' : '#94A3B8', fontWeight: item.active ? '700' : '500' }}>{item.label}</Text>
            </TouchableOpacity>
          ))}
          <View style={{ flex: 1 }} />
        </View>

        {/* ── MAIN CONTENT ── */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchCaseDetail} tintColor="#2563EB" />}
        >
          {/* Breadcrumb + Back */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <ArrowLeft size={18} color="#94A3B8" />
            </TouchableOpacity>
            <ShieldIcon size={18} />
            <Text style={{ fontSize: 16, color: '#94A3B8', fontWeight: '500' }}>Cases</Text>
            <ChevronRight size={12} color="#CBD5E1" />
            <Text style={{ fontSize: 16, color: '#1E293B', fontWeight: '700' }}>Case #{caseIdShort}</Text>
          </View>

          {/* Header row: title + Mark Resolved button */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, marginTop: 8 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#1E293B' }}>Medical Case Details</Text>
            {caseData.case_status !== 'RESOLVED' && caseData.case_status !== 'CLOSED' && caseData.case_status !== 'CANCELLED' && (
              <TouchableOpacity
                onPress={() => handleStatusUpdate('RESOLVED')}
                disabled={updating}
                style={{
                  backgroundColor: '#2563EB', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 8,
                  opacity: updating ? 0.6 : 1,
                }}>
                <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>
                  {updating ? 'Updating…' : 'Mark Resolved'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ── Case Overview Card ── */}
          <SectionCard title="Case Details">
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ backgroundColor: riskBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}>
                  <Text style={{ color: riskColor, fontSize: 16, fontWeight: '800' }}>{caseData.risk_level} RISK</Text>
                </View>
                <View style={{ backgroundColor: '#EEF2FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}>
                  <Text style={{ color: '#6366F1', fontSize: 16, fontWeight: '700' }}>{caseData.assignment_status || caseData.case_status}</Text>
                </View>
              </View>
            </View>

            <View style={{ gap: 8 }}>
              {caseData.full_name ? (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Text style={{ fontSize: 16, color: '#94A3B8', fontWeight: '600', width: 100 }}>Victim Name:</Text>
                  <Text style={{ fontSize: 16, color: '#334155', fontWeight: '500', flex: 1 }}>{caseData.full_name}</Text>
                </View>
              ) : null}
              {caseData.phone ? (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Text style={{ fontSize: 16, color: '#94A3B8', fontWeight: '600', width: 100 }}>Phone:</Text>
                  <Text style={{ fontSize: 16, color: '#334155', fontWeight: '500', flex: 1 }}>{caseData.phone}</Text>
                </View>
              ) : null}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Text style={{ fontSize: 16, color: '#94A3B8', fontWeight: '600', width: 100 }}>Case ID:</Text>
                <Text style={{ fontSize: 16, color: '#334155', fontWeight: '500', flex: 1 }}>{caseData.case_id}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Text style={{ fontSize: 16, color: '#94A3B8', fontWeight: '600', width: 100 }}>Assigned:</Text>
                <Text style={{ fontSize: 16, color: '#334155', fontWeight: '500' }}>{caseData.assigned_service?.name || (caseData.assignment_status ? caseData.assignment_status : 'Unassigned')}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Text style={{ fontSize: 16, color: '#94A3B8', fontWeight: '600', width: 100 }}>Created:</Text>
                <Text style={{ fontSize: 16, color: '#334155', fontWeight: '500' }}>{new Date(caseData.created_at).toLocaleString()}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Text style={{ fontSize: 16, color: '#94A3B8', fontWeight: '600', width: 100 }}>Status:</Text>
                <Text style={{ fontSize: 16, color: '#334155', fontWeight: '500' }}>{caseData.case_status}</Text>
              </View>
            </View>

            {/* Flags */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              {caseData.medical_help_requested && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#DBEAFE', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 }}>
                  <Activity size={14} color="#2563EB" />
                  <Text style={{ color: '#2563EB', fontSize: 11, fontWeight: '700' }}>Medical Required</Text>
                </View>
              )}
              {caseData.has_location && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#DCFCE7', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 }}>
                  <MapPin size={14} color="#15803D" />
                  <Text style={{ color: '#15803D', fontSize: 11, fontWeight: '700' }}>
                    Location: {caseData.latitude?.toFixed(4)}, {caseData.longitude?.toFixed(4)}
                  </Text>
                </View>
              )}
            </View>
          </SectionCard>

          <SectionCard title="Assessment">
            <Text style={{ color: '#334155', fontSize: 13 }}>Assessment ID: {caseData.assessment_id || 'N/A'}</Text>
            <Text style={{ color: '#64748B', fontSize: 13, marginTop: 4 }}>ML risk: {caseData.ml_risk_level || 'N/A'} · Final risk: {caseData.final_risk_level || caseData.risk_level}</Text>
            <Text style={{ color: '#64748B', fontSize: 13, marginTop: 4 }}>Decision: {caseData.decision_source || 'N/A'} · Model: {caseData.model_version || 'N/A'}</Text>
          </SectionCard>

          {/* ── Evidence Card ── */}
          <SectionCard title={`Evidence (${caseData.evidence_count} item${caseData.evidence_count !== 1 ? 's' : ''})`}>
            {caseData.evidence_count > 0 ? (
              <TouchableOpacity
                onPress={handleViewEvidence}
                style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' }}>
                    <Paperclip size={16} color="#6366F1" />
                  </View>
                  <View>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#334155' }}>Secure Evidence</Text>
                    <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{caseData.evidence_count} encrypted item(s)</Text>
                  </View>
                </View>
                <View style={{ backgroundColor: '#2563EB', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 }}>
                  <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 11 }}>{showEvidence ? 'HIDE' : (fetchingEvidence ? 'LOADING…' : 'VIEW')}</Text>
                </View>
              </TouchableOpacity>
            ) : (
              <Text style={{ color: '#94A3B8', fontStyle: 'italic', fontSize: 12 }}>No evidence attached to this case.</Text>
            )}

            {showEvidence && evidenceList.length > 0 && (
              <View style={{ marginTop: 14, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 12 }}>
                {evidenceList.map((ev, i) => (
                  <View key={ev.id} style={{
                    paddingVertical: 10,
                    borderBottomWidth: i === evidenceList.length - 1 ? 0 : 1,
                    borderBottomColor: '#F1F5F9',
                  }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ color: '#334155', fontWeight: '600', fontSize: 13 }}>{ev.evidence_type} Evidence</Text>
                      <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
                        <Text style={{ color: '#15803D', fontSize: 10, fontWeight: '700' }}>
                          SHARED — VIEW EVIDENCE
                        </Text>
                      </View>
                    </View>
                    <Text style={{ color: '#94A3B8', fontSize: 11 }}>Captured: {new Date(ev.captured_at).toLocaleString()}</Text>
                    <TouchableOpacity style={{ marginTop: 8, alignSelf: 'flex-start' }} onPress={() => handleDecryptEvidence(ev)} disabled={decryptingId !== null}>
                      <Text style={{ color: '#2563EB', fontSize: 12, fontWeight: '700' }}>{decryptingId === ev.id ? 'Decrypting…' : '→ Decrypt Payload'}</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </SectionCard>

          {/* ── Alert History Card ── */}
          <SectionCard title="Alert History">
            {caseData.alerts?.length === 0 ? (
              <Text style={{ color: '#94A3B8', fontStyle: 'italic', fontSize: 12 }}>No emergency alerts dispatched.</Text>
            ) : (
              caseData.alerts?.map((alert: any, i: number) => (
                <View key={alert.id} style={{
                  paddingVertical: 10,
                  borderBottomWidth: i === caseData.alerts.length - 1 ? 0 : 1,
                  borderBottomColor: '#F1F5F9',
                }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ color: '#334155', fontWeight: '600', fontSize: 13 }}>{alert.recipient_type} ({alert.channel})</Text>
                    <View style={{
                      backgroundColor: alert.status === 'SENT' ? '#DCFCE7' : '#DBEAFE',
                      paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4,
                    }}>
                      <Text style={{ color: alert.status === 'SENT' ? '#15803D' : '#2563EB', fontSize: 10, fontWeight: '700' }}>{alert.status}</Text>
                    </View>
                  </View>
                  <Text style={{ color: '#94A3B8', fontSize: 11 }}>Delivery: {alert.delivery_mode}</Text>
                  <Text style={{ color: '#CBD5E1', fontSize: 11 }}>{new Date(alert.created_at).toLocaleString()}</Text>
                  {alert.failure_reason ? <Text style={{ color: '#B91C1C', fontSize: 11, marginTop: 3 }}>Failure: {alert.failure_reason}</Text> : null}
                </View>
              ))
            )}
          </SectionCard>

          {!caseData.assignment_id && caseData.case_status !== 'RESOLVED' && caseData.case_status !== 'CLOSED' && (
            <TouchableOpacity onPress={handleAssignToMe} disabled={updating} style={{ backgroundColor: '#2563EB', padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 14 }}>
              <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>{updating ? 'Assigning...' : 'Assign to Me'}</Text>
            </TouchableOpacity>
          )}

          {/* ── Case Actions ── */}
          {assignmentId && caseData.assignment_status !== 'RESOLVED' && caseData.assignment_status !== 'CANCELLED' && (
            <SectionCard title="Case Actions">
              {caseData.assignment_status === 'ASSIGNED' && (
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    onPress={() => handleStatusUpdate('ACCEPTED')}
                    disabled={updating}
                    style={{ flex: 1, backgroundColor: '#2563EB', padding: 14, borderRadius: 8, alignItems: 'center' }}>
                    <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>Accept Case</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleStatusUpdate('REJECTED')}
                    disabled={updating}
                    style={{ flex: 1, backgroundColor: '#F1F5F9', padding: 14, borderRadius: 8, alignItems: 'center' }}>
                    <Text style={{ color: '#64748B', fontSize: 16, fontWeight: '700' }}>Reject</Text>
                  </TouchableOpacity>
                </View>
              )}
              {caseData.assignment_status === 'ACCEPTED' && (
                <TouchableOpacity
                  onPress={() => handleStatusUpdate('IN_PROGRESS')}
                  disabled={updating}
                  style={{ backgroundColor: '#F59E0B', padding: 14, borderRadius: 8, alignItems: 'center' }}>
                  <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>Mark In Progress</Text>
                </TouchableOpacity>
              )}
              {caseData.assignment_status === 'IN_PROGRESS' && (
                <TouchableOpacity
                  onPress={() => handleStatusUpdate('RESOLVED')}
                  disabled={updating}
                  style={{ backgroundColor: '#10B981', padding: 14, borderRadius: 8, alignItems: 'center' }}>
                  <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>Resolve Case</Text>
                </TouchableOpacity>
              )}
            </SectionCard>
          )}
        </ScrollView>
      </View>

      {/* ── Decrypted Evidence Preview Modal ── */}
      <Modal
        visible={decryptedModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDecryptedModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.75)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#FFF', borderRadius: 16, width: '100%', maxWidth: 520, padding: 20, maxHeight: '85%', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', pb: 12 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#1E293B' }}>{activeDecryptedItem?.title || 'Decrypted Evidence'}</Text>
              <TouchableOpacity onPress={() => setDecryptedModalVisible(false)} style={{ padding: 6 }}>
                <Text style={{ fontSize: 20, fontWeight: '700', color: '#64748B' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ alignItems: 'center', paddingVertical: 10 }}>
              {activeDecryptedItem?.type === 'PHOTO' || activeDecryptedItem?.content?.startsWith('data:image') ? (
                <Image
                  source={{ uri: activeDecryptedItem.content }}
                  style={{ width: '100%', height: 340, borderRadius: 12, resizeMode: 'contain', backgroundColor: '#000' }}
                />
              ) : (
                <View style={{ width: '100%', backgroundColor: '#F8FAFC', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' }}>
                  <Text style={{ fontSize: 15, color: '#334155', lineHeight: 24, fontWeight: '500' }}>
                    {activeDecryptedItem?.content}
                  </Text>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              onPress={() => setDecryptedModalVisible(false)}
              style={{ marginTop: 16, backgroundColor: '#2563EB', paddingVertical: 14, borderRadius: 10, alignItems: 'center' }}
            >
              <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 15 }}>Close Preview</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};
