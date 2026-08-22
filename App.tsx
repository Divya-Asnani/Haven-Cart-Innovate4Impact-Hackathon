import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { AppProvider } from './src/context/AppContext';
import { AppInitGate } from './src/components/AppInitGate';
import { RootNavigator } from './src/navigation/RootNavigator';
import { LanguageProvider } from './src/i18n/LanguageContext';

import * as Linking from 'expo-linking';

const prefix = Linking.createURL('/');

const linking = {
  prefixes: [prefix, 'havencart://'],
  config: {
    screens: {
      ResponderLogin: 'responder/login',
      ResponderDashboard: 'responder/dashboard',
    },
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <AppProvider>
          <AppInitGate>
            <NavigationContainer linking={linking}>
              <StatusBar style="dark" backgroundColor="#FFFFFF" />
              <RootNavigator />
            </NavigationContainer>
          </AppInitGate>
        </AppProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
