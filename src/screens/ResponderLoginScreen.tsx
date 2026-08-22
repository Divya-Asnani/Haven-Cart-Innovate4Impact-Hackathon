import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Svg, { Circle, Path } from 'react-native-svg';
import { api, setResponderTokens, clearResponderTokens } from '../api';

export const ResponderLoginScreen: React.FC = () => {
  const { width } = useWindowDimensions();
  const isWideLayout = width >= 760;
  const navigation = useNavigation<any>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('NGO');
  const [roleOpen, setRoleOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    setError('');
    setIsLoading(true);

    try {
      // Phase 3: Use the existing FastAPI JWT authentication
      const res = await api.login({ email, password, role });
      if (!res.access_token || !res.refresh_token) {
        throw new Error('Login succeeded but tokens were not returned by backend');
      }

      await setResponderTokens(res.access_token, res.refresh_token);
      
      // Verify Responder Access by calling a Responder API
      try {
        await api.getNGOCases();
        // If successful, navigate to responder dashboard
        navigation.replace('ResponderDashboard');
      } catch (accessErr: any) {
        // If 403/401, clear tokens and reject
        await clearResponderTokens();
        throw new Error('Access Denied. You do not have Responder privileges.');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF7F8' }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={{ flex: 1, flexDirection: isWideLayout ? 'row' : 'column' }}>
          <View style={{ flex: isWideLayout ? 0.45 : 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: isWideLayout ? 32 : 20 }}>
            <View style={{ width: '100%', maxWidth: 400, alignSelf: 'center' }}>
              <Text style={{ fontSize: 30, fontWeight: '800', color: '#1E293B', marginBottom: 8 }}>
                Responder Portal
              </Text>
              <Text style={{ fontSize: 17, color: '#64748B', marginBottom: 24 }}>
                Authorized access only.
              </Text>

              {error ? <Text style={{ color: '#ef4444', fontSize: 16, marginBottom: 16 }}>{error}</Text> : null}

              <View style={{ gap: 16 }}>
          <TextInput
            placeholder="Responder Email"
            placeholderTextColor="#64748b"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            style={{ backgroundColor: '#FFF', color: '#1E293B', padding: 16, borderRadius: 12, fontSize: 17, borderWidth: 1, borderColor: '#E2E8F0' }}
          />
          <TextInput
            placeholder="Password"
            placeholderTextColor="#64748b"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={{ backgroundColor: '#FFF', color: '#1E293B', padding: 16, borderRadius: 12, fontSize: 17, borderWidth: 1, borderColor: '#E2E8F0' }}
          />

          <View>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#334155', marginBottom: 8 }}>Login as</Text>
            <TouchableOpacity onPress={() => setRoleOpen(!roleOpen)} style={{ backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 16 }}>
              <Text style={{ fontSize: 17, color: '#1E293B' }}>{role}</Text>
            </TouchableOpacity>
            {roleOpen && (
              <View style={{ backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, marginTop: 6, overflow: 'hidden' }}>
                {['NGO', 'MEDICAL', 'AUTHORITY', 'ADMIN'].map(option => (
                  <TouchableOpacity key={option} onPress={() => { setRole(option); setRoleOpen(false); }} style={{ padding: 15, borderBottomWidth: option === 'ADMIN' ? 0 : 1, borderBottomColor: '#F1F5F9' }}>
                    <Text style={{ fontSize: 17, color: '#1E293B' }}>{option}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <TouchableOpacity 
            onPress={handleLogin}
            disabled={isLoading}
            style={{ backgroundColor: '#FF3F6C', padding: 17, borderRadius: 12, alignItems: 'center', marginTop: 16, opacity: isLoading ? 0.7 : 1 }}
          >
            {isLoading ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 17 }}>Authenticate</Text>}
          </TouchableOpacity>

                <TouchableOpacity onPress={() => navigation.goBack()} style={{ alignItems: 'center', marginTop: 24 }}>
                  <Text style={{ color: '#64748B', fontSize: 16 }}>Return to Shop</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={{ flex: isWideLayout ? 0.55 : 0.7, minHeight: isWideLayout ? undefined : 280, backgroundColor: '#FFF0F3', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <ProtectionIllustration size={isWideLayout ? Math.min(Math.max(width * 0.30, 250), 390) : 230} />
            <Text style={{ fontSize: 17, color: '#475569', textAlign: 'center', marginTop: 4, maxWidth: 320 }}>Protecting lives, one response at a time.</Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// react-native-svg is typed against the project's older React Native types;
// these aliases preserve the inline SVG as native vector content at runtime.
const SvgCanvas: any = Svg;
const SvgCircle: any = Circle;
const SvgPath: any = Path;
const ProtectionIllustration = ({ size }: { size: number }) => (
  <SvgCanvas width={size} height={size} viewBox="0 0 210 210" accessibilityLabel="Shield held by caring hands">
    <SvgCircle cx="105" cy="96" r="82" fill="#FFF" stroke="#FF3F6C" strokeWidth="2" />
    <SvgPath d="M105 43 L145 58 V96 C145 124 128 145 105 157 C82 145 65 124 65 96 V58 Z" fill="#FF3F6C" />
    <SvgPath d="M87 98 L99 110 L124 83" fill="none" stroke="#FFF" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
    <SvgPath d="M35 160 C54 146 73 150 86 170 C92 179 98 182 105 181" fill="none" stroke="#FFB6C1" strokeWidth="5" strokeLinecap="round" />
    <SvgPath d="M175 160 C156 146 137 150 124 170 C118 179 112 182 105 181" fill="none" stroke="#FFB6C1" strokeWidth="5" strokeLinecap="round" />
    <SvgPath d="M42 172 C63 169 76 177 87 190" fill="none" stroke="#FF3F6C" strokeWidth="2" strokeLinecap="round" />
    <SvgPath d="M168 172 C147 169 134 177 123 190" fill="none" stroke="#FF3F6C" strokeWidth="2" strokeLinecap="round" />
  </SvgCanvas>
);
