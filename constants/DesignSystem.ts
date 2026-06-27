import { TextStyle, ViewStyle } from 'react-native';
import { Colors as BaseColors, COLORS, CARD_SHADOW } from './colors';

/**
 * Canonical UI tokens — critical keys are enforced here so consumers never see
 * undefined/white `textPrimary` or mismatched surface/background.
 */
export const Colors = {
  ...BaseColors,
  textPrimary: '#0D1117',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  primary: '#1A6FBF',
  primaryLight: '#EBF3FC',
  surface: '#FFFFFF',
  surfaceSecondary: '#F2F4F6',
  background: '#F8F9FA',
  border: '#E2E6EA',
} as const;

export { COLORS, CARD_SHADOW };

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const RADIUS = {
  sm: 10,
  md: 12,
  lg: 14,
  xl: 16,
  pill: 999,
} as const;

/** Standard card chrome — no colored borders */
export const CARD_STYLE: ViewStyle = {
  backgroundColor: Colors.surface,
  borderRadius: 14,
  borderWidth: 0.5,
  borderColor: Colors.border,
  padding: 16,
  ...CARD_SHADOW,
};

export const SHADOWS = {
  card: CARD_SHADOW,
  cardLifted: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  } as ViewStyle,
  glow: (color: string): ViewStyle => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  }),
};

/** Typography — Outfit throughout */
export const TYPE = {
  screenTitle: { fontFamily: 'Outfit_700Bold', fontSize: 26, lineHeight: 30, color: Colors.textPrimary } as TextStyle,
  sectionHeader: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 13,
    lineHeight: 16,
    color: Colors.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  },
  cardLabel: { fontFamily: 'Outfit_500Medium', fontSize: 13, lineHeight: 18, color: Colors.textSecondary } as TextStyle,
  cardValue: { fontFamily: 'Outfit_600SemiBold', fontSize: 17, lineHeight: 22, color: Colors.textPrimary } as TextStyle,
  body: { fontFamily: 'Outfit_400Regular', fontSize: 15, lineHeight: 22, color: Colors.textPrimary } as TextStyle,
  caption: { fontFamily: 'Outfit_400Regular', fontSize: 13, lineHeight: 18, color: Colors.textMuted } as TextStyle,
  button: { fontFamily: 'Outfit_600SemiBold', fontSize: 15, lineHeight: 20, color: Colors.textPrimary } as TextStyle,

  displayXL: { fontFamily: 'Outfit_800ExtraBold', fontSize: 40, lineHeight: 44, color: Colors.textPrimary },
  displayLG: { fontFamily: 'Outfit_800ExtraBold', fontSize: 32, lineHeight: 36, color: Colors.textPrimary },
  displayMD: { fontFamily: 'Outfit_700Bold', fontSize: 28, lineHeight: 32, color: Colors.textPrimary },

  h1: { fontFamily: 'Outfit_700Bold', fontSize: 24, lineHeight: 28, color: Colors.textPrimary },
  h2: { fontFamily: 'Outfit_700Bold', fontSize: 20, lineHeight: 24, color: Colors.textPrimary },
  h3: { fontFamily: 'Outfit_600SemiBold', fontSize: 17, lineHeight: 22, color: Colors.textPrimary },

  bodyLG: { fontFamily: 'Outfit_500Medium', fontSize: 16, lineHeight: 22, color: Colors.textPrimary },
  bodySM: { fontFamily: 'Outfit_400Regular', fontSize: 13, lineHeight: 18, color: Colors.textSecondary },

  label: { fontFamily: 'Outfit_600SemiBold', fontSize: 13, lineHeight: 16, letterSpacing: 0.5, color: Colors.textPrimary },
  labelSM: { fontFamily: 'Outfit_600SemiBold', fontSize: 11, lineHeight: 14, letterSpacing: 0.8, color: Colors.textMuted },

  stat: { fontFamily: 'Outfit_700Bold', fontSize: 20, lineHeight: 24, color: Colors.textPrimary },
  statSM: { fontFamily: 'Outfit_600SemiBold', fontSize: 18, lineHeight: 22, color: Colors.textPrimary },
  statLabel: { fontFamily: 'Outfit_400Regular', fontSize: 12, lineHeight: 16, color: Colors.textMuted },
} as const;

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceElevated: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  divider: string;
}

export function getColors(_isDark?: boolean): ThemeColors {
  return {
    background: Colors.background,
    surface: Colors.surface,
    surfaceElevated: Colors.surface,
    text: Colors.textPrimary,
    textSecondary: Colors.textSecondary,
    textMuted: Colors.textMuted,
    border: Colors.border,
    divider: Colors.surfaceSecondary,
  };
}

export type CardVariant = 'default' | 'green' | 'blue' | 'purple' | 'red';

/** No colored card borders — accent only inside content */
export function getCardBorderColor(_variant: CardVariant, _isDark?: boolean): string {
  return Colors.border;
}
