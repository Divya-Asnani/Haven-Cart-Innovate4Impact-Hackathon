import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ToastAndroid,
  Platform,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ArrowLeft, Heart, ShoppingBag, Star } from 'lucide-react-native';

import { RootStackParamList } from '../types/navigation';
import { useApp } from '../context/AppContext';
import { COLORS } from '../constants/theme';

const FALLBACK_IMAGE = 'https://via.placeholder.com/400x500.png?text=No+Image';

type Props = NativeStackScreenProps<RootStackParamList, 'ProductDetail'>;

export const ProductDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { product } = route.params;
  const { wishlist, toggleWishlist, addToCart } = useApp();
  const [selectedSize, setSelectedSize] = useState<string>(
    product.sizes ? product.sizes[0] : 'M'
  );

  const isWishlisted = wishlist.includes(product.id);

  const handleAddToCart = async () => {
    try {
      await addToCart(product, selectedSize);
      if (Platform.OS === 'android') {
        ToastAndroid.show('Item added to Bag!', ToastAndroid.SHORT);
      } else {
        Alert.alert('Success', 'Item added to Bag!');
      }
    } catch (err: any) {
      const message = err?.message || 'Could not add item to bag. Please try again.';
      if (Platform.OS === 'android') {
        ToastAndroid.show(message, ToastAndroid.LONG);
      } else {
        Alert.alert('Error', message);
      }
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 12,
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderBottomColor: COLORS.border,
        }}
      >
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 14, fontWeight: '800', color: COLORS.text, textTransform: 'uppercase' }}>
          {product.brand}
        </Text>
        <TouchableOpacity onPress={() => toggleWishlist(product.id)}>
          <Heart
            size={22}
            color={isWishlisted ? COLORS.primary : COLORS.text}
            fill={isWishlisted ? COLORS.primary : 'none'}
          />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Product Image */}
        <View style={{ height: 350, backgroundColor: COLORS.surface }}>
          <Image
            source={{ uri: product.image || FALLBACK_IMAGE }}
            style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
            defaultSource={{ uri: FALLBACK_IMAGE }}
          />
        </View>

        {/* Info Card */}
        <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 16, fontWeight: '900', color: COLORS.text, textTransform: 'uppercase' }}>
              {product.brand}
            </Text>
            <View
              style={{
                backgroundColor: '#ECFDF5',
                borderColor: '#A7F3D0',
                borderWidth: 1,
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 4,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#047857' }}>
                {product.rating}
              </Text>
              <Star size={12} color="#047857" fill="#047857" />
            </View>
          </View>

          <Text style={{ fontSize: 13, color: COLORS.textSecondary, marginTop: 4 }}>
            {product.name}
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 12, gap: 8 }}>
            <Text style={{ fontSize: 20, fontWeight: '900', color: COLORS.text }}>
              ₹{product.price}
            </Text>
            <Text style={{ fontSize: 14, color: COLORS.textMuted, textDecorationLine: 'line-through' }}>
              MRP ₹{product.mrp}
            </Text>
            <Text style={{ fontSize: 14, fontWeight: '800', color: COLORS.primary }}>
              ({product.discount})
            </Text>
          </View>
          <Text style={{ fontSize: 10, color: COLORS.success, fontWeight: '700', marginTop: 2 }}>
            inclusive of all taxes
          </Text>
        </View>

        {/* Size Selection */}
        {product.sizes && product.sizes.length > 0 && (
          <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '800',
                color: COLORS.text,
                textTransform: 'uppercase',
                marginBottom: 10,
              }}
            >
              Select Size
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
              {product.sizes.map((sz) => {
                const isSelected = selectedSize === sz;
                return (
                  <TouchableOpacity
                    key={sz}
                    onPress={() => setSelectedSize(sz)}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      borderWidth: 1.5,
                      borderColor: isSelected ? COLORS.primary : COLORS.border,
                      backgroundColor: isSelected ? COLORS.primaryLight : COLORS.background,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '700',
                        color: isSelected ? COLORS.primary : COLORS.text,
                      }}
                    >
                      {sz}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Specifications & Description */}
        <View style={{ padding: 16 }}>
          <Text
            style={{
              fontSize: 12,
              fontWeight: '800',
              color: COLORS.text,
              textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            Product Details & Description
          </Text>
          <Text style={{ fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 }}>

            {product.description}
          </Text>

          <View style={{ flexDirection: 'row', marginTop: 14, gap: 10 }}>
            {product.fabric && (
              <View
                style={{
                  flex: 1,
                  backgroundColor: COLORS.surface,
                  padding: 10,
                  borderRadius: 8,
                }}
              >
                <Text style={{ fontSize: 10, color: COLORS.textMuted }}>Fabric</Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.text, marginTop: 2 }}>
                  {product.fabric}
                </Text>
              </View>
            )}
            {product.care && (
              <View
                style={{
                  flex: 1,
                  backgroundColor: COLORS.surface,
                  padding: 10,
                  borderRadius: 8,
                }}
              >
                <Text style={{ fontSize: 10, color: COLORS.textMuted }}>Care Instructions</Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.text, marginTop: 2 }}>
                  {product.care}
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Bottom Sticky Action Bar */}
      <View
        style={{
          padding: 12,
          backgroundColor: COLORS.background,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
          flexDirection: 'row',
          gap: 12,
        }}
      >
        <TouchableOpacity
          onPress={() => toggleWishlist(product.id)}
          style={{
            flex: 1,
            paddingVertical: 14,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: COLORS.border,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <Heart
            size={18}
            color={isWishlisted ? COLORS.primary : COLORS.text}
            fill={isWishlisted ? COLORS.primary : 'none'}
          />
          <Text style={{ fontSize: 12, fontWeight: '800', color: COLORS.text }}>
            WISHLIST
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleAddToCart}
          style={{
            flex: 1,
            paddingVertical: 14,
            borderRadius: 12,
            backgroundColor: COLORS.primary,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            elevation: 2,
          }}
        >
          <ShoppingBag size={18} color="#FFF" />
          <Text style={{ fontSize: 12, fontWeight: '800', color: '#FFF' }}>
            ADD TO BAG
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};
