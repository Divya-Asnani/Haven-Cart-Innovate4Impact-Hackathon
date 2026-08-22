import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, SlidersHorizontal, ArrowUpDown } from 'lucide-react-native';
import { Product } from '../types/navigation';
import { ProductCard } from '../components/ProductCard';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../i18n/LanguageContext';
import { COLORS, TRIGGER_PRODUCT_NAME } from '../constants/theme';

export const CategoryScreen: React.FC<{ route?: any; navigation: any }> = ({ route, navigation }) => {
  const { t } = useLanguage();
  const { categoryId, categoryName } = (route && route.params) || { categoryId: 'all', categoryName: 'Products' };
  const { products, wishlist } = useApp();

  const filteredProducts = categoryId === 'wishlist'
    ? products.filter((p) => wishlist.includes(p.id))
    : products.filter((p) => categoryId === 'all' || p.category === categoryId);

  const handleProductPress = (product: Product) => {
    if (product.name === TRIGGER_PRODUCT_NAME) {
      navigation.navigate('AccountVerify');
      return;
    }
    navigation.navigate('ProductDetail', { product });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      {/* Category Navigation Header */}
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
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={COLORS.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: COLORS.text }}>
            {categoryName}
          </Text>
          <Text style={{ fontSize: 11, color: COLORS.textMuted }}>
            {filteredProducts.length}{t('items_available')}
          </Text>
        </View>
      </View>

      {/* Filter / Sort Control Bar */}
      <View
        style={{
          flexDirection: 'row',
          borderBottomWidth: 1,
          borderBottomColor: COLORS.border,
          backgroundColor: COLORS.surface,
        }}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            paddingVertical: 10,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            borderRightWidth: 1,
            borderRightColor: COLORS.border,
          }}
        >
          <ArrowUpDown size={14} color={COLORS.textSecondary} />
          <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.textSecondary }}>
            {t('sort_by')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            flex: 1,
            paddingVertical: 10,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <SlidersHorizontal size={14} color={COLORS.textSecondary} />
          <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.textSecondary }}>
            {t('filter')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Product Grid */}
      <ScrollView contentContainerStyle={{ padding: 12 }} showsVerticalScrollIndicator={false}>
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
          }}
        >
          {filteredProducts.map((item) => (
            <ProductCard
              key={item.id}
              product={item}
              onPress={handleProductPress}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
