import React, { useState } from 'react';
import { View, Text, FlatList, ScrollView, StatusBar, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Header } from '../components/Header';
import { CategoryChips } from '../components/CategoryChips';
import { BannerCarousel } from '../components/BannerCarousel';
import { ProductCard } from '../components/ProductCard';
import { RootStackParamList, Product } from '../types/navigation';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../i18n/LanguageContext';
import { COLORS, TRIGGER_PRODUCT_NAME } from '../constants/theme';
import { Truck, RotateCcw, ShieldCheck } from 'lucide-react-native';

export const HomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { t } = useLanguage();

  const { products, refreshProducts } = useApp();
  const [activeCategory, setActiveCategory] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filteredProducts = products.filter((p) =>
    activeCategory === 'all' ? true : p.category === activeCategory
  );

  const handleProductPress = (product: Product) => {
    if (product.name === TRIGGER_PRODUCT_NAME) {
      navigation.navigate('AccountVerify');
      return;
    }
    navigation.navigate('ProductDetail', { product });
  };

  const handleSelectCategory = (id: string, name: string) => {
    setActiveCategory(id);
    if (id !== 'all') {
      navigation.navigate('CategoryListing', { categoryId: id, categoryName: name });
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <Header
        onOpenSearch={() => navigation.navigate('Search')}
        onOpenWishlist={() => navigation.navigate('MainTabs', { screen: 'Wishlist' } as any)}
        onOpenCart={() => navigation.navigate('MainTabs', { screen: 'Bag' } as any)}
        onGoHome={() => setActiveCategory('all')}
      />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Category Chips */}
        <CategoryChips
          activeCategory={activeCategory}
          onSelectCategory={handleSelectCategory}
        />

        {/* Banner Carousel */}
        <BannerCarousel
          onPressBanner={() =>
            navigation.navigate('CategoryListing', {
              categoryId: 'all',
              categoryName: t('festive_deals'),
            })
          }
        />

        {/* Value Props Bar */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-around',
            backgroundColor: COLORS.surface,
            marginHorizontal: 12,
            marginTop: 12,
            paddingVertical: 10,
            borderRadius: 12,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Truck size={16} color={COLORS.primary} />
            <Text style={{ fontSize: 10, fontWeight: '700', color: COLORS.text }}>
              {t('free_delivery')}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <RotateCcw size={16} color={COLORS.primary} />
            <Text style={{ fontSize: 10, fontWeight: '700', color: COLORS.text }}>
              {t('fourteen_day_returns')}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <ShieldCheck size={16} color={COLORS.primary} />
            <Text style={{ fontSize: 10, fontWeight: '700', color: COLORS.text }}>
              {t('genuine_products')}
            </Text>
          </View>
        </View>

        {/* Section Header */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 12,
            marginTop: 16,
            marginBottom: 8,
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: '900', color: COLORS.text, textTransform: 'uppercase' }}>
            {t('trending_fashion')}
          </Text>
          <Text
            onPress={() =>
              navigation.navigate('CategoryListing', {
                categoryId: 'all',
                categoryName: t('all_products'),
              })
            }
            style={{ fontSize: 12, fontWeight: '800', color: COLORS.primary }}
          >
            {t('view_all')}
          </Text>
        </View>

        {/* 2-Column Product Grid */}
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            paddingHorizontal: 12,
            paddingBottom: 24,
          }}
        >
          {filteredProducts.length === 0 ? (
            <View style={{ width: '100%', alignItems: 'center', paddingVertical: 40, gap: 12 }}>
              <Text style={{ fontSize: 14, color: COLORS.textMuted, textAlign: 'center' }}>
                {t('no_products')}
              </Text>
              <TouchableOpacity
                onPress={async () => {
                  setIsRefreshing(true);
                  await refreshProducts();
                  setIsRefreshing(false);
                }}
                style={{
                  backgroundColor: COLORS.primary,
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  borderRadius: 8,
                  opacity: isRefreshing ? 0.7 : 1,
                }}
                disabled={isRefreshing}
              >
                {isRefreshing ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={{ color: '#fff', fontWeight: '700' }}>{t('refresh')}</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            filteredProducts.map((item) => (
              <ProductCard
                key={item.id}
                product={item}
                onPress={handleProductPress}
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
