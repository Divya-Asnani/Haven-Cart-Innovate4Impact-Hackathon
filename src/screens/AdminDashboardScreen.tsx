import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  useWindowDimensions,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  Shield,
  Building,
  PlusCircle,
  Key,
  Power,
  RefreshCw,
  LogOut,
  Search,
  CheckCircle,
  XCircle,
  HeartPulse,
  Users,
  ChevronDown,
  ExternalLink,
  Lock,
  Phone,
  Mail,
  MapPin,
  UserCheck,
} from 'lucide-react-native';
import { api, clearResponderTokens } from '../api';

export const AdminDashboardScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const [organizations, setOrganizations] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');
  const [filterType, setFilterType] = useState<'ALL' | 'NGO' | 'MEDICAL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  // Create form state
  const [orgName, setOrgName] = useState('');
  const [portalType, setPortalType] = useState<'NGO' | 'MEDICAL'>('NGO');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [initialPassword, setInitialPassword] = useState('');
  const [orgAddress, setOrgAddress] = useState('');
  const [creating, setCreating] = useState(false);
  const [formFeedback, setFormFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Reset password modal state
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetting, setResetting] = useState(false);
  const [resetFeedback, setResetFeedback] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [orgsData, statsData] = await Promise.all([
        api.getAdminOrganizations(),
        api.getAdminStats().catch(() => null),
      ]);
      setOrganizations(orgsData || []);
      if (statsData) setStats(statsData);
    } catch (err: any) {
      console.error('Failed to load admin data:', err);
      if (err.message?.includes('403') || err.message?.includes('401')) {
        Alert.alert('Access Denied', 'Super Admin session expired or unauthorized.');
        handleLogout();
      } else {
        Alert.alert('Error', err.message || 'Could not load organizations.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLogout = async () => {
    await clearResponderTokens();
    navigation.replace('ResponderLogin');
  };

  const handleCreateOrg = async () => {
    if (!orgName.trim() || !adminEmail.trim() || !initialPassword.trim()) {
      setFormFeedback({ type: 'error', message: 'Please fill in all required fields.' });
      return;
    }
    if (initialPassword.length < 6) {
      setFormFeedback({ type: 'error', message: 'Password must be at least 6 characters.' });
      return;
    }

    setCreating(true);
    setFormFeedback(null);
    try {
      await api.createOrganization({
        org_name: orgName.trim(),
        portal_type: portalType,
        admin_name: adminName.trim() || `${orgName.trim()} Admin`,
        admin_email: adminEmail.trim(),
        admin_phone: adminPhone.trim() || undefined,
        initial_password: initialPassword.trim(),
        address: orgAddress.trim() || undefined,
      });

      setFormFeedback({
        type: 'success',
        message: `Organization "${orgName}" & administrator "${adminEmail}" created successfully in Supabase Auth!`,
      });

      // Clear form
      setOrgName('');
      setAdminName('');
      setAdminEmail('');
      setAdminPhone('');
      setInitialPassword('');
      setOrgAddress('');

      // Reload list
      await loadData();
    } catch (err: any) {
      setFormFeedback({ type: 'error', message: err.message || 'Failed to create organization.' });
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStatus = async (targetType: 'USER' | 'ORGANIZATION', targetId: string, currentActive: boolean) => {
    try {
      const newStatus = !currentActive;
      await api.adminToggleStatus({
        target_type: targetType,
        target_id: targetId,
        is_active: newStatus,
      });
      await loadData();
    } catch (err: any) {
      Alert.alert('Status Update Failed', err.message || 'Could not toggle status.');
    }
  };

  const openResetPasswordModal = (account: any) => {
    setSelectedAccount(account);
    setNewPassword('');
    setConfirmPassword('');
    setResetFeedback(null);
    setResetModalVisible(true);
  };

  const handleExecutePasswordReset = async () => {
    if (!newPassword || newPassword.length < 6) {
      setResetFeedback('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetFeedback('Passwords do not match.');
      return;
    }

    setResetting(true);
    setResetFeedback(null);
    try {
      await api.adminResetPassword({
        user_id: selectedAccount.user_id,
        email: selectedAccount.email,
        new_password: newPassword,
      });
      Alert.alert('Success', `Password reset successfully for ${selectedAccount.email}`);
      setResetModalVisible(false);
    } catch (err: any) {
      setResetFeedback(err.message || 'Failed to reset password.');
    } finally {
      setResetting(false);
    }
  };

  const filteredOrgs = organizations.filter((org) => {
    const matchesType =
      filterType === 'ALL' ||
      org.portal_type === filterType ||
      (filterType === 'MEDICAL' && org.service_type === 'HOSPITAL');
    const matchesQuery =
      !searchQuery.trim() ||
      org.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.accounts?.some((a: any) => a.email?.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesType && matchesQuery;
  });

  const ngoCount = stats?.ngo_organizations ?? organizations.filter((o) => o.portal_type === 'NGO').length;
  const medicalCount = stats?.medical_organizations ?? organizations.filter((o) => o.portal_type === 'MEDICAL').length;
  const activeAccCount = stats?.active_accounts ?? organizations.reduce((acc, o) => acc + (o.accounts?.filter((a: any) => a.is_active)?.length || 0), 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8F9FB' }} edges={['top', 'left', 'right']}>
      {/* ═══ TOP BAR (Consistent 56px branded header like NGO & Medical) ═══ */}
      <View
        style={{
          height: 56,
          backgroundColor: '#4338CA', // Deep royal indigo matching the governance role
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          zIndex: 50,
        }}
      >
        {/* Brand & Badge */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ fontSize: 17, fontWeight: '900', color: '#FFF', letterSpacing: 1.5 }}>
            HAVENCART
          </Text>
          <View
            style={{
              backgroundColor: 'rgba(255,255,255,0.22)',
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 6,
            }}
          >
            <Text style={{ color: '#EEF2FF', fontSize: 11, fontWeight: '800' }}>SUPER ADMIN</Text>
          </View>
        </View>

        {/* Center Pill Nav Tabs (Mirroring Cases / Alerts pills) */}
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {[
            { label: 'Organizations', tab: 'list' as const },
            { label: '+ Register New', tab: 'create' as const },
          ].map((t) => {
            const active = activeTab === t.tab;
            return (
              <TouchableOpacity
                key={t.label}
                onPress={() => setActiveTab(t.tab)}
                style={{
                  backgroundColor: active ? '#FFF' : 'transparent',
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  borderRadius: 20,
                }}
              >
                <Text
                  style={{
                    color: active ? '#4338CA' : '#FFF',
                    fontSize: 12,
                    fontWeight: '700',
                  }}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Global Portals Switcher + Profile Dropdown */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {isWide && (
            <View style={{ flexDirection: 'row', gap: 6, marginRight: 4 }}>
              <TouchableOpacity
                onPress={() => navigation.navigate('ResponderDashboard')}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  backgroundColor: 'rgba(255,255,255,0.18)',
                  paddingHorizontal: 8,
                  paddingVertical: 5,
                  borderRadius: 6,
                }}
              >
                <Users size={12} color="#FFF" />
                <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '600' }}>NGO Portal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => navigation.navigate('MedicalDashboard')}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  backgroundColor: 'rgba(255,255,255,0.18)',
                  paddingHorizontal: 8,
                  paddingVertical: 5,
                  borderRadius: 6,
                }}
              >
                <HeartPulse size={12} color="#FFF" />
                <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '600' }}>Medical</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            onPress={loadData}
            style={{
              backgroundColor: 'rgba(255,255,255,0.18)',
              paddingHorizontal: 9,
              paddingVertical: 5,
              borderRadius: 6,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <RefreshCw size={12} color="#FFF" />
            <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '600' }}>Refresh</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setProfileDropdownOpen(!profileDropdownOpen)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
          >
            <View
              style={{
                width: 26,
                height: 26,
                borderRadius: 13,
                backgroundColor: '#FFF',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Shield size={14} color="#4338CA" />
            </View>
            <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '600' }}>Admin</Text>
            <ChevronDown size={12} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Dropdown Menu */}
        {profileDropdownOpen && (
          <View
            style={{
              position: 'absolute',
              top: 52,
              right: 16,
              backgroundColor: '#FFF',
              borderRadius: 8,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 5,
              width: 175,
              padding: 4,
              zIndex: 100,
            }}
          >
            <View style={{ padding: 10 }}>
              <Text style={{ fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', fontWeight: '700' }}>
                Signed In As
              </Text>
              <Text style={{ fontSize: 13, color: '#1E293B', fontWeight: '700' }} numberOfLines={1}>
                admin@havencart.org
              </Text>
            </View>
            <View style={{ height: 1, backgroundColor: '#F1F5F9' }} />

            <TouchableOpacity
              onPress={() => {
                setProfileDropdownOpen(false);
                navigation.navigate('ResponderDashboard');
              }}
              style={{ padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}
            >
              <Users size={14} color="#E11D48" />
              <Text style={{ fontSize: 13, color: '#1E293B', fontWeight: '500' }}>NGO Portal</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setProfileDropdownOpen(false);
                navigation.navigate('MedicalDashboard');
              }}
              style={{ padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}
            >
              <HeartPulse size={14} color="#2563EB" />
              <Text style={{ fontSize: 13, color: '#1E293B', fontWeight: '500' }}>Medical Portal</Text>
            </TouchableOpacity>

            <View style={{ height: 1, backgroundColor: '#F1F5F9' }} />

            <TouchableOpacity
              onPress={handleLogout}
              style={{ padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}
            >
              <LogOut size={14} color="#EF4444" />
              <Text style={{ fontSize: 13, color: '#EF4444', fontWeight: '600' }}>Log Out</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ═══ BODY (sidebar + main area) ═══ */}
      <View style={{ flex: 1, flexDirection: 'row' }}>
        {/* ── LEFT SIDEBAR (Matching 72px width on NGO/Medical) ── */}
        <View
          style={{
            width: 72,
            backgroundColor: '#FFF',
            borderRightWidth: 1,
            borderRightColor: '#E2E8F0',
            alignItems: 'center',
            paddingTop: 20,
            gap: 16,
          }}
        >
          {/* Organizations Tab */}
          <TouchableOpacity
            onPress={() => setActiveTab('list')}
            style={{
              alignItems: 'center',
              gap: 3,
              ...(activeTab === 'list'
                ? { backgroundColor: '#EEF2FF', padding: 8, borderRadius: 10, width: 58 }
                : { padding: 8 }),
            }}
          >
            <Building size={18} color={activeTab === 'list' ? '#4338CA' : '#94A3B8'} />
            <Text
              style={{
                fontSize: 9,
                color: activeTab === 'list' ? '#4338CA' : '#94A3B8',
                fontWeight: activeTab === 'list' ? '700' : '500',
              }}
            >
              Orgs
            </Text>
          </TouchableOpacity>

          {/* Register New Tab */}
          <TouchableOpacity
            onPress={() => setActiveTab('create')}
            style={{
              alignItems: 'center',
              gap: 3,
              ...(activeTab === 'create'
                ? { backgroundColor: '#EEF2FF', padding: 8, borderRadius: 10, width: 58 }
                : { padding: 8 }),
            }}
          >
            <PlusCircle size={18} color={activeTab === 'create' ? '#4338CA' : '#94A3B8'} />
            <Text
              style={{
                fontSize: 9,
                color: activeTab === 'create' ? '#4338CA' : '#94A3B8',
                fontWeight: activeTab === 'create' ? '700' : '500',
              }}
            >
              Register
            </Text>
          </TouchableOpacity>

          <View style={{ width: 40, height: 1, backgroundColor: '#E2E8F0', marginVertical: 4 }} />

          {/* Direct Portals Shortcuts */}
          <TouchableOpacity
            onPress={() => navigation.navigate('ResponderDashboard')}
            style={{ alignItems: 'center', gap: 3, padding: 8 }}
          >
            <Users size={18} color="#E11D48" />
            <Text style={{ fontSize: 9, color: '#E11D48', fontWeight: '600' }}>NGO</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('MedicalDashboard')}
            style={{ alignItems: 'center', gap: 3, padding: 8 }}
          >
            <HeartPulse size={18} color="#2563EB" />
            <Text style={{ fontSize: 9, color: '#2563EB', fontWeight: '600' }}>Medical</Text>
          </TouchableOpacity>
        </View>

        {/* ── MAIN CONTENT ── */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor="#4338CA" />}
        >
          {/* Header Title */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Shield size={20} color="#4338CA" />
            <Text style={{ fontSize: 24, fontWeight: '800', color: '#1E293B' }}>
              Super Admin / {activeTab === 'list' ? 'Organizations & Accounts' : 'Register New Organization'}
            </Text>
          </View>
          <Text style={{ fontSize: 15, color: '#64748B', marginBottom: 20, marginLeft: 28 }}>
            Global access control, credential management, and portal routing for all emergency partners.
          </Text>

          {/* Stat Cards (Matching exact StatCard design from NGO & Medical dashboards) */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
            <View
              style={{
                flex: 1,
                minWidth: 140,
                backgroundColor: '#FFFFFF',
                padding: 14,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                TOTAL ORGANIZATIONS
              </Text>
              <Text style={{ fontSize: 30, fontWeight: '800', color: '#1E293B', marginTop: 4 }}>
                {organizations.length}
              </Text>
            </View>

            <View
              style={{
                flex: 1,
                minWidth: 140,
                backgroundColor: '#FFFFFF',
                padding: 14,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                NGO PORTALS
              </Text>
              <Text style={{ fontSize: 30, fontWeight: '800', color: '#FF3F6C', marginTop: 4 }}>
                {ngoCount}
              </Text>
            </View>

            <View
              style={{
                flex: 1,
                minWidth: 140,
                backgroundColor: '#FFFFFF',
                padding: 14,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                MEDICAL PORTALS
              </Text>
              <Text style={{ fontSize: 30, fontWeight: '800', color: '#2563EB', marginTop: 4 }}>
                {medicalCount}
              </Text>
            </View>

            <View
              style={{
                flex: 1,
                minWidth: 140,
                backgroundColor: '#FFFFFF',
                padding: 14,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                ACTIVE ACCOUNTS
              </Text>
              <Text style={{ fontSize: 30, fontWeight: '800', color: '#10B981', marginTop: 4 }}>
                {activeAccCount}
              </Text>
            </View>
          </View>

          {activeTab === 'list' ? (
            <View>
              {/* Filter and Search Row */}
              <View
                style={{
                  flexDirection: isWide ? 'row' : 'column',
                  justifyContent: 'space-between',
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                {/* Filter Pills */}
                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                  {(['ALL', 'NGO', 'MEDICAL'] as const).map((t) => {
                    const active = filterType === t;
                    const label = t === 'ALL' ? 'All Portals' : t === 'NGO' ? 'NGO Portals' : 'Medical Portals';
                    return (
                      <TouchableOpacity
                        key={t}
                        onPress={() => setFilterType(t)}
                        style={{
                          paddingHorizontal: 14,
                          paddingVertical: 7,
                          borderRadius: 20,
                          backgroundColor: active ? '#4338CA' : '#FFFFFF',
                          borderWidth: 1,
                          borderColor: active ? '#4338CA' : '#E2E8F0',
                        }}
                      >
                        <Text
                          style={{
                            color: active ? '#FFF' : '#64748B',
                            fontWeight: active ? '700' : '600',
                            fontSize: 13,
                          }}
                        >
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Search Bar */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#FFFFFF',
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    paddingHorizontal: 12,
                    minWidth: isWide ? 300 : '100%',
                    height: 40,
                  }}
                >
                  <Search size={16} color="#94A3B8" />
                  <TextInput
                    placeholder="Search organization or administrator..."
                    placeholderTextColor="#94A3B8"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    style={{
                      color: '#1E293B',
                      paddingVertical: 6,
                      paddingHorizontal: 8,
                      flex: 1,
                      fontSize: 14,
                    }}
                  />
                </View>
              </View>

              {/* Organization Cards List */}
              {loading ? (
                <ActivityIndicator size="large" color="#4338CA" style={{ marginTop: 40 }} />
              ) : filteredOrgs.length === 0 ? (
                <View
                  style={{
                    backgroundColor: '#FFFFFF',
                    padding: 36,
                    borderRadius: 12,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                  }}
                >
                  <Building size={36} color="#CBD5E1" />
                  <Text style={{ color: '#64748B', fontSize: 16, fontWeight: '600', marginTop: 12 }}>
                    No organizations match your search or filter.
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 14 }}>
                  {filteredOrgs.map((org) => {
                    const isNgo = org.portal_type === 'NGO';
                    return (
                      <View
                        key={org.id}
                        style={{
                          backgroundColor: '#FFFFFF',
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: '#E2E8F0',
                          padding: 16,
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.03,
                          shadowRadius: 4,
                          elevation: 1,
                        }}
                      >
                        {/* Org Header Row */}
                        <View
                          style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            flexWrap: 'wrap',
                            gap: 12,
                            borderBottomWidth: 1,
                            borderBottomColor: '#F1F5F9',
                            paddingBottom: 12,
                          }}
                        >
                          <View style={{ flex: 1, minWidth: 200 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <Text style={{ fontSize: 18, fontWeight: '800', color: '#1E293B' }}>
                                {org.name}
                              </Text>

                              {/* Portal Badge (NGO Pink vs Medical Blue) */}
                              <View
                                style={{
                                  backgroundColor: isNgo ? '#FFE4E6' : '#DBEAFE',
                                  paddingHorizontal: 8,
                                  paddingVertical: 3,
                                  borderRadius: 6,
                                  borderWidth: 1,
                                  borderColor: isNgo ? '#FECDD3' : '#BFDBFE',
                                }}
                              >
                                <Text
                                  style={{
                                    color: isNgo ? '#E11D48' : '#1D4ED8',
                                    fontSize: 11,
                                    fontWeight: '800',
                                  }}
                                >
                                  {isNgo ? 'NGO PORTAL' : 'MEDICAL PORTAL'}
                                </Text>
                              </View>

                              {/* Org Status Badge */}
                              <View
                                style={{
                                  backgroundColor: org.is_active ? '#DCFCE7' : '#FEE2E2',
                                  paddingHorizontal: 8,
                                  paddingVertical: 3,
                                  borderRadius: 6,
                                }}
                              >
                                <Text
                                  style={{
                                    color: org.is_active ? '#15803D' : '#B91C1C',
                                    fontSize: 11,
                                    fontWeight: '700',
                                  }}
                                >
                                  {org.is_active ? 'ACTIVE ORG' : 'INACTIVE ORG'}
                                </Text>
                              </View>
                            </View>

                            {/* Contact Details */}
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 8 }}>
                              {org.email && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                  <Mail size={13} color="#64748B" />
                                  <Text style={{ color: '#64748B', fontSize: 13 }}>{org.email}</Text>
                                </View>
                              )}
                              {org.phone && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                  <Phone size={13} color="#64748B" />
                                  <Text style={{ color: '#64748B', fontSize: 13 }}>{org.phone}</Text>
                                </View>
                              )}
                              {org.address && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                  <MapPin size={13} color="#64748B" />
                                  <Text style={{ color: '#64748B', fontSize: 13 }}>{org.address}</Text>
                                </View>
                              )}
                            </View>
                          </View>

                          {/* Deactivate / Activate Org Button */}
                          <TouchableOpacity
                            onPress={() => handleToggleStatus('ORGANIZATION', org.id, org.is_active)}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 6,
                              paddingHorizontal: 12,
                              paddingVertical: 7,
                              borderRadius: 6,
                              backgroundColor: org.is_active ? '#F8FAFC' : '#EEF2FF',
                              borderWidth: 1,
                              borderColor: org.is_active ? '#E2E8F0' : '#C7D2FE',
                            }}
                          >
                            <Power size={13} color={org.is_active ? '#64748B' : '#4338CA'} />
                            <Text
                              style={{
                                color: org.is_active ? '#64748B' : '#4338CA',
                                fontSize: 12,
                                fontWeight: '700',
                              }}
                            >
                              {org.is_active ? 'Deactivate Org' : 'Activate Org'}
                            </Text>
                          </TouchableOpacity>
                        </View>

                        {/* Administrator & Responder Accounts List */}
                        <View style={{ marginTop: 12 }}>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 8 }}>
                            Administrator & Responder Login Accounts ({org.accounts?.length || 0}):
                          </Text>

                          {org.accounts && org.accounts.length > 0 ? (
                            <View style={{ gap: 8 }}>
                              {org.accounts.map((acc: any, idx: number) => (
                                <View
                                  key={acc.user_id || idx}
                                  style={{
                                    backgroundColor: '#F8FAFC',
                                    padding: 12,
                                    borderRadius: 8,
                                    borderWidth: 1,
                                    borderColor: '#E2E8F0',
                                    flexDirection: isWide ? 'row' : 'column',
                                    justifyContent: 'space-between',
                                    alignItems: isWide ? 'center' : 'flex-start',
                                    gap: 10,
                                  }}
                                >
                                  <View style={{ flex: 1 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                      <Text style={{ color: '#1E293B', fontWeight: '700', fontSize: 14 }}>
                                        {acc.full_name || 'Administrator'}
                                      </Text>
                                      <Text style={{ color: '#4338CA', fontSize: 13, fontWeight: '700' }}>
                                        {acc.email}
                                      </Text>

                                      <View
                                        style={{
                                          backgroundColor: acc.is_active ? '#DCFCE7' : '#FEE2E2',
                                          paddingHorizontal: 6,
                                          paddingVertical: 2,
                                          borderRadius: 4,
                                        }}
                                      >
                                        <Text
                                          style={{
                                            color: acc.is_active ? '#15803D' : '#B91C1C',
                                            fontSize: 10,
                                            fontWeight: '800',
                                          }}
                                        >
                                          {acc.is_active ? 'ACTIVE' : 'DEACTIVATED'}
                                        </Text>
                                      </View>
                                    </View>

                                    <Text style={{ color: '#94A3B8', fontSize: 11, marginTop: 4 }}>
                                      Role: {acc.role || org.portal_type} • Supabase User ID: {acc.user_id}
                                    </Text>
                                  </View>

                                  {/* Actions: Reset Password + Deactivate */}
                                  <View style={{ flexDirection: 'row', gap: 8, alignSelf: isWide ? 'auto' : 'flex-end' }}>
                                    <TouchableOpacity
                                      onPress={() => openResetPasswordModal(acc)}
                                      style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        gap: 5,
                                        backgroundColor: '#FFFBEB',
                                        paddingHorizontal: 11,
                                        paddingVertical: 7,
                                        borderRadius: 6,
                                        borderWidth: 1,
                                        borderColor: '#FDE68A',
                                      }}
                                    >
                                      <Key size={13} color="#D97706" />
                                      <Text style={{ color: '#B45309', fontSize: 12, fontWeight: '700' }}>
                                        Reset Password
                                      </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                      onPress={() => handleToggleStatus('USER', acc.user_id, acc.is_active)}
                                      style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        gap: 5,
                                        backgroundColor: acc.is_active ? '#FEF2F2' : '#F0FDF4',
                                        paddingHorizontal: 11,
                                        paddingVertical: 7,
                                        borderRadius: 6,
                                        borderWidth: 1,
                                        borderColor: acc.is_active ? '#FECACA' : '#BBF7D0',
                                      }}
                                    >
                                      <Power size={13} color={acc.is_active ? '#DC2626' : '#16A34A'} />
                                      <Text
                                        style={{
                                          color: acc.is_active ? '#DC2626' : '#16A34A',
                                          fontSize: 12,
                                          fontWeight: '700',
                                        }}
                                      >
                                        {acc.is_active ? 'Deactivate' : 'Activate'}
                                      </Text>
                                    </TouchableOpacity>
                                  </View>
                                </View>
                              ))}
                            </View>
                          ) : (
                            <Text style={{ color: '#94A3B8', fontSize: 12, fontStyle: 'italic' }}>
                              No active administrator accounts linked yet.
                            </Text>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          ) : (
            /* ═══ CREATE NEW ORGANIZATION & ADMINISTRATOR FORM ═══ */
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                padding: 24,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                maxWidth: 680,
                alignSelf: 'center',
                width: '100%',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 6,
                elevation: 2,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <PlusCircle size={22} color="#4338CA" />
                <Text style={{ fontSize: 20, fontWeight: '800', color: '#1E293B' }}>
                  Register New Organization & Administrator
                </Text>
              </View>
              <Text style={{ fontSize: 14, color: '#64748B', marginBottom: 20 }}>
                Directly provisions the organization, creates administrator credentials in Supabase Auth, and applies authorization policies.
              </Text>

              {formFeedback && (
                <View
                  style={{
                    backgroundColor: formFeedback.type === 'success' ? '#ECFDF5' : '#FEF2F2',
                    padding: 12,
                    borderRadius: 8,
                    marginBottom: 16,
                    borderWidth: 1,
                    borderColor: formFeedback.type === 'success' ? '#A7F3D0' : '#FECACA',
                  }}
                >
                  <Text
                    style={{
                      color: formFeedback.type === 'success' ? '#065F46' : '#991B1B',
                      fontSize: 14,
                      fontWeight: '700',
                    }}
                  >
                    {formFeedback.message}
                  </Text>
                </View>
              )}

              <View style={{ gap: 16 }}>
                {/* Portal Type Radio Pills */}
                <View>
                  <Text style={{ color: '#334155', fontSize: 13, fontWeight: '700', marginBottom: 8 }}>
                    PORTAL TYPE *
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <TouchableOpacity
                      onPress={() => setPortalType('NGO')}
                      style={{
                        flex: 1,
                        padding: 12,
                        borderRadius: 8,
                        backgroundColor: portalType === 'NGO' ? '#FFE4E6' : '#F8FAFC',
                        borderWidth: 2,
                        borderColor: portalType === 'NGO' ? '#FF3F6C' : '#E2E8F0',
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ color: portalType === 'NGO' ? '#E11D48' : '#334155', fontWeight: '800', fontSize: 14 }}>
                        NGO Portal
                      </Text>
                      <Text style={{ color: '#64748B', fontSize: 11, marginTop: 2 }}>
                        Emergency casework & shelter
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setPortalType('MEDICAL')}
                      style={{
                        flex: 1,
                        padding: 12,
                        borderRadius: 8,
                        backgroundColor: portalType === 'MEDICAL' ? '#DBEAFE' : '#F8FAFC',
                        borderWidth: 2,
                        borderColor: portalType === 'MEDICAL' ? '#2563EB' : '#E2E8F0',
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ color: portalType === 'MEDICAL' ? '#1D4ED8' : '#334155', fontWeight: '800', fontSize: 14 }}>
                        Medical Portal
                      </Text>
                      <Text style={{ color: '#64748B', fontSize: 11, marginTop: 2 }}>
                        Hospital & clinical support
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Organization Name */}
                <View>
                  <Text style={{ color: '#334155', fontSize: 13, fontWeight: '700', marginBottom: 6 }}>
                    ORGANIZATION NAME *
                  </Text>
                  <TextInput
                    placeholder="e.g. Hope Women's Relief Society"
                    placeholderTextColor="#94A3B8"
                    value={orgName}
                    onChangeText={setOrgName}
                    style={{
                      backgroundColor: '#FFFFFF',
                      color: '#1E293B',
                      padding: 12,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: '#CBD5E1',
                      fontSize: 15,
                    }}
                  />
                </View>

                {/* Administrator Name */}
                <View>
                  <Text style={{ color: '#334155', fontSize: 13, fontWeight: '700', marginBottom: 6 }}>
                    ADMINISTRATOR FULL NAME
                  </Text>
                  <TextInput
                    placeholder="e.g. Dr. Jane Doe"
                    placeholderTextColor="#94A3B8"
                    value={adminName}
                    onChangeText={setAdminName}
                    style={{
                      backgroundColor: '#FFFFFF',
                      color: '#1E293B',
                      padding: 12,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: '#CBD5E1',
                      fontSize: 15,
                    }}
                  />
                </View>

                {/* Administrator Email */}
                <View>
                  <Text style={{ color: '#334155', fontSize: 13, fontWeight: '700', marginBottom: 6 }}>
                    ADMINISTRATOR LOGIN EMAIL *
                  </Text>
                  <TextInput
                    placeholder="e.g. director@hoperelief.org"
                    placeholderTextColor="#94A3B8"
                    value={adminEmail}
                    onChangeText={setAdminEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={{
                      backgroundColor: '#FFFFFF',
                      color: '#1E293B',
                      padding: 12,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: '#CBD5E1',
                      fontSize: 15,
                    }}
                  />
                </View>

                {/* Initial Password */}
                <View>
                  <Text style={{ color: '#334155', fontSize: 13, fontWeight: '700', marginBottom: 6 }}>
                    INITIAL LOGIN PASSWORD * (Min 6 characters)
                  </Text>
                  <TextInput
                    placeholder="Set initial password for this account"
                    placeholderTextColor="#94A3B8"
                    value={initialPassword}
                    onChangeText={setInitialPassword}
                    secureTextEntry
                    style={{
                      backgroundColor: '#FFFFFF',
                      color: '#1E293B',
                      padding: 12,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: '#CBD5E1',
                      fontSize: 15,
                    }}
                  />
                </View>

                {/* Phone & Address Row */}
                <View style={{ flexDirection: isWide ? 'row' : 'column', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#334155', fontSize: 13, fontWeight: '700', marginBottom: 6 }}>
                      PHONE NUMBER
                    </Text>
                    <TextInput
                      placeholder="+91..."
                      placeholderTextColor="#94A3B8"
                      value={adminPhone}
                      onChangeText={setAdminPhone}
                      keyboardType="phone-pad"
                      style={{
                        backgroundColor: '#FFFFFF',
                        color: '#1E293B',
                        padding: 12,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: '#CBD5E1',
                        fontSize: 15,
                      }}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#334155', fontSize: 13, fontWeight: '700', marginBottom: 6 }}>
                      ADDRESS / CITY
                    </Text>
                    <TextInput
                      placeholder="e.g. Pune, Maharashtra"
                      placeholderTextColor="#94A3B8"
                      value={orgAddress}
                      onChangeText={setOrgAddress}
                      style={{
                        backgroundColor: '#FFFFFF',
                        color: '#1E293B',
                        padding: 12,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: '#CBD5E1',
                        fontSize: 15,
                      }}
                    />
                  </View>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                  onPress={handleCreateOrg}
                  disabled={creating}
                  style={{
                    backgroundColor: '#4338CA',
                    paddingVertical: 14,
                    borderRadius: 8,
                    alignItems: 'center',
                    marginTop: 8,
                    opacity: creating ? 0.7 : 1,
                  }}
                >
                  {creating ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 16 }}>
                      Create Organization & Admin Account
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </View>

      {/* ═══ DIRECT PASSWORD RESET MODAL (Clean Light Theme) ═══ */}
      <Modal
        visible={resetModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setResetModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              padding: 24,
              width: '100%',
              maxWidth: 440,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 10,
              elevation: 6,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <Key size={22} color="#D97706" />
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#1E293B' }}>
                Reset Account Password
              </Text>
            </View>
            <Text style={{ color: '#64748B', fontSize: 13, marginBottom: 16 }}>
              Target: <Text style={{ color: '#4338CA', fontWeight: '700' }}>{selectedAccount?.email}</Text>
              {'\n'}Directly updates credentials in Supabase Auth without requiring email delivery.
            </Text>

            {resetFeedback && (
              <View style={{ backgroundColor: '#FEF2F2', padding: 10, borderRadius: 6, marginBottom: 12, borderWidth: 1, borderColor: '#FECACA' }}>
                <Text style={{ color: '#DC2626', fontSize: 13, fontWeight: '600' }}>{resetFeedback}</Text>
              </View>
            )}

            <View style={{ gap: 12 }}>
              <View>
                <Text style={{ color: '#334155', fontSize: 12, fontWeight: '700', marginBottom: 4 }}>
                  NEW PASSWORD
                </Text>
                <TextInput
                  placeholder="Enter new password (min 6 chars)"
                  placeholderTextColor="#94A3B8"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                  style={{
                    backgroundColor: '#FFFFFF',
                    color: '#1E293B',
                    padding: 10,
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: '#CBD5E1',
                    fontSize: 14,
                  }}
                />
              </View>

              <View>
                <Text style={{ color: '#334155', fontSize: 12, fontWeight: '700', marginBottom: 4 }}>
                  CONFIRM NEW PASSWORD
                </Text>
                <TextInput
                  placeholder="Re-enter new password"
                  placeholderTextColor="#94A3B8"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  style={{
                    backgroundColor: '#FFFFFF',
                    color: '#1E293B',
                    padding: 10,
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: '#CBD5E1',
                    fontSize: 14,
                  }}
                />
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                <TouchableOpacity
                  onPress={() => setResetModalVisible(false)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 6,
                    backgroundColor: '#F1F5F9',
                  }}
                >
                  <Text style={{ color: '#475569', fontWeight: '700' }}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleExecutePasswordReset}
                  disabled={resetting}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 6,
                    backgroundColor: '#4338CA',
                    alignItems: 'center',
                    minWidth: 120,
                  }}
                >
                  {resetting ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Text style={{ color: '#FFF', fontWeight: '700' }}>Save Password</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};
