import React from 'react';
import { Text, StyleSheet, ViewStyle, Pressable } from 'react-native';
import { Colors, RADIUS, SPACING, TYPE } from '@/constants/DesignSystem';
import * as Haptics from 'expo-haptics';

type ButtonVariant = 'primary' | 'success' | 'danger' | 'ghost' | 'secondary';

interface ChunkyButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  icon?: React.ReactNode;
  small?: boolean;
  style?: ViewStyle;
}

const VARIANT_STYLES: Record<ButtonVariant, { bg: string; text: string; border: string; borderWidth: number }> = {
  primary: { bg: Colors.primary, text: Colors.surface, border: Colors.primary, borderWidth: 0 },
  success: { bg: Colors.success, text: Colors.surface, border: Colors.success, borderWidth: 0 },
  danger: { bg: Colors.dangerLight, text: Colors.danger, border: Colors.dangerLight, borderWidth: 0 },
  ghost: { bg: 'transparent', text: Colors.primary, border: Colors.border, borderWidth: 1 },
  secondary: { bg: 'transparent', text: Colors.textPrimary, border: Colors.border, borderWidth: 1 },
};

export function ChunkyButton({ title, onPress, variant = 'primary', disabled, icon, small, style }: ChunkyButtonProps) {
  const vs = VARIANT_STYLES[variant];

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        {
          backgroundColor: vs.bg,
          borderColor: vs.border,
          borderWidth: vs.borderWidth,
          opacity: disabled ? 0.5 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        style,
      ]}
    >
      {icon}
      <Text style={[small ? styles.labelSmall : styles.label, { color: vs.text }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    borderRadius: RADIUS.sm,
    paddingVertical: 14,
    paddingHorizontal: SPACING.xl,
  },
  buttonSmall: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
  label: {
    ...TYPE.button,
    textAlign: 'center',
    color: Colors.surface,
  },
  labelSmall: {
    ...TYPE.label,
    textAlign: 'center',
    fontSize: 13,
  },
});
