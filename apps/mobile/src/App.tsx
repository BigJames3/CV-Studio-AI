import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { StripeProvider } from '@stripe/stripe-react-native';
import { RootNavigator } from './navigation/RootNavigator';
import { linking } from './navigation/linking';
import { navigationTheme } from './theme/navigationTheme';
import { useAuthStore } from './stores/auth-store';
import { useSyncEngine } from './hooks/use-sync-engine';
import { useNotificationsBootstrap } from './hooks/use-notifications-bootstrap';
import { OfflineBanner } from './components/ui/OfflineBanner';

const stripeKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';

export default function App() {
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useSyncEngine();
  useNotificationsBootstrap();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StripeProvider publishableKey={stripeKey} merchantIdentifier="merchant.ai.cvstudio">
          <NavigationContainer linking={linking} theme={navigationTheme}>
            <StatusBar style="auto" />
            <OfflineBanner />
            <RootNavigator />
          </NavigationContainer>
        </StripeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
