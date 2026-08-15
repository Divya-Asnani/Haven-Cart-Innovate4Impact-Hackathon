import React, { createContext, useContext, useState, useRef, ReactNode } from 'react';
import { Product, CartItem } from '../types/navigation';
import { PRODUCTS_DATA } from '../data/products';
import { INACTIVITY_TIMEOUT_MS } from '../constants/theme';

interface AppContextType {
  products: Product[];
  cart: CartItem[];
  wishlist: string[];
  recentSearches: string[];
  addToCart: (product: Product, size: string) => void;
  removeFromCart: (index: number) => void;
  updateQuantity: (index: number, delta: number) => void;
  toggleWishlist: (productId: string) => void;
  addRecentSearch: (query: string) => void;
  clearCart: () => void;
  registerInactivityReset: (onTimeout: () => void) => () => void;
  triggerTouchActivity: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [products] = useState<Product[]>(PRODUCTS_DATA);
  const [cart, setCart] = useState<CartItem[]>([
    { ...PRODUCTS_DATA[0], quantity: 1, selectedSize: 'M' }
  ]);
  const [wishlist, setWishlist] = useState<string[]>(['trigger-item', 'prod-103']);
  const [recentSearches, setRecentSearches] = useState<string[]>([
    'Cotton Kurta 2104',
    'Denim Shirt',
    'Running Shoes',
    'Floral Dress'
  ]);

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

  const addToCart = (product: Product, size: string) => {
    setCart((prevCart) => {
      const existingIdx = prevCart.findIndex(
        (item) => item.id === product.id && item.selectedSize === size
      );
      if (existingIdx > -1) {
        const updated = [...prevCart];
        updated[existingIdx].quantity += 1;
        return updated;
      }
      return [...prevCart, { ...product, quantity: 1, selectedSize: size }];
    });
  };

  const removeFromCart = (index: number) => {
    setCart((prevCart) => prevCart.filter((_, i) => i !== index));
  };

  const updateQuantity = (index: number, delta: number) => {
    setCart((prevCart) => {
      const updated = [...prevCart];
      const newQty = updated[index].quantity + delta;
      if (newQty <= 0) {
        return updated.filter((_, i) => i !== index);
      }
      updated[index].quantity = newQty;
      return updated;
    });
  };

  const toggleWishlist = (productId: string) => {
    setWishlist((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
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
        addToCart,
        removeFromCart,
        updateQuantity,
        toggleWishlist,
        addRecentSearch,
        clearCart,
        registerInactivityReset,
        triggerTouchActivity
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
