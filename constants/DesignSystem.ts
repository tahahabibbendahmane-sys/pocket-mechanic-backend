import { ViewStyle } from 'react-native';

export const COLORS = {
  blue: '#0567A6',
  blueDark: '#044E80',
  blueLight: '#E8F4FF',
  blueGlow: '#B9DDFF',

  xpGreen: '#58CC02',
  xpGreenDark: '#46A302',
  xpGreenLight: '#D7F5B1',
  streakOrange: '#FF9600',
  streakOrangeLight: '#FFF0D4',
  levelPurple: '#CE82FF',
  levelPurpleLight: '#F4E5FF',
  heartRed: '#FF4B4B',
  heartRedLight: '#FFE5E5',
  starBlue: '#0567A6',
  starBlueLight: '#E5F7FF',

  light: {
    background: '#F7F7F7',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    text: '#1A1A1A',
    textSecondary: '#777777',
    textMuted: '#AFAFAF',
    border: '#E5E5E5',
    divider: '#F0F0F0',
  },

  dark: {
    background: '#0D0D0D',
    surface: '#1A1A1A',
    surfaceElevated: '#252525',
    text: '#FFFFFF',
    textSecondary: '#ABABAB',
    textMuted: '#666666',
    border: '#2A2A2A',
    divider: '#1F1F1F',
  },
} as const;

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
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  pill: 999,
} as const;

export const SHADOWS = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  } as ViewStyle,
  cardLifted: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 5,
  } as ViewStyle,
  glow: (color: string): ViewStyle => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  }),
};

export const TYPE = {
  displayXL: { fontFamily: 'Outfit_800ExtraBold', fontSize: 40, lineHeight: 44 },
  displayLG: { fontFamily: 'Outfit_800ExtraBold', fontSize: 32, lineHeight: 36 },
  displayMD: { fontFamily: 'Outfit_700Bold', fontSize: 28, lineHeight: 32 },

  h1: { fontFamily: 'Outfit_700Bold', fontSize: 24, lineHeight: 28 },
  h2: { fontFamily: 'Outfit_700Bold', fontSize: 20, lineHeight: 24 },
  h3: { fontFamily: 'Outfit_600SemiBold', fontSize: 17, lineHeight: 22 },

  bodyLG: { fontFamily: 'Outfit_500Medium', fontSize: 16, lineHeight: 22 },
  body: { fontFamily: 'Outfit_400Regular', fontSize: 15, lineHeight: 20 },
  bodySM: { fontFamily: 'Outfit_400Regular', fontSize: 13, lineHeight: 18 },

  label: { fontFamily: 'Outfit_600SemiBold', fontSize: 13, lineHeight: 16, letterSpacing: 0.5 },
  labelSM: { fontFamily: 'Outfit_600SemiBold', fontSize: 11, lineHeight: 14, letterSpacing: 0.8 },

  stat: { fontFamily: 'Outfit_800ExtraBold', fontSize: 36, lineHeight: 40 },
  statSM: { fontFamily: 'Outfit_700Bold', fontSize: 24, lineHeight: 28 },
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

export function getColors(isDark: boolean): ThemeColors {
  return isDark ? COLORS.dark : COLORS.light;
}

export type CardVariant = 'default' | 'green' | 'blue' | 'purple' | 'red';

export function getCardBorderColor(variant: CardVariant, isDark: boolean): string {
  switch (variant) {
    case 'green': return COLORS.xpGreen;
    case 'blue': return COLORS.blue;
    case 'purple': return COLORS.levelPurple;
    case 'red': return COLORS.heartRed;
    default: return isDark ? COLORS.dark.border : COLORS.light.border;
  }
}
