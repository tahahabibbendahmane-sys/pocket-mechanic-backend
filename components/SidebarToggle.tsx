import React, { useRef } from 'react';
import { StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemeColors, Spacing, BorderRadius } from '@/constants/theme-enhanced';

interface SidebarToggleProps {
  onPress: () => void;
}

export function SidebarToggle({ onPress }: SidebarToggleProps) {
  const { theme } = useTheme();
  const colors = ThemeColors[theme];
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.button}
      activeOpacity={0.8}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <IconSymbol name="line.3.horizontal" size={24} color={colors.text} />
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
});
