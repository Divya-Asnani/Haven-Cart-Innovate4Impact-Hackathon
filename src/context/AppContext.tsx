import React, { createContext, useContext, useState, useRef, ReactNode, useEffect } from 'react';
import { Product, CartItem } from '../types/navigation';
import { INACTIVITY_TIMEOUT_MS } from '../constants/theme';
import { api, getAccessToken, clearTokens } from '../api';

interface AppContextType {
  products: Product[];
  cart: CartItem[];
  wishlist: string[];
  recentSearches: string[];
  isLoading: boolean;
  isLoggedIn: boolean;
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
  checkCovertTrigger: (productId: string) => Promise<boolean>;
  logout: () => Promise<void>;
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
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Initialize App
  useEffect(() => {
    const initApp = async () => {
      try {
        await checkAuthStatus();
        await refreshProducts();
      } catch (error) {
        console.error('Failed to initialize app', error);
      } finally {
        setIsLoading(false);
      }
    };
    initApp();
  }, []);

  const checkAuthStatus = async () => {
    const token = await getAccessToken();
    if (token) {
      setIsLoggedIn(true);
      await fetchCartAndWishlist();
    } else {
      setIsLoggedIn(false);
    }
  };

  const logout = async () => {
    await clearTokens();
    setIsLoggedIn(false);
    setCart([]);
    setWishlist([]);
  };

  const checkCovertTrigger = async (_productId: string) => {
    const token = await getAccessToken();
    if (!token) return false;

    try {
      return false;
    } catch (error) {
      console.error('Failed to evaluate covert trigger', error);
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
      console.error('Failed to fetch cart/wishlist', err);
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
    try {
      const token = await getAccessToken();
      if (token) {
        await api.addToCart(product.id, 1, size);
        await fetchCartAndWishlist();
      } else {
        setCart(prev => [...prev, { ...product, quantity: 1, selectedSize: size, cartItemId: Math.random().toString() }]);
      }
    } catch (error) {
      console.error('Failed to add to cart', error);
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
        isLoggedIn,
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
        logout
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
