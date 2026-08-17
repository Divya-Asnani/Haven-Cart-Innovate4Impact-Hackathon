import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TouchableWithoutFeedback,
  BackHandler,
  Linking,
  Platform,
} from 'react-native';
import {
  Phone,
  MessageCircle,
  MapPin,
  Shield,
  AlertTriangle,
  ArrowLeft,
  Users,
} from 'lucide-react-native';
import { COLORS } from '../constants/theme';
import { useApp } from '../context/AppContext';

const TRUSTED_CONTACTS = [
  { name: 'National DV Hotline', phone: '1-800-799-7233', type: 'hotline' },
  { name: 'Crisis Text Line', phone: 'Text HOME to 741741', type: 'text' },
  { name: 'Emergency Services', phone: '112', type: 'emergency' },
];

export const SessionHomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { registerInactivityReset, triggerTouchActivity } = useApp();

  // Register inactivity timer — silently returns to decoy Home on timeout
  useEffect(() => {
    const cleanup = registerInactivityReset(() => {
      navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
    });
    return cleanup;
  }, []);

  // Override Android hardware back button — go to decoy Home, not back in stack
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
      return true; // prevent default back behavior
    });
    return () => backHandler.remove();
  }, []);

  const handleBackToSafety = () => {
    triggerTouchActivity();
    navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
  };

  const handleCall = (phoneNumber: string) => {
    triggerTouchActivity();
    const url = Platform.OS === 'android' ? `tel:${phoneNumber}` : `telprompt:${phoneNumber}`;
    Linking.openURL(url).catch(() => {});
  };

  return (
    <TouchableWithoutFeedback onPress={triggerTouchActivity}>
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
        {/* Header */}
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
          <TouchableOpacity onPress={handleBackToSafety}>
            <ArrowLeft size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={{ fontSize: 16, fontWeight: '800', color: COLORS.text }}>
            Safety Dashboard
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
            <Shield size={14} color={COLORS.primary} />
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {/* Welcome */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 20, fontWeight: '900', color: COLORS.text }}>
              You are safe here
            </Text>
            <Text style={{ fontSize: 13, color: COLORS.textSecondary, marginTop: 4, lineHeight: 20 }}>
              This dashboard is hidden from your browsing history. Press the back arrow or wait 90 seconds to silently return to the shopping app.
            </Text>
          </View>

          {/* Emergency Call Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => handleCall('112')}
            style={{
              backgroundColor: '#DC2626',
              padding: 18,
              borderRadius: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              marginBottom: 16,
              elevation: 3,
              shadowColor: '#DC2626',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 6,
            }}
          >
            <AlertTriangle size={22} color="#FFF" />
            <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '900' }}>
              CALL EMERGENCY (112)
            </Text>
          </TouchableOpacity>

          {/* Trusted Contacts */}
          <View style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Users size={16} color={COLORS.primary} />
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '800',
                  color: COLORS.text,
                  textTransform: 'uppercase',
                }}
              >
                Trusted Helplines
              </Text>
            </View>

            <View style={{ gap: 10 }}>
              {TRUSTED_CONTACTS.map((contact, idx) => (
                <TouchableOpacity
                  key={idx}
                  activeOpacity={0.8}
                  onPress={() => {
                    triggerTouchActivity();
                    if (contact.type === 'text') {
                      Linking.openURL('sms:741741?body=HOME').catch(() => {});
                    } else {
                      handleCall(contact.phone);
                    }
                  }}
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
                      {contact.type === 'text' ? (
                        <MessageCircle size={20} color={COLORS.textSecondary} />
                      ) : (
                        <Phone size={20} color={COLORS.textSecondary} />
                      )}
                    </View>
                    <View>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: COLORS.text }}>
                        {contact.name}
                      </Text>
                      <Text style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>
                        {contact.phone}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Location Sharing Section */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              triggerTouchActivity();
              navigation.navigate('AccountPlaceholder', { title: 'Location Sharing' });
            }}
            style={{
              backgroundColor: COLORS.card,
              padding: 16,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: COLORS.border,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              marginBottom: 16,
              elevation: 1,
            }}
          >
            <View
              style={{
                padding: 10,
                backgroundColor: '#FEF3C7',
                borderRadius: 10,
              }}
            >
              <MapPin size={20} color="#D97706" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: COLORS.text }}>
                Share My Location
              </Text>
              <Text style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>
                Send your current location to a trusted contact
              </Text>
            </View>
          </TouchableOpacity>

          {/* Quick Exit Note */}
          <View
            style={{
              backgroundColor: COLORS.surface,
              padding: 14,
              borderRadius: 12,
              marginTop: 8,
            }}
          >
            <Text style={{ fontSize: 11, color: COLORS.textMuted, lineHeight: 18, textAlign: 'center' }}>
              💡 Tap the back arrow at any time to instantly return to the shopping app.
              This screen auto-closes after 90 seconds of inactivity.
            </Text>
          </View>

          <View style={{ marginTop: 40, alignItems: 'center' }}>
            <Text style={{ fontSize: 10, color: COLORS.textMuted, fontWeight: '600' }}>
              HavenCart Safety Module v1.0
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};
