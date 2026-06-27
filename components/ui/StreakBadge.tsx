import React, { useEffect } from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { COLORS, RADIUS, SPACING, TYPE } from '@/constants/DesignSystem';

interface StreakBadgeProps {
  streak: number;
}

export function StreakBadge({ streak }: StreakBadgeProps) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.12, { duration: 500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [scale]);

  const flameStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.badge}>
      <Animated.View style={flameStyle}>
        <Ionicons name="flame" size={14} color={COLORS.primary} />
      </Animated.View>
      <Text style={styles.text}>{streak}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primaryLight,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  text: {
    ...TYPE.label,
    color: COLORS.primary,
  },
});
