import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { Heart, Star } from 'lucide-react-native';
import { Product } from '../types/navigation';
import { COLORS } from '../constants/theme';
import { useApp } from '../context/AppContext';

interface ProductCardProps {
  product: Product;
  onPress: (product: Product) => void;
  style?: StyleProp<ViewStyle>;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onPress, style }) => {
  const { wishlist, toggleWishlist } = useApp();
  const isWishlisted = wishlist.includes(product.id);

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={() => onPress(product)}
      style={[{
        backgroundColor: COLORS.card,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: 12,
        width: '48.5%',
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      }, style]}
    >
      {/* Product Image Box */}
      <View style={{ height: 180, width: '100%', backgroundColor: COLORS.surface, position: 'relative' }}>

        <Image
          source={{ uri: product.image }}
          style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
        />

        {/* Wishlist Heart Icon */}
        <TouchableOpacity
          onPress={() => toggleWishlist(product.id)}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            backgroundColor: 'rgba(255, 255, 255, 0.85)',
            borderRadius: 20,
            padding: 6,
          }}
        >
          <Heart
            size={16}
            color={isWishlisted ? COLORS.primary : '#666'}
            fill={isWishlisted ? COLORS.primary : 'none'}
          />
        </TouchableOpacity>

        {/* Rating Badge */}
        <View
          style={{
            position: 'absolute',
            bottom: 8,
            left: 8,
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            borderRadius: 4,
            paddingHorizontal: 6,
            paddingVertical: 2,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Text style={{ fontSize: 10, fontWeight: '700', color: COLORS.text }}>
            {product.rating}
          </Text>
          <Star size={10} color={COLORS.star} fill={COLORS.star} />
          <Text style={{ fontSize: 9, color: COLORS.textMuted }}>
            | {product.reviews}
          </Text>
        </View>
      </View>

      {/* Product Information */}
      <View style={{ padding: 10 }}>
        <Text
          style={{
            fontSize: 11,
            fontWeight: '800',
            color: COLORS.text,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}
        >
          {product.brand}
        </Text>
        <Text
          numberOfLines={1}
          style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 2 }}
        >
          {product.name}
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 6, gap: 4, flexWrap: 'wrap' }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.text }}>
            ₹{product.price}
          </Text>
          <Text
            style={{
              fontSize: 10,
              color: COLORS.textMuted,
              textDecorationLine: 'line-through',
            }}
          >
            ₹{product.mrp}
          </Text>
          <Text style={{ fontSize: 10, fontWeight: '700', color: COLORS.primary }}>
            ({product.discount})
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};
