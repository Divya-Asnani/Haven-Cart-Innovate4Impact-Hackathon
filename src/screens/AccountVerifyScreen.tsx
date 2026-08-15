import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  TouchableWithoutFeedback,
} from 'react-native';
import { Lock, ArrowLeft, Delete } from 'lucide-react-native';
import { COLORS, AUTH_PIN } from '../constants/theme';
import { useApp } from '../context/AppContext';

export const AccountVerifyScreen: React.FC<{ route?: any; navigation: any }> = ({ navigation }) => {
  const { registerInactivityReset, triggerTouchActivity } = useApp();
  const [pin, setPin] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Register 60-second touch inactivity timer to automatically return to Home
  useEffect(() => {
    const unregister = registerInactivityReset(() => {
      navigation.navigate('MainTabs');
    });
    return () => {
      unregister();
    };
  }, []);

  const handleKeyPress = (digit: string) => {
    triggerTouchActivity();
    setErrorMessage('');
    if (pin.length < 4) {
      const nextPin = pin + digit;
      setPin(nextPin);
      if (nextPin.length === 4) {
        verifyPin(nextPin);
      }
    }
  };

  const handleDelete = () => {
    triggerTouchActivity();
    setErrorMessage('');
    if (pin.length > 0) {
      setPin(pin.slice(0, -1));
    }
  };

  const verifyPin = (inputPin: string) => {
    if (inputPin === AUTH_PIN) {
      setPin('');
      navigation.navigate('SessionHome');
    } else {
      setErrorMessage('Incorrect PIN, please try again');
      setPin('');
    }
  };

  return (
    <TouchableWithoutFeedback onPress={triggerTouchActivity}>
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
        {/* Top Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 12,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: COLORS.border,
          }}
        >
          <TouchableOpacity
            onPress={() => {
              triggerTouchActivity();
              navigation.goBack();
            }}
          >
            <ArrowLeft size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text
            style={{
              fontSize: 16,
              fontWeight: '800',
              color: COLORS.text,
              marginLeft: 12,
            }}
          >
            Account Security Check
          </Text>
        </View>

        <View style={{ flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center' }}>
          {/* Lock Icon */}
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: COLORS.primaryLight,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
            }}
          >
            <Lock size={24} color={COLORS.primary} />
          </View>

          <Text style={{ fontSize: 18, fontWeight: '900', color: COLORS.text }}>
            Confirm Account Access
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: COLORS.textSecondary,
              textAlign: 'center',
              marginTop: 6,
              maxWidth: 260,
            }}
          >
            For your security, please confirm your 4-digit PIN to access account preferences.
          </Text>

          {/* 4-Digit Display Dots */}
          <View
            style={{
              flexDirection: 'row',
              gap: 16,
              marginVertical: 24,
            }}
          >
            {[0, 1, 2, 3].map((idx) => {
              const isFilled = pin.length > idx;
              return (
                <View
                  key={idx}
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 8,
                    borderWidth: 2,
                    borderColor: isFilled ? COLORS.primary : COLORS.border,
                    backgroundColor: isFilled ? COLORS.primary : COLORS.background,
                  }}
                />
              );
            })}
          </View>

          {/* Error Message */}
          {errorMessage.length > 0 ? (
            <Text style={{ color: COLORS.error, fontSize: 12, fontWeight: '700', marginBottom: 12 }}>
              {errorMessage}
            </Text>
          ) : null}

          {/* Numeric Keypad Grid */}
          <View style={{ width: '100%', maxWidth: 280, gap: 12, marginTop: 10 }}>
            {[
              ['1', '2', '3'],
              ['4', '5', '6'],
              ['7', '8', '9'],
              ['', '0', 'delete'],
            ].map((row, rIdx) => (
              <View key={rIdx} style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                {row.map((item, cIdx) => {
                  if (item === '') {
                    return <View key={cIdx} style={{ width: 64, height: 64 }} />;
                  }
                  if (item === 'delete') {
                    return (
                      <TouchableOpacity
                        key={cIdx}
                        onPress={handleDelete}
                        style={{
                          width: 64,
                          height: 64,
                          borderRadius: 32,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: COLORS.surface,
                        }}
                      >
                        <Delete size={20} color={COLORS.textSecondary} />
                      </TouchableOpacity>
                    );
                  }
                  return (
                    <TouchableOpacity
                      key={cIdx}
                      onPress={() => handleKeyPress(item)}
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: 32,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: COLORS.surface,
                        borderWidth: 1,
                        borderColor: COLORS.border,
                      }}
                    >
                      <Text style={{ fontSize: 20, fontWeight: '800', color: COLORS.text }}>
                        {item}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        </View>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};
