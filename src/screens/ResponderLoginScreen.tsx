import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { api, setResponderTokens, clearResponderTokens } from '../api';

export const ResponderLoginScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      const res = await api.login({ email, password });
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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0f172a' }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
        <Text style={{ fontSize: 28, fontWeight: '800', color: '#f8fafc', marginBottom: 8 }}>
          Responder Portal
        </Text>
        <Text style={{ fontSize: 14, color: '#94a3b8', marginBottom: 32 }}>
          Authorized access only.
        </Text>

        {error ? <Text style={{ color: '#ef4444', marginBottom: 16 }}>{error}</Text> : null}

        <View style={{ gap: 16 }}>
          <TextInput
            placeholder="Responder Email"
            placeholderTextColor="#64748b"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            style={{ backgroundColor: '#1e293b', color: '#f8fafc', padding: 16, borderRadius: 12, fontSize: 16 }}
          />
          <TextInput
            placeholder="Password"
            placeholderTextColor="#64748b"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={{ backgroundColor: '#1e293b', color: '#f8fafc', padding: 16, borderRadius: 12, fontSize: 16 }}
          />

          <TouchableOpacity 
            onPress={handleLogin}
            disabled={isLoading}
            style={{ backgroundColor: '#3b82f6', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 16, opacity: isLoading ? 0.7 : 1 }}
          >
            {isLoading ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Authenticate</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.goBack()} style={{ alignItems: 'center', marginTop: 24 }}>
            <Text style={{ color: '#94a3b8' }}>Return to Shop</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
