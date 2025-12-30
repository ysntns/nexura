import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';

import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { LanguageProvider } from './src/contexts/LanguageContext';
import AppNavigator from './src/navigation/AppNavigator';
import AuthNavigator from './src/navigation/AuthNavigator';
import CallDetectionService from './src/services/CallDetectionService';
import SMSDetectionService from './src/services/SMSDetectionService';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    // Initialize call detection and SMS detection when user is authenticated
    if (isAuthenticated) {
      CallDetectionService.startListening().catch(error => {
        console.error('Failed to start call detection:', error);
      });

      SMSDetectionService.startListening().catch(error => {
        console.error('Failed to start SMS detection:', error);
      });
    } else {
      // Stop detection services when user logs out
      CallDetectionService.stopListening();
      SMSDetectionService.stopListening();
    }

    // Cleanup on unmount
    return () => {
      CallDetectionService.stopListening();
      SMSDetectionService.stopListening();
    };
  }, [isAuthenticated]);

  if (isLoading) {
    return null;
  }

  return isAuthenticated ? <AppNavigator /> : <AuthNavigator />;
}

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Pre-load fonts, make API calls, etc.
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
        await SplashScreen.hideAsync();
      }
    }

    prepare();
  }, []);

  if (!appIsReady) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <NavigationContainer>
              <StatusBar style="light" />
              <RootNavigator />
            </NavigationContainer>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
