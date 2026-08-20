import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TouchableWithoutFeedback,
  BackHandler,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, FileText, Camera, Mic, Trash2, ShieldCheck, Clock } from 'lucide-react-native';
import { COLORS } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { getEvidenceQueue, deleteEvidence, EvidenceQueueItem } from '../storage/evidenceQueue';
import { useIsFocused } from '@react-navigation/native';

export const EvidenceVaultScreen = ({ navigation }: { navigation: any }) => {
  const { registerInactivityReset, triggerTouchActivity, clearSafetyState } = useApp();
  const [evidenceList, setEvidenceList] = useState<EvidenceQueueItem[]>([]);
  const isFocused = useIsFocused();

  // Inactivity timeout
  useEffect(() => {
    const cleanup = registerInactivityReset(() => {
      clearSafetyState();
      navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
    });
    return cleanup;
  }, []);

  // Hardware back override
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      clearSafetyState();
      navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
      return true;
    });
    return () => backHandler.remove();
  }, []);

  // Fetch queue
  useEffect(() => {
    if (isFocused) {
      loadQueue();
    }
  }, [isFocused]);

  const loadQueue = async () => {
    const queue = await getEvidenceQueue();
    // Sort by newest first
    setEvidenceList(queue.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
  };

  const handleBack = () => {
    triggerTouchActivity();
    navigation.goBack();
  };

  const handleDelete = (evidenceId: string) => {
    triggerTouchActivity();
    Alert.alert(
      'Delete Document',
      'Are you sure you want to delete this securely stored document? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            await deleteEvidence(evidenceId);
            await loadQueue();
          }
        }
      ]
    );
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'TEXT': return <FileText size={20} color={COLORS.primary} />;
      case 'PHOTO': return <Camera size={20} color={COLORS.primary} />;
      case 'AUDIO': return <Mic size={20} color={COLORS.primary} />;
      default: return <FileText size={20} color={COLORS.primary} />;
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'SYNCED') {
      return (
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#D1FAE5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
          <ShieldCheck size={12} color="#059669" style={{ marginRight: 4 }} />
          <Text style={{ fontSize: 10, fontWeight: '700', color: '#059669' }}>BACKED UP</Text>
        </View>
      );
    }
    if (status === 'FAILED') {
      return (
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEE2E2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
          <Clock size={12} color="#DC2626" style={{ marginRight: 4 }} />
          <Text style={{ fontSize: 10, fontWeight: '700', color: '#DC2626' }}>RETRYING</Text>
        </View>
      );
    }
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
        <Clock size={12} color="#D97706" style={{ marginRight: 4 }} />
        <Text style={{ fontSize: 10, fontWeight: '700', color: '#D97706' }}>QUEUED LOCAL</Text>
      </View>
    );
  };

  return (
    <TouchableWithoutFeedback onPress={triggerTouchActivity}>
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
          <TouchableOpacity onPress={handleBack}>
            <ArrowLeft size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={{ fontSize: 16, fontWeight: '800', color: COLORS.text, marginLeft: 16 }}>Secure Documents</Text>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <View style={{ marginBottom: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 14, color: COLORS.textSecondary, flex: 1, marginRight: 16 }}>
              Files here are encrypted locally. They will securely sync when connection allows.
            </Text>
          </View>

          {evidenceList.length === 0 ? (
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 60, backgroundColor: COLORS.surface, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed' }}>
              <FileText size={48} color={COLORS.textMuted} style={{ marginBottom: 16 }} />
              <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.text }}>No documents yet</Text>
              <Text style={{ fontSize: 13, color: COLORS.textSecondary, marginTop: 8, textAlign: 'center', paddingHorizontal: 32 }}>
                Tap the + button below to securely record text, audio, or photos.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {evidenceList.map(item => (
                <View key={item.evidence_id} style={{ backgroundColor: COLORS.card, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ padding: 12, backgroundColor: COLORS.primaryLight, borderRadius: 12 }}>
                    {getIconForType(item.type)}
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 4 }}>
                      {item.type.charAt(0) + item.type.slice(1).toLowerCase()} Record
                    </Text>
                    <Text style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 8 }}>
                      {new Date(item.created_at).toLocaleString()}
                    </Text>
                    <View style={{ alignSelf: 'flex-start' }}>
                      {getStatusBadge(item.sync_status)}
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => handleDelete(item.evidence_id)} style={{ padding: 8 }}>
                    <Trash2 size={20} color={COLORS.textMuted} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Floating Action Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            triggerTouchActivity();
            navigation.navigate('EvidenceCapture');
          }}
          style={{
            position: 'absolute',
            bottom: 32,
            right: 24,
            backgroundColor: COLORS.primary,
            width: 56,
            height: 56,
            borderRadius: 28,
            alignItems: 'center',
            justifyContent: 'center',
            elevation: 4,
            shadowColor: COLORS.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
          }}
        >
          <Plus size={24} color="#FFF" />
        </TouchableOpacity>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};
