import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, RADIUS, SPACING, TYPE } from '@/constants/DesignSystem';

interface XPBadgeProps {
  xp: number;
}

export function XPBadge({ xp }: XPBadgeProps) {
  return (
    <View style={styles.badge}>
      <Text style={styles.icon}>⚡</Text>
      <Text style={styles.text}>{xp.toLocaleString()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.blueLight,
    borderWidth: 1.5,
    borderColor: COLORS.blue,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  icon: {
    fontSize: 14,
  },
  text: {
    ...TYPE.label,
    color: COLORS.blueDark,
  },
});
