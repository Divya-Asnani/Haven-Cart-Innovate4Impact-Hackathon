import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShieldAlert, Check, LogOut, FileText, MapPin, Activity, AlertTriangle, Paperclip, Clock } from 'lucide-react-native';
import { api, clearResponderTokens } from '../api';
import { useNavigation } from '@react-navigation/native';

export const ResponderDashboardScreen = () => {
  const navigation = useNavigation<any>();
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCases = async () => {
    try {
      setLoading(true);
      const data = await api.getNGOCases();
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
    fetchCases();
  }, []);

  const handleLogout = async () => {
    await clearResponderTokens();
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  const activeCases = cases.filter(c => c.assignment_status !== 'RESOLVED' && c.assignment_status !== 'REJECTED');
  const pastCases = cases.filter(c => c.assignment_status === 'RESOLVED' || c.assignment_status === 'REJECTED');

  const CaseCard = ({ c, opacity = 1 }: { c: any, opacity?: number }) => (
    <TouchableOpacity 
      activeOpacity={0.8}
      onPress={() => navigation.navigate('ResponderCaseDetail', { caseId: c.case_id, assignmentId: c.assignment_id, c })}
      style={{ backgroundColor: '#1e293b', padding: 16, borderRadius: 12, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: c.risk_level === 'HIGH' ? '#ef4444' : '#f59e0b', opacity }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontWeight: '800', color: '#f8fafc', fontSize: 16 }}>{c.case_id.split('-')[0].toUpperCase()}</Text>
          {c.risk_level === 'HIGH' && (
            <View style={{ backgroundColor: '#7f1d1d', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <AlertTriangle size={12} color="#fca5a5" />
              <Text style={{ color: '#fca5a5', fontSize: 10, fontWeight: '800' }}>HIGH</Text>
            </View>
          )}
        </View>
        <View style={{ backgroundColor: '#0f172a', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
          <Text style={{ color: '#38bdf8', fontSize: 10, fontWeight: '700' }}>{c.assignment_status || c.case_status}</Text>
        </View>
      </View>
      
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        {c.medical_help_requested && (
          <View style={{ backgroundColor: '#7f1d1d', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Activity size={12} color="#fca5a5" />
            <Text style={{ color: '#fca5a5', fontSize: 10, fontWeight: '700' }}>MEDICAL</Text>
          </View>
        )}
        {c.has_location && (
          <View style={{ backgroundColor: '#14532d', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <MapPin size={12} color="#86efac" />
            <Text style={{ color: '#86efac', fontSize: 10, fontWeight: '700' }}>LOCATION</Text>
          </View>
        )}
        <View style={{ backgroundColor: '#334155', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Paperclip size={12} color="#cbd5e1" />
          <Text style={{ color: '#cbd5e1', fontSize: 10, fontWeight: '700' }}>{c.evidence_count} EVIDENCE</Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: '#64748b', fontSize: 11 }}>
          Created: {new Date(c.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Clock size={10} color="#64748b" />
          <Text style={{ color: '#64748b', fontSize: 11 }}>
            Updated: {new Date(c.last_updated_at || c.created_at).toLocaleString([], { timeStyle: 'short' })}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0f172a' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1e293b' }}>
        <Text style={{ fontSize: 18, fontWeight: '800', color: '#f8fafc' }}>Responder Dashboard</Text>
        <TouchableOpacity onPress={handleLogout}>
          <LogOut size={20} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchCases} tintColor="#3b82f6" />}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20, backgroundColor: '#1e293b', padding: 16, borderRadius: 12 }}>
          <ShieldAlert size={28} color="#3b82f6" />
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={{ fontWeight: '700', fontSize: 16, color: '#f8fafc' }}>Case Queue</Text>
            <Text style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>
              Assigned active cases: {activeCases.length}
            </Text>
          </View>
        </View>

        <Text style={{ color: '#94a3b8', fontWeight: '700', marginBottom: 12, fontSize: 12, letterSpacing: 1 }}>ACTIVE ASSIGNMENTS</Text>

        {activeCases.length === 0 ? (
          <Text style={{ color: '#64748b', fontStyle: 'italic', textAlign: 'center', marginVertical: 20 }}>
            No active cases assigned.
          </Text>
        ) : (
          activeCases.map(c => <CaseCard key={c.case_id} c={c} />)
        )}

        {pastCases.length > 0 && (
          <>
            <Text style={{ color: '#94a3b8', fontWeight: '700', marginTop: 24, marginBottom: 12, fontSize: 12, letterSpacing: 1 }}>PAST ASSIGNMENTS</Text>
            {pastCases.map(c => <CaseCard key={c.case_id} c={c} opacity={0.6} />)}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};
