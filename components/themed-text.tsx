import { StyleSheet, Text, type TextProps } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const defaultColor = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
  const linkColor = useThemeColor({}, 'primaryDark');
  const color = type === 'link' ? linkColor : defaultColor;

  return (
    <Text
      style={[
        { color }, 
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? styles.link : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0,
  },
  defaultSemiBold: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '700', // Increased from 600
    letterSpacing: -0.2,
  },
  title: {
    fontSize: 28, // Reduced from 32 for better hierarchy
    fontWeight: '900', // Black weight for heavy contrast
    lineHeight: 32,
    letterSpacing: -0.8, // Tighter for modern look
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '800', // Increased from bold
    letterSpacing: -0.4,
  },
  link: {
    lineHeight: 30,
    fontSize: 16,
    fontWeight: '600',
  },
});
