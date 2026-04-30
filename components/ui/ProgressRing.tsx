import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { COLORS, TYPE } from '@/constants/DesignSystem';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ProgressRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
}

function getScoreColor(score: number): string {
  if (score >= 80) return COLORS.xpGreen;
  if (score >= 60) return COLORS.blue;
  if (score >= 40) return COLORS.streakOrange;
  return COLORS.heartRed;
}

export function ProgressRing({ score, size = 70, strokeWidth = 6, label }: ProgressRingProps) {
  const progress = useSharedValue(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const color = getScoreColor(score);

  useEffect(() => {
    progress.value = withTiming(score / 100, {
      duration: 800,
      easing: Easing.inOut(Easing.ease),
    });
  }, [score, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={styles.svg}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(150,150,150,0.15)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={styles.center}>
        <Animated.Text style={[styles.score, { color }]}>
          {score}
        </Animated.Text>
        {label && (
          <Animated.Text style={[styles.label, { color }]} numberOfLines={1}>
            {label}
          </Animated.Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    position: 'absolute',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  score: {
    ...TYPE.statSM,
    fontSize: 20,
    lineHeight: 24,
  },
  label: {
    ...TYPE.labelSM,
    fontSize: 9,
    marginTop: -1,
  },
});
