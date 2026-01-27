import React, { useRef } from 'react';
import { TouchableOpacity, StyleSheet, Animated, ViewStyle, StyleProp } from 'react-native';
import { ThemedView } from '@/components/themed-view';

interface AnimatedCardProps {
  onPress?: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  lightColor?: string;
  darkColor?: string;
  disabled?: boolean;
}

export function AnimatedCard({
  onPress,
  children,
  style,
  lightColor,
  darkColor,
  disabled = false,
}: AnimatedCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled || !onPress) return;
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
      tension: 300,
      friction: 15,
    }).start();
  };

  const handlePressOut = () => {
    if (disabled || !onPress) return;
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 15,
    }).start();
  };

  if (!onPress) {
    return (
      <ThemedView style={style} lightColor={lightColor} darkColor={darkColor}>
        {children}
      </ThemedView>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      activeOpacity={1}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <ThemedView style={style} lightColor={lightColor} darkColor={darkColor}>
          {children}
        </ThemedView>
      </Animated.View>
    </TouchableOpacity>
  );
}
