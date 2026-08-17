import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../constants/theme';
import { api, setTokens } from '../api';
import { useApp } from '../context/AppContext';

export const LoginScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { checkAuthStatus } = useApp();

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
      const res = await api.login({ email, password });
      if (!res.access_token || !res.refresh_token) {
        throw new Error('Login succeeded but tokens were not returned by backend');
      }

      await setTokens(res.access_token, res.refresh_token);
      await checkAuthStatus();
      navigation.replace('MainTabs');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
        <Text style={{ fontSize: 28, fontWeight: '800', color: COLORS.text, marginBottom: 8 }}>
          Welcome Back
        </Text>
        <Text style={{ fontSize: 14, color: COLORS.textSecondary, marginBottom: 32 }}>
          Login to your HavenCart account
        </Text>

        {error ? <Text style={{ color: 'red', marginBottom: 16 }}>{error}</Text> : null}

        <View style={{ gap: 16 }}>
          <TextInput
            placeholder="Email Address"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            style={{ backgroundColor: COLORS.surface, padding: 16, borderRadius: 12, fontSize: 16 }}
          />
          <TextInput
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={{ backgroundColor: COLORS.surface, padding: 16, borderRadius: 12, fontSize: 16 }}
          />

          <TouchableOpacity style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: COLORS.textSecondary }}>Forgot password?</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={handleLogin}
            disabled={isLoading}
            style={{ backgroundColor: COLORS.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 16, opacity: isLoading ? 0.7 : 1 }}
          >
            {isLoading ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Login</Text>}
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 24 }}>
            <Text style={{ color: COLORS.textSecondary }}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
              <Text style={{ color: COLORS.primary, fontWeight: 'bold' }}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
