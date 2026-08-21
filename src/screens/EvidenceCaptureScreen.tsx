import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
  BackHandler
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Camera, Mic, Type, Check, X, Square } from 'lucide-react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Audio } from 'expo-av';
import { COLORS } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { enqueueEvidence, EvidenceType } from '../storage/evidenceQueue';
import * as FileSystem from 'expo-file-system';

const CameraComponent: any = CameraView;

export const EvidenceCaptureScreen = ({ navigation }: { navigation: any }) => {
  const { registerInactivityReset, triggerTouchActivity, currentRiskAssessment, clearSafetyState } = useApp();
  
  const [activeTab, setActiveTab] = useState<EvidenceType>('TEXT');
  const [textContent, setTextContent] = useState('');
  
  // Camera state
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  
  // Audio state
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);

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

  const handleBack = () => {
    triggerTouchActivity();
    navigation.goBack();
  };

  const handleSave = async () => {
    triggerTouchActivity();
    
    if (activeTab === 'TEXT' && !textContent.trim()) {
      Alert.alert('Empty Note', 'Please enter some text before saving.');
      return;
    }
    if (activeTab === 'PHOTO' && !capturedPhoto) {
      Alert.alert('No Photo', 'Please take a photo before saving.');
      return;
    }
    if (activeTab === 'AUDIO' && !audioUri) {
      Alert.alert('No Audio', 'Please record audio before saving.');
      return;
    }

    try {
      let payloadBase64 = '';
      
      if (activeTab === 'TEXT') {
        payloadBase64 = textContent; // Text stored directly
      } else if (activeTab === 'PHOTO') {
        // Read photo as base64
        payloadBase64 = await FileSystem.readAsStringAsync(capturedPhoto as string, { encoding: 'base64' });
        // Clean up temp file
        await FileSystem.deleteAsync(capturedPhoto as string, { idempotent: true });
      } else if (activeTab === 'AUDIO') {
        // Read audio as base64
        payloadBase64 = await FileSystem.readAsStringAsync(audioUri as string, { encoding: 'base64' });
        await FileSystem.deleteAsync(audioUri as string, { idempotent: true });
      }

      // Link to safety case if a HIGH risk assessment is currently in context
      const localAssessmentId = currentRiskAssessment?.riskLevel === 'HIGH' ? currentRiskAssessment.assessedAt : null; 
      // Note: assessedAt is used here as a placeholder for the local_assessment_id because CurrentRiskAssessment in AppContext lacks the ID. 
      // To properly link, we should store local_assessment_id in AppContext.

      await enqueueEvidence(activeTab, payloadBase64, localAssessmentId);
      navigation.goBack();
      
    } catch (err) {
      console.error('[EvidenceCapture] Failed to save', err);
      Alert.alert('Error', 'Failed to securely encrypt and save the document.');
    }
  };

  // --- Photo Actions ---
  const takePhoto = async () => {
    triggerTouchActivity();
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: false });
      if (photo) setCapturedPhoto(photo.uri);
    } catch (e) {
      Alert.alert('Camera Error', 'Could not capture photo.');
    }
  };

  // --- Audio Actions ---
  const startRecording = async () => {
    triggerTouchActivity();
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permission needed', 'Audio recording permission is required.');
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(recording);
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async () => {
    triggerTouchActivity();
    if (!recording) return;
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setAudioUri(uri);
      setRecording(null);
      setIsRecording(false);
    } catch (err) {
      console.error('Failed to stop recording', err);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={() => { Keyboard.dismiss(); triggerTouchActivity(); }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
        
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={handleBack}>
              <ArrowLeft size={24} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={{ fontSize: 16, fontWeight: '800', color: COLORS.text, marginLeft: 16 }}>Secure Capture</Text>
          </View>
          <TouchableOpacity onPress={handleSave} style={{ backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 }}>
            <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 12 }}>SAVE</Text>
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={{ flexDirection: 'row', padding: 16, gap: 12 }}>
          {(['TEXT', 'PHOTO', 'AUDIO'] as EvidenceType[]).map(tab => (
            <TouchableOpacity
              key={tab}
              onPress={() => { triggerTouchActivity(); setActiveTab(tab); }}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 12,
                backgroundColor: activeTab === tab ? COLORS.primary : COLORS.surface,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 8,
                borderWidth: 1,
                borderColor: activeTab === tab ? COLORS.primary : COLORS.border
              }}
            >
              {tab === 'TEXT' && <Type size={16} color={activeTab === tab ? '#FFF' : COLORS.text} />}
              {tab === 'PHOTO' && <Camera size={16} color={activeTab === tab ? '#FFF' : COLORS.text} />}
              {tab === 'AUDIO' && <Mic size={16} color={activeTab === tab ? '#FFF' : COLORS.text} />}
              <Text style={{ fontSize: 12, fontWeight: '700', color: activeTab === tab ? '#FFF' : COLORS.text }}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content Area */}
        <View style={{ flex: 1, paddingHorizontal: 16, paddingBottom: 16 }}>
          
          {/* TEXT TAB */}
          {activeTab === 'TEXT' && (
            <TextInput
              style={{
                flex: 1,
                backgroundColor: COLORS.surface,
                borderRadius: 16,
                padding: 16,
                fontSize: 16,
                color: COLORS.text,
                textAlignVertical: 'top'
              }}
              multiline
              placeholder="Enter secure notes here. This will be encrypted locally..."
              placeholderTextColor={COLORS.textMuted}
              value={textContent}
              onChangeText={(t: string) => { triggerTouchActivity(); setTextContent(t); }}
            />
          )}

          {/* PHOTO TAB */}
          {activeTab === 'PHOTO' && (
            <View style={{ flex: 1, borderRadius: 16, overflow: 'hidden', backgroundColor: '#000' }}>
              {!cameraPermission?.granted ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <TouchableOpacity onPress={requestCameraPermission} style={{ backgroundColor: COLORS.primary, padding: 12, borderRadius: 8 }}>
                    <Text style={{ color: '#FFF', fontWeight: '700' }}>Grant Camera Access</Text>
                  </TouchableOpacity>
                </View>
              ) : capturedPhoto ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700', marginBottom: 20 }}>Photo Captured</Text>
                  <View style={{ flexDirection: 'row', gap: 20 }}>
                    <TouchableOpacity onPress={() => setCapturedPhoto(null)} style={{ backgroundColor: '#4B5563', padding: 16, borderRadius: 30 }}>
                      <X size={24} color="#FFF" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleSave} style={{ backgroundColor: COLORS.primary, padding: 16, borderRadius: 30 }}>
                      <Check size={24} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <CameraComponent style={{ flex: 1 }} facing="back" ref={cameraRef}>
                  <View style={{ flex: 1, backgroundColor: 'transparent', justifyContent: 'flex-end', padding: 32, alignItems: 'center' }}>
                    <TouchableOpacity onPress={takePhoto} style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' }}>
                      <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFF' }} />
                    </TouchableOpacity>
                  </View>
                </CameraComponent>
              )}
            </View>
          )}

          {/* AUDIO TAB */}
          {activeTab === 'AUDIO' && (
            <View style={{ flex: 1, backgroundColor: COLORS.surface, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border }}>
              {audioUri ? (
                <View style={{ alignItems: 'center' }}>
                  <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#D1FAE5', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                    <Mic size={32} color="#059669" />
                  </View>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: COLORS.text, marginBottom: 8 }}>Recording Complete</Text>
                  <TouchableOpacity onPress={() => setAudioUri(null)} style={{ marginTop: 24 }}>
                    <Text style={{ fontSize: 14, color: COLORS.textMuted, fontWeight: '600' }}>Delete & Re-record</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ alignItems: 'center' }}>
                  <TouchableOpacity 
                    onPress={isRecording ? stopRecording : startRecording}
                    style={{ 
                      width: 100, 
                      height: 100, 
                      borderRadius: 50, 
                      backgroundColor: isRecording ? '#FEE2E2' : COLORS.primaryLight, 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      borderWidth: isRecording ? 0 : 2,
                      borderColor: COLORS.primary
                    }}
                  >
                    {isRecording ? <Square size={36} color="#DC2626" /> : <Mic size={40} color={COLORS.primary} />}
                  </TouchableOpacity>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: isRecording ? '#DC2626' : COLORS.text, marginTop: 24 }}>
                    {isRecording ? 'Recording...' : 'Tap to Record'}
                  </Text>
                </View>
              )}
            </View>
          )}

        </View>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};
