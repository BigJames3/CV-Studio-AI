import * as Linking from 'expo-linking';
import type { LinkingOptions } from '@react-navigation/native';
import type { RootStackParamList } from './types';

const prefix = Linking.createURL('/');

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [prefix, 'cvstudio://', 'https://app.cvstudio.ai'],
  config: {
    screens: {
      Auth: {
        screens: {
          Login: 'login',
          Register: 'register',
        },
      },
      MainTabs: {
        screens: {
          HomeTab: {
            screens: {
              Dashboard: 'dashboard',
            },
          },
          TemplatesTab: 'templates/:templateId?',
          AccountTab: 'account',
        },
      },
      Editor: {
        path: 'cv/:cvId',
        parse: {
          cvId: (id: string) => id,
        },
      },
      Paywall: 'paywall',
      CheckoutResult: {
        path: 'billing/:status',
        parse: {
          status: (s: string) => (s === 'success' ? 'success' : 'cancel'),
        },
      },
    },
  },
};
