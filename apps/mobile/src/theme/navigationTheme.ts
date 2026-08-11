import { DefaultTheme, DarkTheme, Theme } from '@react-navigation/native';
import { colors } from './tokens';

export const navigationTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.slate50,
    card: colors.white,
    text: colors.slate900,
    border: colors.slate100,
    notification: colors.accent,
  },
};

export const navigationDarkTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.primary,
    background: colors.slate900,
    card: '#1E293B',
    text: colors.slate50,
    border: '#334155',
    notification: colors.accent,
  },
};
