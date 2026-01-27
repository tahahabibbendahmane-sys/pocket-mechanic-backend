import React, { useEffect, useRef } from 'react';
import { StyleSheet, Animated, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { BorderRadius, Spacing } from '@/constants/theme-enhanced';

interface StatusBadgeProps {
  status: 'overdue' | 'dueSoon' | 'ok';
  label: string;
  pulse?: boolean;
}

export function StatusBadge({ status, label, pulse = false }: StatusBadgeProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animation
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 200,
      friction: 7,
    }).start();

    // Pulse animation for overdue
    if (pulse && status === 'overdue') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [pulse, status, pulseAnim, scaleAnim]);

  const getStatusConfig = () => {
    switch (status) {
      case 'overdue':
        return {
          backgroundColor: '#EF4444',
          icon: 'exclamationmark.triangle.fill' as const,
          iconColor: '#FFFFFF',
        };
      case 'dueSoon':
        return {
          backgroundColor: '#F59E0B',
          icon: 'clock.fill' as const,
          iconColor: '#FFFFFF',
        };
      case 'ok':
        return {
          backgroundColor: '#FFFFFF',
          icon: 'checkmark.circle.fill' as const,
          iconColor: '#10B981',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <Animated.View
      style={[
        styles.badge,
        {
          backgroundColor: config.backgroundColor,
          opacity: 1,
          transform: [
            { scale: scaleAnim },
            ...(pulse && status === 'overdue' ? [{ scale: pulseAnim }] : []),
          ],
        },
      ]}>
      <IconSymbol name={config.icon} size={14} color={config.iconColor} />
      <ThemedText style={[styles.label, { color: config.iconColor, fontWeight: '700' }]}>
        {label}
      </ThemedText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
  },
});
