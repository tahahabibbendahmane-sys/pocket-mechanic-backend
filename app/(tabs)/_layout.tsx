import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '@/contexts/LanguageContext';
import { Colors } from '@/constants/DesignSystem';
import * as Haptics from 'expo-haptics';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.tabActive,
        tabBarInactiveTintColor: Colors.tabInactive,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: Colors.tabBar,
          borderTopWidth: 0.5,
          borderTopColor: Colors.tabBarBorder,
          elevation: 0,
          shadowOpacity: 0,
          height: 70 + insets.bottom,
          paddingBottom: insets.bottom,
        },
        tabBarLabelStyle: styles.tabBarLabelBase,
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
          tabBarLabel: ({ focused, color }) => (
            <Text style={[styles.tabLabel, focused ? styles.tabLabelFocused : styles.tabLabelMuted, { color }]}>{t.nav.home}</Text>
          ),
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconWrap}>
              <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="garage"
        options={{
          title: t.nav.garage,
          tabBarLabel: ({ focused, color }) => (
            <Text style={[styles.tabLabel, focused ? styles.tabLabelFocused : styles.tabLabelMuted, { color }]}>{t.nav.garage}</Text>
          ),
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconWrap}>
              <Ionicons name={focused ? 'car-sport' : 'car-sport-outline'} size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="maintenance"
        options={{
          title: t.nav.service,
          tabBarLabel: ({ focused, color }) => (
            <Text style={[styles.tabLabel, focused ? styles.tabLabelFocused : styles.tabLabelMuted, { color }]}>{t.nav.service}</Text>
          ),
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconWrap}>
              <Ionicons name={focused ? 'build' : 'build-outline'} size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="guides"
        options={{
          title: t.nav.guides,
          tabBarLabel: ({ focused, color }) => (
            <Text style={[styles.tabLabel, focused ? styles.tabLabelFocused : styles.tabLabelMuted, { color }]}>{t.nav.guides}</Text>
          ),
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconWrap}>
              <Ionicons name={focused ? 'book' : 'book-outline'} size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="chatbot"
        options={{
          title: t.nav.aiChat,
          tabBarLabel: ({ focused, color }) => (
            <Text style={[styles.tabLabel, focused ? styles.tabLabelFocused : styles.tabLabelMuted, { color }]}>{t.nav.aiChat}</Text>
          ),
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconWrap}>
              <Ionicons name={focused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'} size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t.nav.settings,
          tabBarLabel: ({ focused, color }) => (
            <Text style={[styles.tabLabel, focused ? styles.tabLabelFocused : styles.tabLabelMuted, { color }]}>{t.nav.settings}</Text>
          ),
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconWrap}>
              <Ionicons name={focused ? 'settings' : 'settings-outline'} size={22} color={color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarLabelBase: {
    fontSize: 10,
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 10,
    marginBottom: 2,
  },
  tabLabelFocused: {
    fontFamily: 'Outfit_700Bold',
  },
  tabLabelMuted: {
    fontFamily: 'Outfit_400Regular',
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
});
