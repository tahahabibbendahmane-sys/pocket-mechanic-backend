import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Spacing, BorderRadius } from '@/constants/theme-enhanced';
import { useNavigation } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type AppHeaderProps = {
  title: string;
  right?: React.ReactNode;
};

export function AppHeader({ title, right }: AppHeaderProps) {
  const navigation = useNavigation();
  const iconColor = useThemeColor({}, 'icon');
  const surface = useThemeColor({}, 'surface');
  const insets = useSafeAreaInsets();

  return (
    <ThemedView
      style={[
        styles.container,
        {
          paddingTop: insets.top + 10,
          minHeight: 60 + insets.top,
        },
      ]}>
      <View style={styles.row}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Open menu"
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
          style={[styles.menuButton, { backgroundColor: surface }]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <IconSymbol name="line.3.horizontal" size={20} color={iconColor} />
        </TouchableOpacity>

        <ThemedText 
          type="title" 
          style={[styles.title, { fontWeight: '800' }]}>
          {title}
        </ThemedText>

        <View style={styles.rightSlot}>{right ?? <View style={styles.rightSpacer} />}</View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  menuButton: {
    width: 40, // Slightly smaller
    height: 40,
    borderRadius: BorderRadius.lg, // Less rounded
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20, // Reduced from 24
    flexShrink: 1, // Allow title to shrink if needed
  },
  rightSlot: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    flexShrink: 0,
    maxWidth: '35%', // Limit width so badge doesn't take too much space
  },
  rightSpacer: {
    width: 1,
    height: 1,
  },
});

