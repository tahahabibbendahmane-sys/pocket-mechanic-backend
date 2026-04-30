import React from 'react';
import { Text, StyleSheet, ViewStyle, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { COLORS, RADIUS, SPACING, TYPE } from '@/constants/DesignSystem';
import * as Haptics from 'expo-haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type ButtonVariant = 'primary' | 'success' | 'danger' | 'ghost';

interface ChunkyButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  icon?: React.ReactNode;
  small?: boolean;
  style?: ViewStyle;
}

const VARIANT_STYLES: Record<ButtonVariant, { bg: string; text: string; border: string }> = {
  primary: { bg: COLORS.blue, text: '#000000', border: COLORS.blueDark },
  success: { bg: COLORS.xpGreen, text: '#FFFFFF', border: COLORS.xpGreenDark },
  danger: { bg: COLORS.heartRed, text: '#FFFFFF', border: '#CC3333' },
  ghost: { bg: 'transparent', text: COLORS.blue, border: COLORS.blue },
};

export function ChunkyButton({ title, onPress, variant = 'primary', disabled, icon, small, style }: ChunkyButtonProps) {
  const pressed = useSharedValue(0);
  const vs = VARIANT_STYLES[variant];

  const animatedStyle = useAnimatedStyle(() => ({
    borderBottomWidth: pressed.value ? 2 : 4,
    transform: [{ translateY: pressed.value ? 2 : 0 }],
  }));

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress();
  };

  return (
    <AnimatedPressable
      onPressIn={() => { pressed.value = withSpring(1, { damping: 20, stiffness: 300 }); }}
      onPressOut={() => { pressed.value = withSpring(0, { damping: 15, stiffness: 200 }); }}
      onPress={handlePress}
      disabled={disabled}
      style={[
        styles.button,
        small && styles.buttonSmall,
        {
          backgroundColor: vs.bg,
          borderColor: vs.border,
          opacity: disabled ? 0.5 : 1,
        },
        animatedStyle,
        style,
      ]}
    >
      {icon}
      <Text style={[
        small ? styles.labelSmall : styles.label,
        { color: vs.text },
      ]}>
        {title}
      </Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    borderRadius: RADIUS.sm,
    borderWidth: 2.5,
    borderBottomWidth: 4,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
  },
  buttonSmall: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
  label: {
    ...TYPE.h3,
    textAlign: 'center',
  },
  labelSmall: {
    ...TYPE.label,
    textAlign: 'center',
  },
});
