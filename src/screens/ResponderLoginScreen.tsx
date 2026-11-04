import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, useWindowDimensions, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Shield, Lock } from 'lucide-react-native';
import { api, setResponderTokens, clearResponderTokens } from '../api';
import { alignResponderKeyVersion, generateAndStoreResponderKeyPair, getCurrentKeyVersion, getResponderPublicKey } from '../storage/responderCrypto';

export const ResponderLoginScreen: React.FC = () => {
  const { width } = useWindowDimensions();
  const isWideLayout = width >= 760;
  const navigation = useNavigation<any>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const fillCredentials = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError('');
  };

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    setError('');
    setIsLoading(true);

    try {
      const res = await api.login({ email, password });
      if (!res.access_token || !res.refresh_token) {
        throw new Error('Login succeeded but tokens were not returned by backend');
      }

      await setResponderTokens(res.access_token, res.refresh_token);

      // Determine role from backend response or token claim
      let role = (res.user?.role || '').toUpperCase();
      if (!role) {
        try {
          const parts = res.access_token.split('.');
          if (parts.length === 3) {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
            const atob = (input: string) => {
              let str = String(input).replace(/=+$/, '');
              let output = '';
              for (let bc = 0, bs: any = 0, buffer, idx = 0; buffer = str.charAt(idx++); ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer, bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0) {
                buffer = chars.indexOf(buffer);
              }
              return output;
            };
            const payloadStr = atob(parts[1]);
            const payload = JSON.parse(payloadStr);
            if (payload.responder_role) {
              role = payload.responder_role.toUpperCase();
            }
          }
        } catch (e) {
          console.warn('Failed to parse JWT role');
        }
      }

      if (!role) role = 'NGO';

      // Register cryptographic key for responders if not Admin
      if (role !== 'ADMIN') {
        try {
          let localVersion = await getCurrentKeyVersion();
          let publicKeyPem = await getResponderPublicKey(localVersion);
          if (!localVersion || !publicKeyPem) {
            const keyPair = await generateAndStoreResponderKeyPair();
            localVersion = keyPair.version;
            publicKeyPem = keyPair.publicKeyPem;
          }
          const registration = await api.registerResponderPublicKey(publicKeyPem, role === 'MEDICAL' ? 'medical' : 'ngo');
          if (registration?.version && registration.version !== localVersion) {
            await alignResponderKeyVersion(localVersion, registration.version);
          }
        } catch (keyError) {
          console.warn('Responder key registration warning:', keyError);
        }
      }

      try {
        if (role === 'ADMIN') {
          navigation.replace('AdminDashboard');
        } else if (role === 'MEDICAL') {
          await api.getMedicalCases();
          navigation.replace('MedicalDashboard');
        } else {
          await api.getNGOCases();
          navigation.replace('ResponderDashboard');
        }
      } catch (accessErr: any) {
        await clearResponderTokens();
        throw new Error(accessErr.message || 'Access Denied. You do not have active privileges for this portal.');
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
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <View style={{ flex: 1, flexDirection: isWideLayout ? 'row' : 'column' }}>
            <View style={{ flex: isWideLayout ? 0.5 : 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: isWideLayout ? 32 : 20 }}>
              <View style={{ width: '100%', maxWidth: 440, alignSelf: 'center' }}>
                <Text style={{ fontSize: 30, fontWeight: '800', color: '#1E293B', marginBottom: 8 }}>
                  Responder & Admin Portal
                </Text>
                <Text style={{ fontSize: 16, color: '#64748B', marginBottom: 20 }}>
                  Authorized access for Super Admin, NGO, and Medical responders.
                </Text>

                {/* Demo Quick-Fill Credentials Chips */}
                <View style={{ backgroundColor: '#F1F5F9', padding: 12, borderRadius: 10, marginBottom: 20, borderWidth: 1, borderColor: '#E2E8F0' }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 8, textTransform: 'uppercase' }}>
                    Quick-Fill Demo Credentials:
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    <TouchableOpacity
                      onPress={() => fillCredentials('admin@havencart.org', 'SuperAdmin@2026!')}
                      style={{ backgroundColor: '#4F46E5', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 }}
                    >
                      <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>Super Admin</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => fillCredentials('ngo.test@havencart.demo', 'NgoResponder@2026!')}
                      style={{ backgroundColor: '#E11D48', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 }}
                    >
                      <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>NGO Portal</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => fillCredentials('medical.test@havencart.demo', 'MedicalDoctor@2026!')}
                      style={{ backgroundColor: '#059669', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 }}
                    >
                      <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>Medical Portal</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {error ? <Text style={{ color: '#ef4444', fontSize: 15, marginBottom: 16 }}>{error}</Text> : null}

                <View style={{ gap: 16 }}>
                  <TextInput
                    placeholder="Login Email (e.g. admin@havencart.org)"
                    placeholderTextColor="#999999"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={{ backgroundColor: '#FFF', color: '#1A1A1A', padding: 16, borderRadius: 12, fontSize: 16, borderWidth: 1, borderColor: '#E2E8F0' }}
                  />
                  <TextInput
                    placeholder="Password"
                    placeholderTextColor="#999999"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    style={{ backgroundColor: '#FFF', color: '#1A1A1A', padding: 16, borderRadius: 12, fontSize: 16, borderWidth: 1, borderColor: '#E2E8F0' }}
                  />

                  <TouchableOpacity
                    onPress={handleLogin}
                    disabled={isLoading}
                    style={{ backgroundColor: '#FF3F6C', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 12, opacity: isLoading ? 0.7 : 1 }}
                  >
                    {isLoading ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 17 }}>Authenticate & Enter</Text>}
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => navigation.goBack()} style={{ alignItems: 'center', marginTop: 16 }}>
                    <Text style={{ color: '#64748B', fontSize: 15 }}>Return to HavenCart Shop</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={{ flex: isWideLayout ? 0.5 : 0.7, minHeight: isWideLayout ? undefined : 280, backgroundColor: '#FFF0F3', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
              <ProtectionIllustration size={isWideLayout ? Math.min(Math.max(width * 0.30, 250), 380) : 220} />
              <Text style={{ fontSize: 17, fontWeight: '700', color: '#1E293B', textAlign: 'center', marginTop: 16 }}>
                Secure Access & Identity Gateway
              </Text>
              <Text style={{ fontSize: 14, color: '#64748B', textAlign: 'center', marginTop: 6, maxWidth: 320 }}>
                End-to-end encrypted responder & administrative operations powered by Supabase Auth and HavenCart Security.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const ProtectionIllustration = ({ size = 200 }: { size?: number }) => (
  <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#FFE4E8', alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ width: size * 0.75, height: size * 0.75, borderRadius: (size * 0.75) / 2, backgroundColor: '#FFCCD5', alignItems: 'center', justifyContent: 'center' }}>
      <Shield size={size * 0.45} color="#FF3F6C" />
    </View>
  </View>
);
