import { ViewStyle } from 'react-native';

/** Professional palette — single source of truth */
export const Colors = {
  primary: '#1A6FBF',
  primaryLight: '#EBF3FC',
  primaryDark: '#0F4F8C',

  background: '#F8F9FA',
  surface: '#FFFFFF',
  surfaceSecondary: '#F2F4F6',

  border: '#E2E6EA',
  borderStrong: '#C8CDD3',

  textPrimary: '#0D1117',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',

  success: '#16A34A',
  successLight: '#F0FDF4',
  warning: '#D97706',
  warningLight: '#FFFBEB',
  danger: '#DC2626',
  dangerLight: '#FEF2F2',

  tabBar: '#FFFFFF',
  tabBarBorder: '#E2E6EA',
  tabActive: '#1A6FBF',
  tabInactive: '#9CA3AF',
} as const;

/** Subtle card shadow (one layer only) */
export const CARD_SHADOW: ViewStyle = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.04,
  shadowRadius: 4,
  elevation: 1,
};

/**
 * Legacy COLORS map — keeps existing imports working while using the new palette.
 * Prefer `Colors` in new code.
 */
export const COLORS = {
  ...Colors,

  card: Colors.surface,
  white: Colors.surface,
  text: Colors.textPrimary,
  textLight: Colors.textMuted,

  green: Colors.success,
  greenLight: Colors.successLight,
  greenDark: '#15803D',

  red: Colors.danger,
  redLight: Colors.dangerLight,

  amber: Colors.warning,
  amberLight: Colors.warningLight,
  amberDark: '#B45309',

  blue: Colors.primary,
  blueLight: Colors.primaryLight,
  blueDark: Colors.primaryDark,

  purple: Colors.textSecondary,
  purpleLight: Colors.surfaceSecondary,

  xpGreen: Colors.success,
  xpGreenDark: '#15803D',
  xpGreenLight: Colors.successLight,
  heartRed: Colors.danger,
  heartRedLight: Colors.dangerLight,
  levelPurple: Colors.primary,
  levelPurpleLight: Colors.primaryLight,
  starBlue: Colors.primary,
  streakOrange: Colors.warning,
  streakOrangeLight: Colors.warningLight,
} as const;
