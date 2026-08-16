import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../constants/theme';
import { api, setTokens } from '../api';
import { useApp } from '../context/AppContext';

export const SignupScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { checkAuthStatus } = useApp();

  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleNext = () => {
    if (!fullName || !email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setError('');
    setStep(2);
  };

  const handleSignup = async () => {
    if (!pin || pin.length !== 4) {
      setError('PIN must be exactly 4 digits');
      return;
    }
    if (pin !== confirmPin) {
      setError('PINs do not match');
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
      navigation.replace('MainTabs');
    } catch (err: any) {
      setError(err.message || 'Signup failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
        <Text style={{ fontSize: 28, fontWeight: '800', color: COLORS.text, marginBottom: 8 }}>
          {step === 1 ? 'Create Account' : 'Secure Checkout'}
        </Text>
        <Text style={{ fontSize: 14, color: COLORS.textSecondary, marginBottom: 32 }}>
          {step === 1 ? 'Join HavenCart for the best fashion deals' : 'Set a 4-digit PIN for quick checkout'}
        </Text>

        {error ? <Text style={{ color: 'red', marginBottom: 16 }}>{error}</Text> : null}

        {step === 1 ? (
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
            
            <TouchableOpacity 
              onPress={handleNext}
              style={{ backgroundColor: COLORS.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 16 }}
            >
              <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Continue</Text>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 24 }}>
              <Text style={{ color: COLORS.textSecondary }}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={{ color: COLORS.primary, fontWeight: 'bold' }}>Login</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={{ gap: 16 }}>
             <TextInput
              placeholder="Enter 4-digit PIN"
              value={pin}
              onChangeText={setPin}
              keyboardType="numeric"
              maxLength={4}
              secureTextEntry
              style={{ backgroundColor: COLORS.surface, padding: 16, borderRadius: 12, fontSize: 16, textAlign: 'center', letterSpacing: 10 }}
            />
            <TextInput
              placeholder="Confirm 4-digit PIN"
              value={confirmPin}
              onChangeText={setConfirmPin}
              keyboardType="numeric"
              maxLength={4}
              secureTextEntry
              style={{ backgroundColor: COLORS.surface, padding: 16, borderRadius: 12, fontSize: 16, textAlign: 'center', letterSpacing: 10 }}
            />

            <TouchableOpacity 
              onPress={handleSignup}
              disabled={isLoading}
              style={{ backgroundColor: COLORS.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 16, opacity: isLoading ? 0.7 : 1 }}
            >
              {isLoading ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Complete Signup</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setStep(1)} style={{ alignItems: 'center', marginTop: 16 }}>
              <Text style={{ color: COLORS.textSecondary }}>Back</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
