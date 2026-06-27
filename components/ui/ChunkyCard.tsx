import React from 'react';
import { View, StyleSheet, ViewStyle, Pressable } from 'react-native';
import { Colors, RADIUS, SPACING, CARD_SHADOW, CardVariant } from '@/constants/DesignSystem';

interface ChunkyCardProps {
  children: React.ReactNode;
  /** Kept for API compatibility; chrome is always neutral white card */
  variant?: CardVariant;
  onPress?: () => void;
  style?: ViewStyle;
  noPadding?: boolean;
}

export function ChunkyCard({ children, variant: _variant, onPress, style, noPadding }: ChunkyCardProps) {
  const cardStyles: ViewStyle[] = [
    styles.card,
    noPadding ? undefined : styles.padded,
    style,
  ].filter(Boolean) as ViewStyle[];

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [cardStyles, pressed && styles.pressed]}>
        {children}
      </Pressable>
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
    backgroundColor: Colors.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 0.5,
    borderColor: Colors.border,
    ...CARD_SHADOW,
  },
  padded: {
    padding: SPACING.lg,
  },
  pressed: {
    opacity: 0.96,
  },
});
