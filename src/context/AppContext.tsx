import React, { createContext, useContext, useState, useRef, ReactNode, useEffect } from 'react';
import { Product, CartItem } from '../types/navigation';
import { INACTIVITY_TIMEOUT_MS } from '../constants/theme';
import { api, getAccessToken, clearTokens, isAuthError } from '../api';
import { AppState } from 'react-native';
import type { AppStateStatus } from 'react-native';
import { syncOfflineAssessments } from '../storage/assessmentQueue';

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
}

export interface CurrentRiskAssessment {
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  mlConfidence: number;
  decisionSource: "ML" | "RULE_OVERRIDE";
  overrideReason: string | null;
  modelVersion: string;
  assessedAt: string;
}

interface AppContextType {
  products: Product[];
  cart: CartItem[];
  wishlist: string[];
  recentSearches: string[];
  isLoading: boolean;
  initError: string | null;
  isLoggedIn: boolean;
  userProfile: UserProfile | null;
  addToCart: (product: Product, size: string) => Promise<void>;
  removeFromCart: (itemId: string) => Promise<void>;
  updateQuantity: (index: number, delta: number) => Promise<void>;
  toggleWishlist: (productId: string) => Promise<void>;
  addRecentSearch: (query: string) => void;
  clearCart: () => void;
  registerInactivityReset: (onTimeout: () => void) => () => void;
  triggerTouchActivity: () => void;
  refreshProducts: (category?: string, search?: string) => Promise<Product[]>;
  fetchCartAndWishlist: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
  checkCovertTrigger: (query: string) => Promise<boolean>;
  logout: () => Promise<void>;
  retryInit: () => void;
  currentRiskAssessment: CurrentRiskAssessment | null;
  setCurrentRiskAssessment: (assessment: CurrentRiskAssessment | null) => void;
  clearSafetyState: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([
    'Cotton Kurta',
    'Denim Shirt',
    'Running Shoes',
    'Floral Dress'
  ]);
  const [isLoading, setIsLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [initAttempt, setInitAttempt] = useState(0);
  const [currentRiskAssessment, setCurrentRiskAssessment] = useState<CurrentRiskAssessment | null>(null);

  const clearSafetyState = () => {
    setCurrentRiskAssessment(null);
  };

  // Initialize App — retry on failure (Render free tier may need a cold-start)
  useEffect(() => {
    let cancelled = false;
    const MAX_RETRIES = 2;
    const RETRY_DELAY_MS = 3_000;

    const initApp = async (attempt = 0) => {
      setIsLoading(true);
      setInitError(null);

      try {
        const backendUp = await api.pingBackend();
        if (!backendUp) {
          throw new Error(
            'The backend server is not responding. It may be starting up — please wait and try again.',
          );
        }

        await checkAuthStatus();
        const data = await refreshProducts();
        if (data.length === 0 && attempt < MAX_RETRIES && !cancelled) {
          console.log(`[HavenCart] No products received (attempt ${attempt + 1}), retrying...`);
          await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
          return initApp(attempt + 1);
        }
      } catch (error: any) {
        console.error(`[HavenCart] Init failed (attempt ${attempt + 1})`, error);
        if (attempt < MAX_RETRIES && !cancelled) {
          await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
          return initApp(attempt + 1);
        }
        if (!cancelled) {
          setInitError(
            error?.message ||
              'Could not connect to the server. Check your internet connection and try again.',
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    initApp();
    
    const subscription = AppState.addEventListener('change', (nextAppState: any) => {
      if (nextAppState === 'active') {
        syncOfflineAssessments();
      }
    });

    return () => { 
      cancelled = true; 
      subscription.remove();
    };
  }, [initAttempt]);

  const retryInit = () => setInitAttempt(n => n + 1);

  const clearAuthState = async () => {
    await clearTokens();
    setIsLoggedIn(false);
    setUserProfile(null);
    setCart([]);
    setWishlist([]);
  };

  const checkAuthStatus = async () => {
    const token = await getAccessToken();
    if (!token) {
      setIsLoggedIn(false);
      setUserProfile(null);
      return;
    }

    setIsLoggedIn(true);
    try {
      const profile = await api.getProfile();
      setUserProfile(profile);
      await fetchCartAndWishlist();
      syncOfflineAssessments();
    } catch (err) {
      if (isAuthError(err)) {
        await clearAuthState();
      } else {
        console.error('Failed to fetch profile', err);
      }
    }
  };

  const logout = async () => {
    await clearAuthState();
  };

  const checkCovertTrigger = async (query: string): Promise<boolean> => {
    const token = await getAccessToken();
    if (!token) return false;

    try {
      await api.verifyPin(query.trim());
      return true;
    } catch {
      return false;
    }
  };

  const refreshProducts = async (category?: string, search?: string) => {
    try {
      const data = await api.getProducts(category, search);
      if (!category && !search) {
        setProducts(data);
      }
      return data;
    } catch (err) {
      console.error('Failed to fetch products', err);
      return [];
    }
  };

  const fetchCartAndWishlist = async () => {
    try {
      const token = await getAccessToken();
      if (!token) return;

      const [cartData, wishlistData] = await Promise.all([
        api.getCart(),
        api.getWishlist()
      ]);

      const mappedCart = cartData.map(item => ({
        ...item.products,
        cartItemId: item.id,
        quantity: item.quantity,
        selectedSize: item.size
      }));
      setCart(mappedCart);

      const mappedWishlist = wishlistData.map(item => item.product_id);
      setWishlist(mappedWishlist);
    } catch (err) {
      if (isAuthError(err)) {
        await clearAuthState();
      } else {
        console.error('Failed to fetch cart/wishlist', err);
      }
    }
  };

  // Timeout ref for covert mode inactivity monitoring
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const onTimeoutCallbackRef = useRef<(() => void) | null>(null);

  const registerInactivityReset = (onTimeout: () => void) => {
    onTimeoutCallbackRef.current = onTimeout;
    resetInactivityTimer();

    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
      onTimeoutCallbackRef.current = null;
    };
  };

  const resetInactivityTimer = () => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    if (onTimeoutCallbackRef.current) {
      inactivityTimerRef.current = setTimeout(() => {
        if (onTimeoutCallbackRef.current) {
          onTimeoutCallbackRef.current();
        }
      }, INACTIVITY_TIMEOUT_MS);
    }
  };

  const triggerTouchActivity = () => {
    resetInactivityTimer();
  };

  const addToCart = async (product: Product, size: string) => {
    const token = await getAccessToken();
    if (token) {
      await api.addToCart(product.id, 1, size);
      await fetchCartAndWishlist();
    } else {
      setCart(prev => [...prev, { ...product, quantity: 1, selectedSize: size, cartItemId: Math.random().toString() }]);
    }
  };

  const removeFromCart = async (itemId: string) => {
    try {
      const token = await getAccessToken();
      if (token) {
        await api.removeFromCart(itemId);
        await fetchCartAndWishlist();
      } else {
         setCart(prev => prev.filter(c => c.cartItemId !== itemId));
      }
    } catch (error) {
      console.error('Failed to remove from cart', error);
    }
  };

  const updateQuantity = async (index: number, delta: number) => {
    const item = cart[index];
    if (!item) return;

    try {
      const token = await getAccessToken();
      if (token) {
        if (delta > 0) {
          await api.addToCart(item.id, delta, item.selectedSize!);
        } else {
           if (item.quantity + delta <= 0) {
               await api.removeFromCart(item.cartItemId!);
           }
        }
        await fetchCartAndWishlist();
      } else {
        setCart((prevCart) => {
          const updated = [...prevCart];
          const newQty = updated[index].quantity + delta;
          if (newQty <= 0) return updated.filter((_, i) => i !== index);
          updated[index].quantity = newQty;
          return updated;
        });
      }
    } catch (error) {
       console.error('Update qty error', error);
    }
  };

  const toggleWishlist = async (productId: string) => {
    try {
      const token = await getAccessToken();
      if (token) {
        await api.toggleWishlist(productId);
        await fetchCartAndWishlist();
      } else {
        setWishlist((prev) => prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]);
      }
    } catch (error) {
       console.error('Toggle wishlist error', error);
    }
  };

  const addRecentSearch = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setRecentSearches((prev) => {
      const filtered = prev.filter((q) => q.toLowerCase() !== trimmed.toLowerCase());
      return [trimmed, ...filtered].slice(0, 6);
    });
  };

  const clearCart = () => {
    setCart([]);
  };

  return (
    <AppContext.Provider
      value={{
        products,
        cart,
        wishlist,
        recentSearches,
        isLoading,
        initError,
        isLoggedIn,
        userProfile,
        addToCart,
        removeFromCart,
        updateQuantity,
        toggleWishlist,
        addRecentSearch,
        clearCart,
        registerInactivityReset,
        triggerTouchActivity,
        refreshProducts,
        fetchCartAndWishlist,
        checkAuthStatus,
        checkCovertTrigger,
        logout,
        retryInit,
        currentRiskAssessment,
        setCurrentRiskAssessment,
        clearSafetyState
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
