/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { ThemeColors } from '@/constants/theme-enhanced';
import { useTheme } from '@/contexts/ThemeContext';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName?: keyof typeof ThemeColors.light
) {
  const { theme } = useTheme();
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  } else if (colorName) {
    return ThemeColors[theme][colorName];
  } else {
    // Fallback to background if no colorName provided
    return ThemeColors[theme].background;
  }
}
