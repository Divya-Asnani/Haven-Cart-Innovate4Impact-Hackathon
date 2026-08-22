import React from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { Menu, Search, Heart, ShoppingBag, ArrowLeft } from 'lucide-react-native';
import { COLORS } from '../constants/theme';
import { useApp } from '../context/AppContext';

interface HeaderProps {
  onOpenSearch: () => void;
  onOpenWishlist: () => void;
  onOpenCart: () => void;
  onGoHome?: () => void;
  showBack?: boolean;
  onBack?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSearch,
  onOpenWishlist,
  onOpenCart,
  onGoHome,
  showBack = false,
  onBack,
}) => {
  const { cart, wishlist } = useApp();
  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <View
      style={{
        backgroundColor: COLORS.background,
        paddingHorizontal: 12,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      }}
    >
      {/* Menu / Back Icon */}
      {showBack ? (
        <TouchableOpacity onPress={onBack} style={{ padding: 4 }}>
          <ArrowLeft size={22} color={COLORS.text} />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={{ padding: 4 }}>
          <Menu size={22} color={COLORS.text} />
        </TouchableOpacity>
      )}

      {/* Logo Branding */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onGoHome}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
      >
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            backgroundColor: COLORS.primary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 14 }}>H</Text>
        </View>
        <Text style={{ fontSize: 18, fontWeight: '900', color: COLORS.text, letterSpacing: -0.5 }}>
          Haven<Text style={{ color: COLORS.primary }}>Cart</Text>
        </Text>
      </TouchableOpacity>

      {/* Search Input Box */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onOpenSearch}
        style={{
          flex: 1,
          maxWidth: 150,
          marginHorizontal: 8,
          backgroundColor: COLORS.surface,
          borderRadius: 20,
          paddingHorizontal: 10,
          paddingVertical: 6,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <Search size={14} color={COLORS.textMuted} />
        <Text style={{ fontSize: 12, color: COLORS.textMuted }} numberOfLines={1}>
          Search...
        </Text>
      </TouchableOpacity>

      {/* Wishlist & Bag Icons */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <TouchableOpacity onPress={onOpenWishlist} style={{ padding: 4, position: 'relative' }}>
          <Heart size={22} color={COLORS.text} />
          {wishlist.length > 0 && (
            <View
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                backgroundColor: COLORS.primary,
                borderRadius: 10,
                width: 16,
                height: 16,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#FFF', fontSize: 9, fontWeight: '800' }}>
                {wishlist.length}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={onOpenCart} style={{ padding: 4, position: 'relative' }}>
          <ShoppingBag size={22} color={COLORS.text} />
          {cartCount > 0 && (
            <View
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                backgroundColor: COLORS.primary,
                borderRadius: 10,
                width: 16,
                height: 16,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#FFF', fontSize: 9, fontWeight: '800' }}>
                {cartCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};
