import React, { useEffect, useRef } from 'react';
import { StyleSheet, Animated, View } from 'react-native';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { BorderRadius, Spacing } from '@/constants/theme-enhanced';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export function SkeletonLoader({ 
  width = '100%', 
  height = 20, 
  borderRadius = BorderRadius.md,
  style 
}: SkeletonLoaderProps) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const backgroundColor = useThemeColor({}, 'backgroundSecondary');
  const shimmerColor = useThemeColor({}, 'border');

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.6],
  });

  return (
    <View style={[styles.container, { width, height, borderRadius }, style]}>
      <Animated.View
        style={[
          styles.shimmer,
          {
            backgroundColor: shimmerColor,
            opacity,
            borderRadius,
          },
        ]}
      />
      <ThemedView
        style={[
          styles.base,
          {
            backgroundColor,
            borderRadius,
          },
        ]}
      />
    </View>
  );
}

export function SkeletonCard() {
  return (
    <ThemedView style={styles.card}>
      <SkeletonLoader width="60%" height={24} borderRadius={BorderRadius.md} />
      <SkeletonLoader width="40%" height={16} borderRadius={BorderRadius.sm} style={{ marginTop: Spacing.sm }} />
      <SkeletonLoader width="80%" height={16} borderRadius={BorderRadius.sm} style={{ marginTop: Spacing.xs }} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    position: 'relative',
  },
  base: {
    ...StyleSheet.absoluteFillObject,
  },
  shimmer: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    gap: Spacing.sm,
  },
});
