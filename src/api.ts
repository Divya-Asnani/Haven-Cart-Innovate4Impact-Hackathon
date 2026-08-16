import * as SecureStore from 'expo-secure-store';
import { Product } from './types/navigation';

const normalizeBaseUrl = (url: string) => url.trim().replace(/\/+$/, '');

const getApiBaseUrl = () => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (!envUrl) {
    console.warn('EXPO_PUBLIC_API_URL is not set. Configure it in .env to a deployed backend URL.');
    return 'https://REPLACE_WITH_RENDER_URL/api/v1';
  }

  const normalized = normalizeBaseUrl(envUrl);
  return normalized.endsWith('/api/v1') ? normalized : `${normalized}/api/v1`;
};

export const API_BASE_URL = getApiBaseUrl();

const mapProduct = (item: any): Product => {
  const discountPct = Number(item.discount_percent ?? 0);

  return {
    id: String(item.id),
    name: item.name,
    brand: item.brand ?? '',
    price: Number(item.price ?? 0),
    mrp: Number(item.mrp ?? 0),
    discount: `${discountPct}% OFF`,
    category: item.category ?? item.category_slug ?? '',
    rating: Number(item.rating ?? 4),
    reviews: Number(item.reviews ?? 0),
    image: item.image_url ?? '',
    description: item.description ?? '',
    sizes: Array.isArray(item.sizes) ? item.sizes : [],
  };
};

// Token Management
export const getAccessToken = async (): Promise<string | null> => {
  return await SecureStore.getItemAsync('access_token');
};

export const setTokens = async (accessToken: string, refreshToken: string) => {
  await SecureStore.setItemAsync('access_token', accessToken);
  await SecureStore.setItemAsync('refresh_token', refreshToken);
};

export const clearTokens = async () => {
  await SecureStore.deleteItemAsync('access_token');
  await SecureStore.deleteItemAsync('refresh_token');
};

const handleResponse = async (res: Response) => {
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Something went wrong');
  }
  return res.json();
};

const authHeaders = async () => {
  const token = await getAccessToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

export const api = {
  // Auth
  signup: async (data: any) => {
    const res = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  login: async (data: any) => {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  verifyPin: async (pin: string) => {
    const res = await fetch(`${API_BASE_URL}/auth/verify-pin`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({ pin }),
    });
    return handleResponse(res);
  },

  refreshToken: async (refreshToken: string) => {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    return handleResponse(res);
  },

  updateLocation: async (data: any) => {
    const res = await fetch(`${API_BASE_URL}/profile/location`, {
      method: 'PUT',
      headers: await authHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  // Session
  sendHeartbeat: async (tokenOverride?: string) => {
    const token = tokenOverride ?? (await getAccessToken());
    const res = await fetch(`${API_BASE_URL}/session/heartbeat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    return handleResponse(res);
  },

  endSession: async () => {
    const res = await fetch(`${API_BASE_URL}/session/end`, {
      method: 'POST',
      headers: await authHeaders(),
    });
    return handleResponse(res);
  },

  // Products
  getProducts: async (category?: string, search?: string): Promise<Product[]> => {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (search) params.append('search', search);
    
    const url = `${API_BASE_URL}/products${params.toString() ? '?' + params.toString() : ''}`;
    const res = await fetch(url);
    const data = await handleResponse(res);
    return Array.isArray(data) ? data.map(mapProduct) : [];
  },

  getProductById: async (productId: string): Promise<Product> => {
    const res = await fetch(`${API_BASE_URL}/products/${productId}`);
    const data = await handleResponse(res);
    return mapProduct(data);
  },

  // Cart
  getCart: async (): Promise<any[]> => {
    const res = await fetch(`${API_BASE_URL}/cart`, {
      method: 'GET',
      headers: await authHeaders(),
    });
    return handleResponse(res);
  },

  addToCart: async (productId: string, quantity: number, size: string) => {
    const res = await fetch(`${API_BASE_URL}/cart`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({ product_id: productId, quantity, size }),
    });
    return handleResponse(res);
  },

  removeFromCart: async (itemId: string) => {
    const res = await fetch(`${API_BASE_URL}/cart/${itemId}`, {
      method: 'DELETE',
      headers: await authHeaders(),
    });
    return handleResponse(res);
  },

  // Wishlist
  getWishlist: async (): Promise<any[]> => {
    const res = await fetch(`${API_BASE_URL}/wishlist`, {
      method: 'GET',
      headers: await authHeaders(),
    });
    return handleResponse(res);
  },

  toggleWishlist: async (productId: string) => {
    const res = await fetch(`${API_BASE_URL}/wishlist`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({ product_id: productId }),
    });
    return handleResponse(res);
  }
};
