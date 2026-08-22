import React from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { RefreshCw, WifiOff } from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import { COLORS } from '../constants/theme';

interface AppInitGateProps {
  children: React.ReactNode;
}

export const AppInitGate: React.FC<AppInitGateProps> = ({ children }) => {
  const { isLoading, initError, retryInit } = useApp();

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.title}>Loading HavenCart…</Text>
        <Text style={styles.subtitle}>
          Waking up the server — this may take up to a minute on first launch.
        </Text>
      </View>
    );
  }

  if (initError) {
    return (
      <View style={styles.center}>
        <WifiOff size={48} color={COLORS.primary} />
        <Text style={styles.title}>Cannot reach the server</Text>
        <Text style={styles.subtitle}>{initError}</Text>
        <TouchableOpacity style={styles.button} onPress={retryInit}>
          <RefreshCw size={18} color="#fff" />
          <Text style={styles.buttonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: COLORS.background,
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 16,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
