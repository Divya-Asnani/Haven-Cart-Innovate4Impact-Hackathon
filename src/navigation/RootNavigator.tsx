import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, Grid, Heart, ShoppingBag, User } from 'lucide-react-native';

import { RootStackParamList, MainTabParamList } from '../types/navigation';
import { COLORS } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../i18n/LanguageContext';

// Screens
import { HomeScreen } from '../screens/HomeScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { CategoryScreen } from '../screens/CategoryScreen';
import { ProductDetailScreen } from '../screens/ProductDetailScreen';
import { CartScreen } from '../screens/CartScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { AccountActivityScreen } from '../screens/AccountActivityScreen';
import { AccountPlaceholderScreen } from '../screens/AccountPlaceholderScreen';
import { SignupScreen } from '../screens/SignupScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { LocationSettingsScreen } from '../screens/LocationSettingsScreen';
import { AccountVerifyScreen } from '../screens/AccountVerifyScreen';
import { SessionHomeScreen } from '../screens/SessionHomeScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabNavigator() {
  const { cart, wishlist } = useApp();
  const { t } = useLanguage();
  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: {
          backgroundColor: COLORS.background,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: t('home'),
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="CategoriesTab"
        component={CategoryScreen}
        initialParams={{ categoryId: 'all', categoryName: 'Categories' }}
        options={{
          tabBarLabel: t('categories'),
          tabBarIcon: ({ color, size }) => <Grid size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Wishlist"
        component={CategoryScreen}
        initialParams={{ categoryId: 'wishlist', categoryName: 'My Wishlist' }}
        options={{
          tabBarLabel: t('wishlist'),
          tabBarBadge: wishlist.length > 0 ? wishlist.length : undefined,
          tabBarBadgeStyle: { backgroundColor: COLORS.primary, fontSize: 10 },
          tabBarIcon: ({ color, size }) => <Heart size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Bag"
        component={CartScreen}
        options={{
          tabBarLabel: t('bag'),
          tabBarBadge: cartCount > 0 ? cartCount : undefined,
          tabBarBadgeStyle: { backgroundColor: COLORS.primary, fontSize: 10 },
          tabBarIcon: ({ color, size }) => <ShoppingBag size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: t('profile'),
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="MainTabs" component={MainTabNavigator} />
      <Stack.Screen name="Search" component={SearchScreen} />
      <Stack.Screen name="CategoryListing" component={CategoryScreen} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="LocationSettings" component={LocationSettingsScreen} />
      <Stack.Screen name="AccountActivity" component={AccountActivityScreen} />
      <Stack.Screen name="AccountPlaceholder" component={AccountPlaceholderScreen} />
      <Stack.Screen name="AccountVerify" component={AccountVerifyScreen} />
      <Stack.Screen name="SessionHome" component={SessionHomeScreen} />
    </Stack.Navigator>
  );
}
