import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../constants/theme';
import { api } from '../api';

export const AccountVerifyScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async () => {
    if (!pin || pin.length !== 4) {
      setError('Please enter a valid 4-digit code');
      return;
    }
    setError('');
    setIsLoading(true);

    try {
      const res = await api.verifyPin(pin);
      if (res.is_match) {
        setPin('');
        navigation.replace('SessionHome');
      } else {
        setError('Incorrect PIN, try again');
      }
    } catch (err: any) {
      // Keep language neutral — do NOT say "wrong safety PIN"
      setError('Incorrect PIN, try again');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, padding: 24, justifyContent: 'center' }}
      >
        <Text style={{ fontSize: 28, fontWeight: '800', color: COLORS.text, marginBottom: 8 }}>
          Account Verification
        </Text>
        <Text style={{ fontSize: 14, color: COLORS.textSecondary, marginBottom: 32 }}>
          Enter your 4-digit checkout PIN to continue
        </Text>

        {error ? (
          <Text style={{ color: COLORS.error, marginBottom: 16, fontSize: 13 }}>{error}</Text>
        ) : null}

        <View style={{ gap: 16 }}>
          <TextInput
            placeholder="4-digit PIN"
            value={pin}
            onChangeText={setPin}
            keyboardType="numeric"
            maxLength={4}
            secureTextEntry
            autoFocus
            style={{
              backgroundColor: COLORS.surface,
              padding: 16,
              borderRadius: 12,
              fontSize: 20,
              textAlign: 'center',
              letterSpacing: 12,
            }}
          />

          <TouchableOpacity
            onPress={handleVerify}
            disabled={isLoading}
            style={{
              backgroundColor: COLORS.primary,
              padding: 16,
              borderRadius: 12,
              alignItems: 'center',
              marginTop: 16,
              opacity: isLoading ? 0.7 : 1,
            }}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Verify</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ alignItems: 'center', marginTop: 12 }}
          >
            <Text style={{ color: COLORS.textSecondary, fontSize: 13 }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
