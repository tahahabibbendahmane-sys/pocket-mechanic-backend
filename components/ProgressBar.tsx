import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { BorderRadius } from '@/constants/theme-enhanced';
import { ThemeColors } from '@/constants/theme-enhanced';
import { useTheme } from '@/contexts/ThemeContext';

interface ProgressBarProps {
  progress: number; // 0-1
  height?: number;
  color?: string;
  backgroundColor?: string;
  showLabel?: boolean;
  label?: string;
}

export function ProgressBar({
  progress,
  height = 8,
  color,
  backgroundColor,
  showLabel = false,
  label,
}: ProgressBarProps) {
  const { theme } = useTheme();
  const colors = ThemeColors[theme];
  const tintColor = useThemeColor({}, 'tint');
  const textColor = useThemeColor({}, 'text');
  
  const barColor = color || tintColor;
  const bgColor = backgroundColor || colors.border;

  // Determine color based on progress
  let progressColor = barColor;
  if (progress <= 0) {
    progressColor = '#EF4444'; // Red for overdue
  } else if (progress <= 0.2) {
    progressColor = '#F59E0B'; // Amber for due soon
  } else if (progress <= 0.5) {
    progressColor = '#F59E0B'; // Amber
  } else {
    progressColor = '#10B981'; // Green for good
  }

  return (
    <View style={styles.container}>
      <View style={[styles.track, { height, backgroundColor: bgColor, borderRadius: BorderRadius.full }]}>
        <View
          style={[
            styles.fill,
            {
              width: `${Math.max(0, Math.min(100, progress * 100))}%`,
              height,
              backgroundColor: progressColor,
              borderRadius: BorderRadius.full,
            },
          ]}
        />
      </View>
      {showLabel && label && (
        <ThemedText style={[styles.label, { color: textColor }]}>
          {label}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    // transition: 'width 0.3s ease', // Not supported in React Native
  },
  label: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
  },
});
