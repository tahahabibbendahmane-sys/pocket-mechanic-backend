import React, { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withDelay,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { COLORS, TYPE } from '@/constants/DesignSystem';

interface XPPopupProps {
  amount: number;
  onComplete: () => void;
}

export function XPPopup({ amount, onComplete }: XPPopupProps) {
  const translateY = useSharedValue(0);
  const scale = useSharedValue(0.5);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withSequence(
      withTiming(1, { duration: 200 }),
      withDelay(800, withTiming(0, { duration: 500 })),
    );
    scale.value = withSequence(
      withTiming(1.2, { duration: 300, easing: Easing.out(Easing.back(2)) }),
      withTiming(1, { duration: 200 }),
    );
    translateY.value = withSequence(
      withTiming(-40, { duration: 800, easing: Easing.out(Easing.ease) }),
      withDelay(200, withTiming(-80, { duration: 500, easing: Easing.in(Easing.ease) })),
    );

    const timer = setTimeout(() => {
      runOnJS(onComplete)();
    }, 1500);

    return () => clearTimeout(timer);
  }, [translateY, scale, opacity, onComplete]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.container, animatedStyle]} pointerEvents="none">
      <Text style={styles.text}>+{amount} XP ⚡</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 120,
    alignSelf: 'center',
    backgroundColor: COLORS.blueLight,
    borderWidth: 2,
    borderColor: COLORS.blue,
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 10,
    zIndex: 9999,
  },
  text: {
    ...TYPE.h2,
    color: COLORS.blueDark,
  },
});
