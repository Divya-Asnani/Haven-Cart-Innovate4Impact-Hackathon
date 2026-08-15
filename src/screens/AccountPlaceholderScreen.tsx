import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  TouchableWithoutFeedback,
} from 'react-native';
import { ArrowLeft, FileText } from 'lucide-react-native';
import { COLORS } from '../constants/theme';
import { useApp } from '../context/AppContext';

interface AccountPlaceholderScreenProps {
  route?: any;
  navigation: any;
}

export const AccountPlaceholderScreen = ({ route, navigation }: AccountPlaceholderScreenProps) => {
  const { title } = (route && route.params) || { title: 'Account Subpage' };
  const { registerInactivityReset, triggerTouchActivity } = useApp();

  useEffect(() => {
    const unregister = registerInactivityReset(() => {
      navigation.navigate('MainTabs');
    });
    return () => {
      unregister();
    };
  }, []);

  return (
    <TouchableWithoutFeedback onPress={triggerTouchActivity}>
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 12,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: COLORS.border,
            gap: 12,
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
          <Text style={{ fontSize: 16, fontWeight: '800', color: COLORS.text }}>
            {title}
          </Text>
        </View>

        {/* Content Box */}
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: COLORS.surface,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
            }}
          >
            <FileText size={32} color={COLORS.textMuted} />
          </View>
          <Text style={{ fontSize: 16, fontWeight: '800', color: COLORS.text }}>
            {title} Detail View
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: COLORS.textMuted,
              textAlign: 'center',
              marginTop: 6,
              maxWidth: 260,
            }}
          >
            No active logs or saved records found for this section. Information updates automatically when synchronized.
          </Text>

          <TouchableOpacity
            onPress={() => {
              triggerTouchActivity();
              navigation.goBack();
            }}
            style={{
              marginTop: 24,
              borderWidth: 1,
              borderColor: COLORS.primary,
              paddingHorizontal: 20,
              paddingVertical: 10,
              borderRadius: 20,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '800', color: COLORS.primary }}>
              BACK TO PREFERENCES
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};
