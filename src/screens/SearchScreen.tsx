import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search as SearchIcon, ArrowLeft, X, Clock, TrendingUp } from 'lucide-react-native';
import { Product } from '../types/navigation';
import { ProductCard } from '../components/ProductCard';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../i18n/LanguageContext';
import { COLORS } from '../constants/theme';

const TRENDING_SEARCHES = [
  'Cotton Kurta',
  'Denim Shirt',
  'Running Shoes',
  'Floral Dress',
  'Silk Saree',
  'Winter Jacket',
];

export const SearchScreen: React.FC<{ route?: any; navigation: any }> = ({ navigation }) => {
  const { products, recentSearches, addRecentSearch, checkCovertTrigger } = useApp();
  const { t } = useLanguage();
  const [query, setQuery] = useState('');

  const handleProductPress = (product: Product) => {
    addRecentSearch(product.name);
    navigation.navigate('ProductDetail', { product });
  };

  const handleSearchSubmit = async (searchTerm: string) => {
    const trimmed = searchTerm.trim();
    if (!trimmed) return;

    // Covert PIN check — indistinguishable from a normal search on failure
    const triggered = await checkCovertTrigger(trimmed);
    if (triggered) {
      setQuery('');
      navigation.reset({
        index: 1,
        routes: [
          { name: 'MainTabs' },
          { name: 'SessionHome' },
        ],
      });
      return;
    }

    // Normal product search
    addRecentSearch(trimmed);
    setQuery(trimmed);
  };

  const searchResults = products.filter((p) => {
    const q = query.toLowerCase().trim();
    if (!q) return false;
    return (
      p.name.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      {/* Top Search Input Bar */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 12,
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderBottomColor: COLORS.border,
          gap: 10,
        }}
      >
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={COLORS.text} />
        </TouchableOpacity>

        <View
          style={{
            flex: 1,
            backgroundColor: COLORS.surface,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 8,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <SearchIcon size={16} color={COLORS.textMuted} />
          <TextInput
            autoFocus
            placeholder={t('search_placeholder')}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => handleSearchSubmit(query)}
            placeholderTextColor={COLORS.textMuted}
            style={{ flex: 1, fontSize: 13, color: COLORS.text, padding: 0 }}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <X size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 12 }}>
        {query.trim().length === 0 ? (
          <>
            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <View style={{ marginBottom: 20 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 10,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '800',
                      color: COLORS.textMuted,
                      textTransform: 'uppercase',
                    }}
                  >
                    {t('recent_searches')}
                  </Text>
                  <Clock size={14} color={COLORS.textMuted} />
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {recentSearches.map((item, idx) => (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => handleSearchSubmit(item)}
                      style={{
                        backgroundColor: COLORS.surface,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 16,
                      }}
                    >
                      <Text style={{ fontSize: 12, color: COLORS.text }}>{item}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Trending Keywords */}
            <View>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  marginBottom: 10,
                }}
              >
                <TrendingUp size={14} color={COLORS.primary} />
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '800',
                    color: COLORS.textMuted,
                    textTransform: 'uppercase',
                  }}
                >
                  {t('trending_searches')}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {TRENDING_SEARCHES.map((item, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => handleSearchSubmit(item)}
                    style={{
                      backgroundColor: COLORS.primaryLight,
                      paddingHorizontal: 14,
                      paddingVertical: 7,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: '#FFD1DC',
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.primary }}>
                      {item}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        ) : (
          /* Search Results Grid */
          <View>
            <Text
              style={{
                fontSize: 12,
                color: COLORS.textSecondary,
                marginBottom: 12,
              }}
            >
              {t('found')}{searchResults.length}{t('matching_products_for')}"{query}"
            </Text>

            {searchResults.length > 0 ? (
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                }}
              >
                {searchResults.map((item) => (
                  <ProductCard
                    key={item.id}
                    product={item}
                    onPress={handleProductPress}
                  />
                ))}
              </View>
            ) : (
              <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 40 }}>
                <SearchIcon size={40} color={COLORS.textMuted} />
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '700',
                    color: COLORS.text,
                    marginTop: 12,
                  }}
                >
                  {t('no_results')}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: COLORS.textMuted,
                    textAlign: 'center',
                    marginTop: 4,
                  }}
                >
                  {t('search_help_text')}
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};
