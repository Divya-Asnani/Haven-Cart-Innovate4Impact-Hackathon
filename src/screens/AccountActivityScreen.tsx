import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native';
import { MapPin, HelpCircle, FileText, ChevronRight, ArrowLeft } from 'lucide-react-native';
import { COLORS } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { getAccessToken, clearTokens, api } from '../api';

export const AccountActivityScreen: React.FC<{ route?: any; navigation: any }> = ({ navigation }) => {
  const { registerInactivityReset, triggerTouchActivity } = useApp();

  // Register 60-second touch inactivity timer to automatically return to Home
  useEffect(() => {
    const unregister = registerInactivityReset(() => {
      navigation.navigate('MainTabs');
    });

    let heartbeatInterval: NodeJS.Timeout;

    const startHeartbeat = async () => {
      const token = await getAccessToken();
      if (!token) {
        navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
        return;
      }
      
      heartbeatInterval = setInterval(async () => {
        try {
          const res = await api.sendHeartbeat(token);
          if (res.valid === false) {
             await clearTokens();
             navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
          }
        } catch (e) {
          // Silent navigation on error
          await clearTokens();
          navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
        }
      }, 15000);
    };

    startHeartbeat();

    return () => {
      unregister();
      if (heartbeatInterval) clearInterval(heartbeatInterval);
    };
  }, []);

  const handleItemPress = (title: string) => {
    triggerTouchActivity();
    navigation.navigate('AccountPlaceholder', { title });
  };

  return (
    <TouchableWithoutFeedback onPress={triggerTouchActivity}>
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
        {/* Header Bar */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 12,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: COLORS.border,
          }}
        >
          <TouchableOpacity
            onPress={() => {
              triggerTouchActivity();
              navigation.navigate('MainTabs');
            }}
          >
            <ArrowLeft size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={{ fontSize: 16, fontWeight: '800', color: COLORS.text }}>
            Account Preferences
          </Text>
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: COLORS.primaryLight,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: COLORS.primary, fontWeight: '800', fontSize: 11 }}>HC</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: '900', color: COLORS.text }}>
              Verified Member Overview
            </Text>
            <Text style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 4 }}>
              Manage your verified shopping preferences & account records.
            </Text>
          </View>

          {/* Three Tappable Account Items */}
          <View style={{ gap: 12 }}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleItemPress('Saved Addresses')}
              style={{
                backgroundColor: COLORS.card,
                padding: 16,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: COLORS.border,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                elevation: 1,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View
                  style={{
                    padding: 10,
                    backgroundColor: COLORS.surface,
                    borderRadius: 10,
                  }}
                >
                  <MapPin size={20} color={COLORS.textSecondary} />
                </View>
                <View>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: COLORS.text }}>
                    Saved Addresses
                  </Text>
                  <Text style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>
                    Manage delivery locations & profiles
                  </Text>
                </View>
              </View>
              <ChevronRight size={18} color={COLORS.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleItemPress('Order Support')}
              style={{
                backgroundColor: COLORS.card,
                padding: 16,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: COLORS.border,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                elevation: 1,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View
                  style={{
                    padding: 10,
                    backgroundColor: COLORS.surface,
                    borderRadius: 10,
                  }}
                >
                  <HelpCircle size={20} color={COLORS.textSecondary} />
                </View>
                <View>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: COLORS.text }}>
                    Order Support
                  </Text>
                  <Text style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>
                    Customer support tickets & queries
                  </Text>
                </View>
              </View>
              <ChevronRight size={18} color={COLORS.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleItemPress('Account Activity')}
              style={{
                backgroundColor: COLORS.card,
                padding: 16,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: COLORS.border,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                elevation: 1,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View
                  style={{
                    padding: 10,
                    backgroundColor: COLORS.surface,
                    borderRadius: 10,
                  }}
                >
                  <FileText size={20} color={COLORS.textSecondary} />
                </View>
                <View>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: COLORS.text }}>
                    Account Activity
                  </Text>
                  <Text style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>
                    Review security logs & session history
                  </Text>
                </View>
              </View>
              <ChevronRight size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={{ marginTop: 40, alignItems: 'center' }}>
            <Text style={{ fontSize: 10, color: COLORS.textMuted, fontWeight: '600' }}>
              HavenCart Mobile Build 2.4.1 (Android)
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};
