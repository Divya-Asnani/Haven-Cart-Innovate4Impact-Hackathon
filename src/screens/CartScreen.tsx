import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Modal,
} from 'react-native';
import { ShoppingBag, Trash2, Plus, Minus, Tag, CheckCircle2 } from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import { COLORS } from '../constants/theme';

const FALLBACK_IMAGE = 'https://via.placeholder.com/400x500.png?text=No+Image';

export const CartScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { cart, updateQuantity, removeFromCart, clearCart } = useApp();
  const [orderSuccessModal, setOrderSuccessModal] = useState(false);

  const totalMRP = cart.reduce((acc, item) => acc + item.mrp * item.quantity, 0);
  const totalDiscount = cart.reduce(
    (acc, item) => acc + (item.mrp - item.price) * item.quantity,
    0
  );
  const finalAmount = totalMRP - totalDiscount;

  const handleCheckout = () => {
    setOrderSuccessModal(true);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.surface }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: COLORS.background,
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: COLORS.border,
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: '900', color: COLORS.text }}>
          SHOPPING BAG ({cart.length})
        </Text>
      </View>

      {cart.length > 0 ? (
        <ScrollView contentContainerStyle={{ padding: 12 }}>
          {/* Cart Items List */}
          <View style={{ gap: 12, marginBottom: 16 }}>
            {cart.map((item, idx) => (
              <View
                key={idx}
                style={{
                  backgroundColor: COLORS.card,
                  borderRadius: 12,
                  padding: 12,
                  flexDirection: 'row',
                  gap: 12,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                }}
              >
                <Image
                  source={{ uri: item.image || FALLBACK_IMAGE }}
                  style={{ width: 80, height: 100, borderRadius: 8, backgroundColor: COLORS.surface }}
                />

                <View style={{ flex: 1, justifyContent: 'space-between' }}>

                  <View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: COLORS.text, textTransform: 'uppercase' }}>
                        {item.brand}
                      </Text>
                      <TouchableOpacity onPress={() => removeFromCart(item.cartItemId || idx.toString())}>
                        <Trash2 size={16} color={COLORS.textMuted} />
                      </TouchableOpacity>
                    </View>
                    <Text numberOfLines={1} style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 2 }}>
                      {item.name}
                    </Text>
                    <Text style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 4 }}>
                      Size: <Text style={{ fontWeight: '700', color: COLORS.text }}>{item.selectedSize}</Text>
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: COLORS.text }}>
                        ₹{item.price * item.quantity}
                      </Text>
                      <Text style={{ fontSize: 10, color: COLORS.textMuted, textDecorationLine: 'line-through' }}>
                        ₹{item.mrp * item.quantity}
                      </Text>
                    </View>

                    {/* Quantity Controls */}
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        borderWidth: 1,
                        borderColor: COLORS.border,
                        borderRadius: 6,
                        backgroundColor: COLORS.surface,
                      }}
                    >
                      <TouchableOpacity onPress={() => updateQuantity(idx, -1)} style={{ padding: 4 }}>
                        <Minus size={14} color={COLORS.textSecondary} />
                      </TouchableOpacity>
                      <Text style={{ fontSize: 12, fontWeight: '800', paddingHorizontal: 8, color: COLORS.text }}>
                        {item.quantity}
                      </Text>
                      <TouchableOpacity onPress={() => updateQuantity(idx, 1)} style={{ padding: 4 }}>
                        <Plus size={14} color={COLORS.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>

          {/* Coupon Promo Box */}
          <View
            style={{
              backgroundColor: COLORS.card,
              padding: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: COLORS.border,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Tag size={18} color={COLORS.primary} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.text }}>
                Apply Promo Coupon
              </Text>
            </View>
            <Text style={{ fontSize: 12, fontWeight: '800', color: COLORS.primary }}>
              APPLY
            </Text>
          </View>

          {/* Price Breakdown Summary */}
          <View
            style={{
              backgroundColor: COLORS.card,
              padding: 14,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: COLORS.border,
              gap: 8,
              marginBottom: 20,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: '800',
                color: COLORS.textMuted,
                textTransform: 'uppercase',
                borderBottomWidth: 1,
                borderBottomColor: COLORS.border,
                paddingBottom: 8,
              }}
            >
              Price Details ({cart.length} Items)
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>Total MRP</Text>
              <Text style={{ fontSize: 12, color: COLORS.text }}>₹{totalMRP}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 12, color: COLORS.success }}>Discount on MRP</Text>
              <Text style={{ fontSize: 12, color: COLORS.success }}>-₹{totalDiscount}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>Convenience Fee</Text>
              <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.success }}>FREE</Text>
            </View>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                borderTopWidth: 1,
                borderTopColor: COLORS.border,
                paddingTop: 8,
                marginTop: 4,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '900', color: COLORS.text }}>Total Amount</Text>
              <Text style={{ fontSize: 14, fontWeight: '900', color: COLORS.text }}>₹{finalAmount}</Text>
            </View>
          </View>
        </ScrollView>
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <ShoppingBag size={64} color={COLORS.textMuted} />
          <Text style={{ fontSize: 16, fontWeight: '800', color: COLORS.text, marginTop: 12 }}>
            Your Shopping Bag is Empty
          </Text>
          <Text style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 4, textAlign: 'center' }}>
            Explore our fashion collections and add items to your bag.
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Home')}
            style={{
              marginTop: 20,
              backgroundColor: COLORS.primary,
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 24,
            }}
          >
            <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 12 }}>
              START SHOPPING
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Sticky Bottom Bar */}
      {cart.length > 0 && (
        <View
          style={{
            backgroundColor: COLORS.background,
            padding: 12,
            borderTopWidth: 1,
            borderTopColor: COLORS.border,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <View>
            <Text style={{ fontSize: 10, color: COLORS.textMuted }}>Total Payable</Text>
            <Text style={{ fontSize: 16, fontWeight: '900', color: COLORS.text }}>
              ₹{finalAmount}
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleCheckout}
            style={{
              backgroundColor: COLORS.primary,
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 12,
            }}
          >
            <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 12 }}>
              PLACE ORDER
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Order Confirmation Modal */}
      <Modal visible={orderSuccessModal} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: COLORS.overlay,
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <View
            style={{
              backgroundColor: COLORS.card,
              borderRadius: 20,
              padding: 24,
              alignItems: 'center',
              width: '100%',
              maxWidth: 320,
            }}
          >
            <CheckCircle2 size={48} color={COLORS.success} />
            <Text style={{ fontSize: 18, fontWeight: '900', color: COLORS.text, marginTop: 12 }}>
              Order Placed!
            </Text>
            <Text style={{ fontSize: 12, color: COLORS.textMuted, textAlign: 'center', marginTop: 6 }}>
              Thank you for shopping with HavenCart. Your order confirmation has been logged.
            </Text>
            <TouchableOpacity
              onPress={() => {
                clearCart();
                setOrderSuccessModal(false);
                navigation.navigate('Home');
              }}
              style={{
                marginTop: 20,
                backgroundColor: COLORS.primary,
                width: '100%',
                paddingVertical: 12,
                borderRadius: 12,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 12 }}>
                CONTINUE SHOPPING
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};
