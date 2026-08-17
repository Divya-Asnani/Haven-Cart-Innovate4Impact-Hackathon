import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../constants/theme';
import { api, setTokens } from '../api';
import { useApp } from '../context/AppContext';

export const SignupScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { checkAuthStatus } = useApp();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignup = async () => {
    if (!fullName || !email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!pin || pin.length !== 4) {
      setError('Delivery ZIP must be exactly 4 digits');
      return;
    }
    if (pin !== confirmPin) {
      setError('ZIP codes do not match');
      return;
    }
    setError('');
    setIsLoading(true);

    try {
      const res = await api.signup({
        full_name: fullName,
        email,
        password,
        pin,
      });

      if (!res.access_token || !res.refresh_token) {
        throw new Error('Signup succeeded but tokens were not returned by backend');
      }

      await setTokens(res.access_token, res.refresh_token);
      await checkAuthStatus(); // Update global auth state
      // Navigate straight to decoy shopping app — NO PIN screen
      navigation.replace('MainTabs');
    } catch (err: any) {
      setError(err.message || 'Signup failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 24, justifyContent: 'center', flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <Text style={{ fontSize: 28, fontWeight: '800', color: COLORS.text, marginBottom: 8 }}>
            Create Account
          </Text>
          <Text style={{ fontSize: 14, color: COLORS.textSecondary, marginBottom: 32 }}>
            Join HavenCart for the best fashion deals
          </Text>

          {error ? <Text style={{ color: 'red', marginBottom: 16 }}>{error}</Text> : null}

          <View style={{ gap: 16 }}>
            <TextInput
              placeholder="Full Name"
              value={fullName}
              onChangeText={setFullName}
              style={{ backgroundColor: COLORS.surface, padding: 16, borderRadius: 12, fontSize: 16 }}
            />
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
            <TextInput
              placeholder="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              style={{ backgroundColor: COLORS.surface, padding: 16, borderRadius: 12, fontSize: 16 }}
            />

            {/* PIN fields — presented as "Delivery ZIP" to look completely ordinary and hide the safety feature */}
            <View style={{ borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 16, marginTop: 4 }}>
              <Text style={{ fontSize: 12, color: COLORS.textSecondary, marginBottom: 8 }}>
                Primary Delivery ZIP (4 digits)
              </Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TextInput
                  placeholder="ZIP Code"
                  value={pin}
                  onChangeText={setPin}
                  keyboardType="numeric"
                  maxLength={4}
                  style={{ flex: 1, backgroundColor: COLORS.surface, padding: 16, borderRadius: 12, fontSize: 16, textAlign: 'center', letterSpacing: 8 }}
                />
                <TextInput
                  placeholder="Confirm ZIP"
                  value={confirmPin}
                  onChangeText={setConfirmPin}
                  keyboardType="numeric"
                  maxLength={4}
                  style={{ flex: 1, backgroundColor: COLORS.surface, padding: 16, borderRadius: 12, fontSize: 16, textAlign: 'center', letterSpacing: 8 }}
                />
              </View>
            </View>
            
            <TouchableOpacity 
              onPress={handleSignup}
              disabled={isLoading}
              style={{ backgroundColor: COLORS.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 16, opacity: isLoading ? 0.7 : 1 }}
            >
              {isLoading ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Create Account</Text>}
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 24 }}>
              <Text style={{ color: COLORS.textSecondary }}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={{ color: COLORS.primary, fontWeight: 'bold' }}>Login</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
