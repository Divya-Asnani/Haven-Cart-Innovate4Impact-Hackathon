export const COLORS = {
  primary: '#FF3F6C',
  primaryDark: '#E0335C',
  primaryLight: '#FFF0F3',
  background: '#FFFFFF',
  surface: '#F5F5F6',
  card: '#FFFFFF',
  text: '#282C3F',
  textSecondary: '#686B78',
  textMuted: '#94969F',
  border: '#EAEAEC',
  success: '#03A685',
  error: '#FF5722',
  star: '#FF905A',
  overlay: 'rgba(0,0,0,0.5)',
};

export const INACTIVITY_TIMEOUT_MS = 90000; // 90 seconds — covert session auto-timeout

// Covert trigger: the product whose name matches this will open the safety flow
// instead of the product detail screen. Uses name match because UUIDs are dynamic.
export const TRIGGER_PRODUCT_NAME = 'Classic Cotton T-Shirt';
