import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../stores/auth-store';
import { AuthStack } from './AuthStack';
import { MainTabs } from './MainTabs';
import { EditorStack } from './EditorStack';
import { PaywallScreen } from '../screens/paywall/PaywallScreen';
import { CheckoutResultScreen } from '../screens/paywall/CheckoutResultScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const token = useAuthStore((s) => s.accessToken);
  const hydrated = useAuthStore((s) => s.hydrated);

  if (!hydrated) return null;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!token ? (
        <Stack.Screen name="Auth" component={AuthStack} />
      ) : (
        <>
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen
            name="Editor"
            component={EditorStack}
            options={{ presentation: 'fullScreenModal' }}
          />
          <Stack.Screen
            name="Paywall"
            component={PaywallScreen}
            options={{ presentation: 'modal', headerShown: true, title: 'Upgrade' }}
          />
          <Stack.Screen
            name="CheckoutResult"
            component={CheckoutResultScreen}
            options={{ presentation: 'modal', headerShown: true, title: 'Billing' }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
