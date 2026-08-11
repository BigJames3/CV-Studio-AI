/** Port of Design System tokens for RN */
export const colors = {
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  secondary: '#7C3AED',
  accent: '#EC4899',
  slate50: '#F8FAFC',
  slate100: '#F1F5F9',
  slate500: '#64748B',
  slate700: '#334155',
  slate900: '#0F172A',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  white: '#FFFFFF',
  black: '#000000',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
} as const;

export const typography = {
  title: { fontSize: 28, fontWeight: '700' as const },
  headline: { fontSize: 20, fontWeight: '600' as const },
  body: { fontSize: 16, fontWeight: '400' as const },
  caption: { fontSize: 13, fontWeight: '400' as const },
};
