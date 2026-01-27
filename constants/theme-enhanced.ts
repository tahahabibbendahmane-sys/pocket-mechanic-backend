/**
 * Modern Gen Z design system
 * Inspired by Linear.app meets Apple Health
 * Clean, minimalist, with personality
 */

export const ThemeColors = {
  light: {
    // Primary accent - Electric Indigo (punchy, modern)
    primary: '#6366F1', // Electric Indigo
    primaryBlue: '#6366F1',
    primaryDark: '#4F46E5', // Deeper indigo for pressed states
    primaryLight: '#EEF2FF', // Very light indigo tint
    
    // Backgrounds - Off-white base
    background: '#F5F5F7', // Off-white (Apple-style)
    backgroundSecondary: '#FFFFFF', // Pure white for cards
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    
    // Text - High contrast
    text: '#0F172A', // Near black for headers
    textSecondary: '#475569', // Slate for body
    textTertiary: '#94A3B8', // Lighter slate for hints
    textInverse: '#FFFFFF', // White text for dark backgrounds
    
    // UI elements
    icon: '#64748B',
    tint: '#6366F1', // Electric Indigo for buttons/links
    
    // Borders and dividers - Subtle
    border: '#E2E8F0', // Very light border
    divider: '#F1F5F9',
    
    // Status colors - Vibrant but accessible
    success: '#10B981', // Emerald
    warning: '#F59E0B', // Amber
    error: '#EF4444', // Red
    info: '#3B82F6', // Blue
    
    // Special colors
    white: '#FFFFFF',
    black: '#0F172A',
    
    // Card backgrounds for status - Subtle tints
    cardOverdue: '#FEF2F2', // Very light red tint
    cardDueSoon: '#FFFBEB', // Very light amber tint
    cardOk: '#FFFFFF',
    cardActive: '#EEF2FF', // Very light indigo tint
    
    // Colored shadows (soft glow)
    shadow: 'rgba(99, 102, 241, 0.08)', // Indigo glow
    shadowStrong: 'rgba(99, 102, 241, 0.15)',
    shadowOverdue: 'rgba(239, 68, 68, 0.1)',
    shadowDueSoon: 'rgba(245, 158, 11, 0.1)',
  },
  dark: {
    // Primary accent - Slightly brighter for dark mode
    primary: '#818CF8', // Lighter indigo for dark mode
    primaryBlue: '#818CF8',
    primaryDark: '#6366F1',
    primaryLight: '#312E81', // Dark indigo background
    
    // Backgrounds - Slate-900 base (high contrast)
    background: '#0F172A', // Slate-900
    backgroundSecondary: '#1E293B', // Slate-800
    surface: '#1E293B',
    surfaceElevated: '#334155', // Slate-700
    
    // Text - High contrast light
    text: '#F8FAFC', // Slate-50 (near white)
    textSecondary: '#CBD5E1', // Slate-300
    textTertiary: '#94A3B8', // Slate-400
    textInverse: '#0F172A', // Dark text for light backgrounds
    
    // UI elements
    icon: '#94A3B8',
    tint: '#818CF8', // Lighter indigo for dark mode
    
    // Borders and dividers
    border: '#334155', // Slate-700
    divider: '#475569', // Slate-600
    
    // Status colors - Slightly adjusted for dark mode
    success: '#34D399', // Lighter emerald
    warning: '#FBBF24', // Lighter amber
    error: '#F87171', // Lighter red
    info: '#60A5FA', // Lighter blue
    
    // Special colors
    white: '#F8FAFC',
    black: '#0F172A',
    
    // Card backgrounds for status
    cardOverdue: '#3D1F1F', // Dark red tint
    cardDueSoon: '#3D2F1F', // Dark amber tint
    cardOk: '#1E293B',
    cardActive: '#1E1B4B', // Dark indigo tint
    
    // Colored shadows (glow effect in dark mode)
    shadow: 'rgba(129, 140, 248, 0.2)', // Brighter indigo glow
    shadowStrong: 'rgba(129, 140, 248, 0.3)',
    shadowOverdue: 'rgba(248, 113, 113, 0.2)',
    shadowDueSoon: 'rgba(251, 191, 36, 0.2)',
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24, // Bubble/sticker feel
  '3xl': 32, // Large bubble feel
  full: 9999,
};

export const Typography = {
  // Font sizes - Larger hierarchy
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48, // For huge headers (car model names)
    '6xl': 60, // Extra large
  },
  // Font weights - Heavy for headers
  fontWeight: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const, // Heavy weight for headers
    black: '900' as const, // Black weight for emphasis
  },
  // Line heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
  // Letter spacing for better readability
  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
    wider: 1,
  },
};

// Colored shadows with soft glow effect
export const Shadows = {
  sm: {
    shadowColor: '#6366F1', // Electric Indigo
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  // Colored shadows for status
  overdue: {
    shadowColor: '#EF4444', // Red glow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  dueSoon: {
    shadowColor: '#F59E0B', // Amber glow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  // Glassmorphism shadow for sidebar
  glass: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
};

export type ThemeMode = 'light' | 'dark';
