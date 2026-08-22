import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { CATEGORIES_DATA } from '../data/products';
import { COLORS } from '../constants/theme';

interface CategoryChipsProps {
  activeCategory: string;
  onSelectCategory: (id: string, name: string) => void;
}

export const CategoryChips: React.FC<CategoryChipsProps> = ({
  activeCategory,
  onSelectCategory,
}) => {
  return (
    <View style={{ backgroundColor: COLORS.background, paddingVertical: 10 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12 }}
      >
        {CATEGORIES_DATA.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              activeOpacity={0.8}
              onPress={() => onSelectCategory(cat.id, cat.name)}
              style={{
                backgroundColor: isActive ? COLORS.primary : COLORS.surface,
                paddingHorizontal: 14,
                paddingVertical: 7,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: isActive ? COLORS.primary : COLORS.border,
                marginRight: 8,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: isActive ? '700' : '500',
                  color: isActive ? '#FFF' : COLORS.text,
                }}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};
