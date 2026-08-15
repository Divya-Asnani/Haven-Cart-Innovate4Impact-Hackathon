import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { MapPin, CreditCard, HelpCircle, ChevronRight, Package } from 'lucide-react-native';

import { COLORS } from '../constants/theme';

const ORDERS_HISTORY = [
  {
    id: 'HC-948271',
    date: '12 Aug 2026',
    status: 'Delivered',
    amount: 1798,
    items: 'ANOUK Cotton Printed Kurta, HOME CENTRE Bedsheet',
  },
  {
    id: 'HC-827103',
    date: '28 Jul 2026',
    status: 'Delivered',
    amount: 1599,
    items: 'HRX Rapid-Dry Running Shoes',
  },
];

export const ProfileScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.surface }}>
      <ScrollView contentContainerStyle={{ padding: 12 }} showsVerticalScrollIndicator={false}>
        {/* User Card */}
        <View
          style={{
            backgroundColor: '#1E293B',
            borderRadius: 16,
            padding: 16,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            marginBottom: 12,
          }}
        >
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: COLORS.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 18 }}>A</Text>
          </View>
          <View>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#FFF' }}>Ananya Sharma</Text>
            <Text style={{ fontSize: 12, color: '#F472B6', fontWeight: '700' }}>
              HavenCart Insider Member
            </Text>
            <Text style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>
              ananya.sharma@example.com
            </Text>
          </View>
        </View>

        {/* Order History */}
        <View
          style={{
            backgroundColor: COLORS.card,
            borderRadius: 16,
            padding: 14,
            borderWidth: 1,
            borderColor: COLORS.border,
            marginBottom: 12,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <Package size={16} color={COLORS.primary} />
            <Text style={{ fontSize: 12, fontWeight: '800', color: COLORS.text, textTransform: 'uppercase' }}>
              Recent Order History
            </Text>
          </View>

          <View style={{ gap: 10 }}>
            {ORDERS_HISTORY.map((ord) => (
              <View
                key={ord.id}
                style={{
                  borderBottomWidth: 1,
                  borderBottomColor: COLORS.border,
                  paddingBottom: 8,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: COLORS.text }}>{ord.id}</Text>
                  <View style={{ backgroundColor: '#ECFDF5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: COLORS.success }}>{ord.status}</Text>
                  </View>
                </View>
                <Text numberOfLines={1} style={{ fontSize: 11, color: COLORS.textSecondary, marginTop: 4 }}>
                  {ord.items}
                </Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                  <Text style={{ fontSize: 10, color: COLORS.textMuted }}>{ord.date}</Text>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: COLORS.text }}>₹{ord.amount}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Account Menu Items */}
        <View
          style={{
            backgroundColor: COLORS.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: COLORS.border,
            overflow: 'hidden',
          }}
        >
          <TouchableOpacity
            onPress={() => navigation.navigate('AccountPlaceholder', { title: 'Saved Addresses' })}
            style={{
              padding: 14,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottomWidth: 1,
              borderBottomColor: COLORS.border,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <MapPin size={18} color={COLORS.textSecondary} />
              <Text style={{ fontSize: 13, color: COLORS.text, fontWeight: '600' }}>
                Saved Addresses
              </Text>
            </View>
            <ChevronRight size={18} color={COLORS.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('AccountPlaceholder', { title: 'Saved Payment Cards' })}
            style={{
              padding: 14,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottomWidth: 1,
              borderBottomColor: COLORS.border,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <CreditCard size={18} color={COLORS.textSecondary} />
              <Text style={{ fontSize: 13, color: COLORS.text, fontWeight: '600' }}>
                Saved Payment Methods
              </Text>
            </View>
            <ChevronRight size={18} color={COLORS.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('AccountPlaceholder', { title: 'Help & Support' })}
            style={{
              padding: 14,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <HelpCircle size={18} color={COLORS.textSecondary} />
              <Text style={{ fontSize: 13, color: COLORS.text, fontWeight: '600' }}>
                Customer Help & Support
              </Text>
            </View>
            <ChevronRight size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
