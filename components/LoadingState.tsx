import React from 'react';
import { StyleSheet, ActivityIndicator, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Spacing } from '@/constants/theme-enhanced';
import { SkeletonLoader } from './SkeletonLoader';

interface LoadingStateProps {
  message?: string;
  subMessage?: string;
  skeleton?: boolean;
}

export function LoadingState({ message, subMessage, skeleton = false }: LoadingStateProps) {
  const tintColor = useThemeColor({}, 'tint');

  if (skeleton) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.skeletonContainer}>
          <SkeletonLoader width="70%" height={28} />
          <SkeletonLoader width="50%" height={16} style={{ marginTop: Spacing.md }} />
          <View style={styles.skeletonCards}>
            <SkeletonLoader width="100%" height={120} style={{ marginTop: Spacing.lg }} />
            <SkeletonLoader width="100%" height={120} style={{ marginTop: Spacing.md }} />
          </View>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color={tintColor} />
        {message && (
          <ThemedText style={styles.message} type="subtitle">
            {message}
          </ThemedText>
        )}
        {subMessage && (
          <ThemedText style={styles.subMessage}>
            {subMessage}
          </ThemedText>
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  message: {
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  subMessage: {
    marginTop: Spacing.xs,
    textAlign: 'center',
    opacity: 0.7,
  },
  skeletonContainer: {
    width: '100%',
    padding: Spacing.lg,
  },
  skeletonCards: {
    width: '100%',
  },
});
