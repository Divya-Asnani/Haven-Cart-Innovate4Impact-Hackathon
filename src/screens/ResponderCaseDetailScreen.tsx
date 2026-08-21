import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { ShieldAlert, ArrowLeft, MapPin, Activity, Paperclip, Clock, CheckCircle, XCircle } from 'lucide-react-native';
import { api, authFetch } from '../api';
import { unwrapPEKForResponder } from '../storage/responderCrypto';
import { decryptPayload } from '../storage/evidenceCrypto';
import forge from 'node-forge';

export const ResponderCaseDetailScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  
  const initialCase = route.params?.c;
  const assignmentId = route.params?.assignmentId;
  const [caseData, setCaseData] = useState<any>(initialCase);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  
  const [evidenceList, setEvidenceList] = useState<any[]>([]);
  const [showEvidence, setShowEvidence] = useState(false);
  const [fetchingEvidence, setFetchingEvidence] = useState(false);
  
  const fetchCaseDetail = async () => {
    // In a real app we might fetch a single case by ID, but for the hackathon
    // we can just refetch all cases and find ours, or rely on the initial data since it's fully populated.
    try {
      setLoading(true);
      const data = await api.getNGOCases();
      const updatedCase = data.find((c: any) => c.case_id === initialCase.case_id);
      if (updatedCase) setCaseData(updatedCase);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialCase) {
      navigation.goBack();
    } else {
      // Record CASE_VIEWED audit log
      api.recordCaseView(initialCase.case_id).catch(err => console.error('Failed to log case view:', err));
    }
  }, [initialCase]);

  if (!caseData) return null;

  const handleStatusUpdate = async (status: string) => {
    if (!assignmentId) return;
    try {
      setUpdating(true);
      await api.updateNGOAssignment(assignmentId, status);
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
      const data = await api.getNGOCaseEvidence(caseData.case_id);
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
      setUpdating(true);
      
      // 1. Check access grant
      const grantRes = await authFetch(`/ngo/evidence/${ev.id}/decrypt`);
      if (!grantRes.ok) {
        const err = await grantRes.json();
        throw new Error(err.detail || 'Access denied or grant revoked.');
      }
      
      const grantData = await grantRes.json();
      
      // 2. Unwrap PEK locally using Responder's Private Key
      let pekHex;
      try {
        pekHex = await unwrapPEKForResponder(grantData.wrapped_evidence_key, grantData.key_encryption_version);
      } catch (e) {
        throw new Error('Failed to unwrap evidence key using local private key.');
      }
      
      // 3. Download encrypted payload from Storage URL
      const fileRes = await fetch(ev.signed_url);
      if (!fileRes.ok) throw new Error('Failed to download encrypted file from storage.');
      
      // The file content is base64 of a JSON string. We can get it as text.
      // Wait, in syncOfflineEvidence, it sends base64 string, and Supabase stores it as binary or text?
      // Since it uploaded a buffer/blob of the base64 string, it returns that string.
      const base64FileContent = await fileRes.text();
      
      // 4. Decode base64 to JSON using forge
      const jsonEnvelopeStr = forge.util.decode64(base64FileContent);
      const envelope = JSON.parse(jsonEnvelopeStr);
      
      // 5. Decode inner ciphertext base64 back to the original UTF8 hex string
      const encryptedHex = forge.util.decode64(envelope.ciphertext);
      
      // 6. Decrypt Payload
      const decryptedText = await decryptPayload(encryptedHex, envelope.iv, envelope.tag, pekHex);
      
      Alert.alert('Decrypted Payload', decryptedText);
      
    } catch (err: any) {
      Alert.alert('Decryption Failed', err.message || 'An error occurred during decryption.');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0f172a' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1e293b' }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingRight: 16 }}>
          <ArrowLeft size={24} color="#f8fafc" />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '800', color: '#f8fafc' }}>
          Case {caseData.case_id.split('-')[0].toUpperCase()}
        </Text>
      </View>

      <ScrollView 
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchCaseDetail} tintColor="#3b82f6" />}
      >
        {/* Risk & Core Info */}
        <View style={{ backgroundColor: '#1e293b', padding: 16, borderRadius: 12, marginBottom: 16, borderTopWidth: 4, borderTopColor: caseData.risk_level === 'HIGH' ? '#ef4444' : '#f59e0b' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ShieldAlert size={20} color={caseData.risk_level === 'HIGH' ? '#ef4444' : '#f59e0b'} />
              <Text style={{ color: '#f8fafc', fontWeight: '800', fontSize: 18 }}>{caseData.risk_level} RISK</Text>
            </View>
            <View style={{ backgroundColor: '#0f172a', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 }}>
              <Text style={{ color: '#38bdf8', fontSize: 12, fontWeight: '700' }}>{caseData.assignment_status}</Text>
            </View>
          </View>
          
          <Text style={{ color: '#94a3b8', fontSize: 13, marginBottom: 4 }}>ID: {caseData.case_id}</Text>
          <Text style={{ color: '#94a3b8', fontSize: 13, marginBottom: 4 }}>Created: {new Date(caseData.created_at).toLocaleString()}</Text>
          <Text style={{ color: '#94a3b8', fontSize: 13 }}>Status: {caseData.case_status}</Text>
        </View>

        {/* Medical & Location Flags */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
          {caseData.medical_help_requested && (
            <View style={{ flex: 1, backgroundColor: '#7f1d1d', padding: 16, borderRadius: 12, alignItems: 'center' }}>
              <Activity size={24} color="#fca5a5" />
              <Text style={{ color: '#fca5a5', fontWeight: '800', marginTop: 8 }}>MEDICAL</Text>
              <Text style={{ color: '#fca5a5', fontSize: 10, textAlign: 'center', marginTop: 4 }}>Help Requested</Text>
            </View>
          )}
          {caseData.has_location && (
            <View style={{ flex: 1, backgroundColor: '#14532d', padding: 16, borderRadius: 12, alignItems: 'center' }}>
              <MapPin size={24} color="#86efac" />
              <Text style={{ color: '#86efac', fontWeight: '800', marginTop: 8 }}>LOCATION</Text>
              <Text style={{ color: '#86efac', fontSize: 10, textAlign: 'center', marginTop: 4 }}>
                {caseData.latitude?.toFixed(4)}, {caseData.longitude?.toFixed(4)}
              </Text>
            </View>
          )}
        </View>

        {/* Evidence */}
        <TouchableOpacity 
          activeOpacity={caseData.evidence_count > 0 ? 0.7 : 1}
          onPress={caseData.evidence_count > 0 ? handleViewEvidence : undefined}
          style={{ backgroundColor: '#1e293b', padding: 16, borderRadius: 12, marginBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Paperclip size={24} color="#38bdf8" />
            <View>
              <Text style={{ color: '#f8fafc', fontWeight: '700', fontSize: 16 }}>Secure Evidence</Text>
              <Text style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>{caseData.evidence_count} item(s) attached</Text>
            </View>
          </View>
          {caseData.evidence_count > 0 && (
            <View style={{ backgroundColor: '#38bdf8', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 }}>
              <Text style={{ color: '#0f172a', fontWeight: '800', fontSize: 12 }}>{showEvidence ? 'HIDE' : (fetchingEvidence ? 'WAIT' : 'VIEW')}</Text>
            </View>
          )}
        </TouchableOpacity>

        {showEvidence && evidenceList.length > 0 && (
          <View style={{ backgroundColor: '#1e293b', borderRadius: 12, padding: 16, marginBottom: 16 }}>
            {evidenceList.map((ev, i) => (
              <View key={ev.id} style={{ borderBottomWidth: i === evidenceList.length - 1 ? 0 : 1, borderBottomColor: '#334155', paddingVertical: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ color: '#f8fafc', fontWeight: '700' }}>{ev.evidence_type} Evidence</Text>
                  <Text style={{ color: '#10b981', fontSize: 12, fontWeight: '700' }}>ENCRYPTED</Text>
                </View>
                <Text style={{ color: '#94a3b8', fontSize: 11 }}>Captured: {new Date(ev.captured_at).toLocaleString()}</Text>
                <Text style={{ color: '#64748b', fontSize: 11, marginTop: 4 }}>Size: {(ev.file_size_bytes / 1024).toFixed(1)} KB</Text>
                {ev.signed_url ? (
                  <TouchableOpacity style={{ marginTop: 8, alignSelf: 'flex-start' }} onPress={() => handleDecryptEvidence(ev)} disabled={updating}>
                    <Text style={{ color: '#38bdf8', fontSize: 12, fontWeight: '600' }}>{updating ? 'Decrypting...' : 'Decrypt Payload'}</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={{ color: '#ef4444', fontSize: 11, marginTop: 4 }}>Error generating signed URL</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Alerts History */}
        <Text style={{ color: '#94a3b8', fontWeight: '700', marginBottom: 12, fontSize: 12, letterSpacing: 1, marginTop: 8 }}>ALERT HISTORY</Text>
        <View style={{ backgroundColor: '#1e293b', borderRadius: 12, padding: 16, marginBottom: 24 }}>
          {caseData.alerts?.length === 0 ? (
            <Text style={{ color: '#64748b', fontStyle: 'italic' }}>No emergency alerts dispatched.</Text>
          ) : (
            caseData.alerts?.map((alert: any, i: number) => (
              <View key={alert.id} style={{ borderBottomWidth: i === caseData.alerts.length - 1 ? 0 : 1, borderBottomColor: '#334155', paddingVertical: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ color: '#f8fafc', fontWeight: '700' }}>{alert.recipient_type} ({alert.channel})</Text>
                  <Text style={{ color: alert.status === 'SENT' ? '#86efac' : '#fca5a5', fontSize: 12, fontWeight: '700' }}>{alert.status}</Text>
                </View>
                <Text style={{ color: '#94a3b8', fontSize: 11 }}>Delivery: {alert.delivery_mode}</Text>
                <Text style={{ color: '#64748b', fontSize: 11 }}>{new Date(alert.created_at).toLocaleString()}</Text>
              </View>
            ))
          )}
        </View>

        {/* Assignment Actions */}
        {assignmentId && caseData.assignment_status !== 'RESOLVED' && caseData.assignment_status !== 'CANCELLED' && (
          <View style={{ marginBottom: 40 }}>
             <Text style={{ color: '#94a3b8', fontWeight: '700', marginBottom: 12, fontSize: 12, letterSpacing: 1 }}>CASE ACTIONS</Text>
             {caseData.assignment_status === 'ASSIGNED' && (
               <View style={{ flexDirection: 'row', gap: 12 }}>
                 <TouchableOpacity onPress={() => handleStatusUpdate('ACCEPTED')} disabled={updating} style={{ flex: 1, backgroundColor: '#3b82f6', padding: 16, borderRadius: 12, alignItems: 'center' }}>
                   <Text style={{ color: 'white', fontWeight: 'bold' }}>Accept Case</Text>
                 </TouchableOpacity>
                 <TouchableOpacity onPress={() => handleStatusUpdate('REJECTED')} disabled={updating} style={{ flex: 1, backgroundColor: '#334155', padding: 16, borderRadius: 12, alignItems: 'center' }}>
                   <Text style={{ color: '#94a3b8', fontWeight: 'bold' }}>Reject</Text>
                 </TouchableOpacity>
               </View>
             )}
             {caseData.assignment_status === 'ACCEPTED' && (
               <TouchableOpacity onPress={() => handleStatusUpdate('IN_PROGRESS')} disabled={updating} style={{ backgroundColor: '#f59e0b', padding: 16, borderRadius: 12, alignItems: 'center' }}>
                 <Text style={{ color: 'white', fontWeight: 'bold' }}>Mark In Progress</Text>
               </TouchableOpacity>
             )}
             {caseData.assignment_status === 'IN_PROGRESS' && (
               <TouchableOpacity onPress={() => handleStatusUpdate('RESOLVED')} disabled={updating} style={{ backgroundColor: '#10b981', padding: 16, borderRadius: 12, alignItems: 'center' }}>
                 <Text style={{ color: 'white', fontWeight: 'bold' }}>Resolve Case</Text>
               </TouchableOpacity>
             )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};
