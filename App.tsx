import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { AppProvider } from './src/context/AppContext';
import { AppInitGate } from './src/components/AppInitGate';
import { RootNavigator } from './src/navigation/RootNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <AppInitGate>
          <NavigationContainer>
            <StatusBar style="dark" backgroundColor="#FFFFFF" />
            <RootNavigator />
          </NavigationContainer>
        </AppInitGate>
      </AppProvider>
    </SafeAreaProvider>
  );
}
