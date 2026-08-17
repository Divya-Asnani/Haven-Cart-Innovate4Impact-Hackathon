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
console.log('[HavenCart] API_BASE_URL:', API_BASE_URL);

/** Root URL without the /api/v1 suffix — used for health checks. */
export const API_ROOT_URL = API_BASE_URL.replace(/\/api\/v1$/, '');

// ── Fetch with timeout ─────────────────────────────────────────────────
const FETCH_TIMEOUT_MS = 30_000;
const HEALTH_CHECK_TIMEOUT_MS = 15_000;

const fetchWithTimeout = async (
  input: RequestInfo,
  init?: RequestInit,
  timeoutMs: number = FETCH_TIMEOUT_MS,
): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(input, { ...init, signal: controller.signal });
    return res;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error(
        'Server is not responding. It may be starting up — please try again in a moment.',
      );
    }
    if (
      err.message?.includes('Network request failed') ||
      err.message?.includes('Failed to fetch')
    ) {
      throw new Error(
        'Cannot reach the server. Please check your internet connection and try again.',
      );
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
};

// ── Product mapper ──────────────────────────────────────────────────────
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

// ── Token Management ────────────────────────────────────────────────────
export const getAccessToken = async (): Promise<string | null> => {
  return await SecureStore.getItemAsync('access_token');
};

export const getRefreshToken = async (): Promise<string | null> => {
  return await SecureStore.getItemAsync('refresh_token');
};

export const setTokens = async (accessToken: string, refreshToken: string) => {
  await SecureStore.setItemAsync('access_token', accessToken);
  await SecureStore.setItemAsync('refresh_token', refreshToken);
};

export const clearTokens = async () => {
  await SecureStore.deleteItemAsync('access_token');
  await SecureStore.deleteItemAsync('refresh_token');
};

// ── Response handler ────────────────────────────────────────────────────
const handleResponse = async (res: Response) => {
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const detail = errorData.detail;
    const message = typeof detail === 'string'
      ? detail
      : Array.isArray(detail)
        ? detail.map((d: any) => d.msg ?? String(d)).join(', ')
        : `Request failed (${res.status})`;
    throw new Error(message);
  }
  return res.json();
};

// ── Authenticated fetch with automatic token refresh on 401 ───────────────
let refreshInFlight: Promise<string | null> | null = null;

const tryRefreshAccessToken = async (): Promise<string | null> => {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const storedRefresh = await getRefreshToken();
      if (!storedRefresh) return null;

      const res = await fetchWithTimeout(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: storedRefresh }),
      });

      if (!res.ok) return null;

      const data = await res.json();
      if (!data.access_token) return null;

      await SecureStore.setItemAsync('access_token', data.access_token);
      return data.access_token as string;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
};

const authFetch = async (
  url: string,
  init: RequestInit = {},
  tokenOverride?: string,
): Promise<Response> => {
  const makeRequest = async (token: string | null) => {
    const baseHeaders = (init.headers as Record<string, string> | undefined) ?? {};
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...baseHeaders,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    return fetchWithTimeout(url, { ...init, headers });
  };

  const token = tokenOverride ?? (await getAccessToken());
  let res = await makeRequest(token);

  // On 401, attempt one token refresh and retry (skip when using an explicit override)
  if (res.status === 401 && tokenOverride === undefined) {
    const newToken = await tryRefreshAccessToken();
    if (newToken) {
      res = await makeRequest(newToken);
    }
  }

  return res;
};

export const isAuthError = (err: unknown): boolean => {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes('Could not validate credentials') ||
    msg.includes('Token has expired') ||
    msg.includes('Invalid authentication credentials') ||
    msg.includes('Profile not found') ||
    msg.includes('User not found')
  );
};

// ── API methods ─────────────────────────────────────────────────────────
export const api = {
  /** Wake Render and verify connectivity. Tries /health first, falls back to /. */
  pingBackend: async (): Promise<boolean> => {
    try {
      let res = await fetchWithTimeout(
        `${API_ROOT_URL}/health`,
        {},
        HEALTH_CHECK_TIMEOUT_MS,
      );
      if (res.ok) return true;

      // Older deployments may not have /health yet
      if (res.status === 404) {
        res = await fetchWithTimeout(`${API_ROOT_URL}/`, {}, HEALTH_CHECK_TIMEOUT_MS);
      }
      return res.ok;
    } catch {
      return false;
    }
  },

  // Auth
  signup: async (data: any) => {
    const res = await fetchWithTimeout(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  login: async (data: any) => {
    const res = await fetchWithTimeout(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  verifyPin: async (pin: string) => {
    const res = await authFetch(`${API_BASE_URL}/auth/verify-pin`, {
      method: 'POST',
      body: JSON.stringify({ pin }),
    });
    return handleResponse(res);
  },

  refreshToken: async (refreshToken: string) => {
    const res = await fetchWithTimeout(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    return handleResponse(res);
  },

  updateLocation: async (data: any) => {
    const res = await authFetch(`${API_BASE_URL}/profile/location`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  getProfile: async () => {
    const res = await authFetch(`${API_BASE_URL}/profile/me`, {
      method: 'GET',
    });
    return handleResponse(res);
  },

  // Session
  sendHeartbeat: async (tokenOverride?: string) => {
    const res = await authFetch(
      `${API_BASE_URL}/session/heartbeat`,
      { method: 'POST' },
      tokenOverride,
    );
    return handleResponse(res);
  },

  endSession: async () => {
    const res = await authFetch(`${API_BASE_URL}/session/end`, {
      method: 'POST',
    });
    return handleResponse(res);
  },

  // Products
  getProducts: async (category?: string, search?: string): Promise<Product[]> => {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (search) params.append('search', search);

    const url = `${API_BASE_URL}/products${params.toString() ? '?' + params.toString() : ''}`;
    const res = await fetchWithTimeout(url);
    const data = await handleResponse(res);
    return Array.isArray(data) ? data.map(mapProduct) : [];
  },

  getProductById: async (productId: string): Promise<Product> => {
    const res = await fetchWithTimeout(`${API_BASE_URL}/products/${productId}`);
    const data = await handleResponse(res);
    return mapProduct(data);
  },

  // Cart
  getCart: async (): Promise<any[]> => {
    const res = await authFetch(`${API_BASE_URL}/cart`, { method: 'GET' });
    return handleResponse(res);
  },

  addToCart: async (productId: string, quantity: number, size: string) => {
    const res = await authFetch(`${API_BASE_URL}/cart`, {
      method: 'POST',
      body: JSON.stringify({ product_id: productId, quantity, size }),
    });
    return handleResponse(res);
  },

  removeFromCart: async (itemId: string) => {
    const res = await authFetch(`${API_BASE_URL}/cart/${itemId}`, {
      method: 'DELETE',
    });
    return handleResponse(res);
  },

  // Wishlist
  getWishlist: async (): Promise<any[]> => {
    const res = await authFetch(`${API_BASE_URL}/wishlist`, { method: 'GET' });
    return handleResponse(res);
  },

  toggleWishlist: async (productId: string) => {
    const res = await authFetch(`${API_BASE_URL}/wishlist`, {
      method: 'POST',
      body: JSON.stringify({ product_id: productId }),
    });
    return handleResponse(res);
  },
};
