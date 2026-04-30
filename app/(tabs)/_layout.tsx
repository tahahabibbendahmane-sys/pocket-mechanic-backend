import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { COLORS, getColors, TYPE } from '@/constants/DesignSystem';
import * as Haptics from 'expo-haptics';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { isDark } = useTheme();
  const c = getColors(isDark);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.blue,
        tabBarInactiveTintColor: c.textMuted,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: c.surface,
          borderTopWidth: 1,
          borderTopColor: c.divider,
          elevation: 0,
          shadowOpacity: 0,
          height: 70 + insets.bottom,
          paddingBottom: insets.bottom,
        },
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarIconStyle: styles.tabBarIcon,
        tabBarItemStyle: styles.tabBarItem,
      }}
      screenListeners={{
        tabPress: () => {
          Haptics.selectionAsync().catch(() => {});
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t.nav.home,
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconWrap}>
              <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
              {focused && <View style={[styles.activeDot, { backgroundColor: COLORS.blue }]} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="garage"
        options={{
          title: t.nav.garage,
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconWrap}>
              <Ionicons name={focused ? 'car-sport' : 'car-sport-outline'} size={22} color={color} />
              {focused && <View style={[styles.activeDot, { backgroundColor: COLORS.blue }]} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="maintenance"
        options={{
          title: t.nav.service,
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconWrap}>
              <Ionicons name={focused ? 'build' : 'build-outline'} size={22} color={color} />
              {focused && <View style={[styles.activeDot, { backgroundColor: COLORS.blue }]} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="guides"
        options={{
          title: t.nav.guides,
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconWrap}>
              <Ionicons name={focused ? 'book' : 'book-outline'} size={22} color={color} />
              {focused && <View style={[styles.activeDot, { backgroundColor: COLORS.blue }]} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="chatbot"
        options={{
          title: t.nav.aiChat,
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconWrap}>
              <Ionicons name={focused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'} size={22} color={color} />
              {focused && <View style={[styles.activeDot, { backgroundColor: COLORS.blue }]} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t.nav.settings,
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconWrap}>
              <Ionicons name={focused ? 'settings' : 'settings-outline'} size={22} color={color} />
              {focused && <View style={[styles.activeDot, { backgroundColor: COLORS.blue }]} />}
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarLabel: {
    ...TYPE.labelSM,
    fontSize: 10,
    marginBottom: 2,
  },
  tabBarIcon: {
    marginTop: 4,
  },
  tabBarItem: {
    paddingVertical: 6,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 3,
  },
});
