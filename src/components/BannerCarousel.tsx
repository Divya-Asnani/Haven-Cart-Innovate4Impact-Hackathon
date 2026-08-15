import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, Dimensions } from 'react-native';
import { COLORS } from '../constants/theme';

const { width } = Dimensions.get('window');

const BANNERS = [
  {
    id: '1',
    title: 'END OF SEASON SALE',
    subtitle: 'FLAT 50% - 80% OFF',
    tag: 'GRAND FESTIVAL OFFER',
    bgColor: '#E0335C',
    image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: '2',
    title: 'AUTUMN COLLECTION',
    subtitle: 'UNDER ₹999 DEALS',
    tag: 'TRENDING STYLES',
    bgColor: '#8B5CF6',
    image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: '3',
    title: 'ETHNIC ELEGANCE',
    subtitle: 'MIN. 60% OFF ON KURTAS',
    tag: 'EXCLUSIVE BRANDS',
    bgColor: '#D97706',
    image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=600&q=80',
  },
];

export const BannerCarousel: React.FC<{ onPressBanner: () => void }> = ({ onPressBanner }) => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % BANNERS.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const banner = BANNERS[index];

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPressBanner}
      style={{
        marginHorizontal: 12,
        marginTop: 8,
        borderRadius: 16,
        overflow: 'hidden',
        height: 160,
        backgroundColor: banner.bgColor,
        position: 'relative',
        padding: 16,
        justifyContent: 'space-between',
      }}
    >
      <Image
        source={{ uri: banner.image }}
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: '50%',
          opacity: 0.35,
          resizeMode: 'cover',
        }}
      />

      <View
        style={{
          alignSelf: 'flex-start',
          backgroundColor: 'rgba(255, 255, 255, 0.25)',
          paddingHorizontal: 10,
          paddingVertical: 3,
          borderRadius: 12,
        }}
      >
        <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 }}>
          {banner.tag}
        </Text>
      </View>

      <View>
        <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: -0.5 }}>
          {banner.title}
        </Text>
        <Text style={{ color: '#FEF08A', fontSize: 12, fontWeight: '800', marginTop: 2 }}>
          {banner.subtitle}
        </Text>
      </View>

      <View
        style={{
          alignSelf: 'flex-start',
          backgroundColor: '#FFF',
          paddingHorizontal: 14,
          paddingVertical: 6,
          borderRadius: 20,
          elevation: 2,
        }}
      >
        <Text style={{ color: COLORS.text, fontSize: 11, fontWeight: '800' }}>
          SHOP NOW
        </Text>
      </View>

      {/* Dots */}
      <View
        style={{
          position: 'absolute',
          bottom: 8,
          right: 12,
          flexDirection: 'row',
          gap: 4,
        }}
      >
        {BANNERS.map((_, idx) => (
          <View
            key={idx}
            style={{
              width: index === idx ? 14 : 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: index === idx ? '#FFF' : 'rgba(255,255,255,0.4)',
            }}
          />
        ))}
      </View>
    </TouchableOpacity>
  );
};
