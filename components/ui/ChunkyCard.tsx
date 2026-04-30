import React from 'react';
import { View, StyleSheet, ViewStyle, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '@/contexts/ThemeContext';
import { COLORS, RADIUS, SPACING, SHADOWS, getCardBorderColor, CardVariant } from '@/constants/DesignSystem';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ChunkyCardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  onPress?: () => void;
  style?: ViewStyle;
  noPadding?: boolean;
}

function getCardBackground(variant: CardVariant, isDark: boolean): string {
  switch (variant) {
    case 'green': return isDark ? '#1A3A1A' : '#E8F8E8';
    case 'blue': return isDark ? '#1A2A3A' : '#E5F3FF';
    case 'purple': return isDark ? '#2A1A3A' : '#F0E8FF';
    case 'red': return isDark ? '#3A1A1A' : '#FFE8E8';
    default: return isDark ? COLORS.dark.surface : COLORS.light.surface;
  }
}

export function ChunkyCard({ children, variant = 'default', onPress, style, noPadding }: ChunkyCardProps) {
  const { isDark } = useTheme();
  const pressed = useSharedValue(0);

  const borderColor = getCardBorderColor(variant, isDark);
  const surface = getCardBackground(variant, isDark);

  const animatedStyle = useAnimatedStyle(() => ({
    borderBottomWidth: pressed.value ? 2.5 : 5,
    transform: [{ translateY: pressed.value ? 2.5 : 0 }],
  }));

  const cardStyles: ViewStyle[] = [
    styles.card,
    SHADOWS.card,
    {
      backgroundColor: surface,
      borderColor,
    },
    noPadding ? undefined : styles.padded,
    style,
  ].filter(Boolean) as ViewStyle[];

  if (onPress) {
    return (
      <AnimatedPressable
        onPressIn={() => { pressed.value = withSpring(1, { damping: 20, stiffness: 300 }); }}
        onPressOut={() => { pressed.value = withSpring(0, { damping: 15, stiffness: 200 }); }}
        onPress={onPress}
        style={[cardStyles, animatedStyle]}
      >
        {children}
      </AnimatedPressable>
    );
  }

  return (
    <View style={cardStyles}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.lg,
    borderWidth: 2.5,
    borderBottomWidth: 5,
  },
  padded: {
    padding: SPACING.lg,
  },
});
