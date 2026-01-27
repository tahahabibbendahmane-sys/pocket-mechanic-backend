import React, { createContext, useContext, useEffect, useRef, ReactNode, useCallback, useState } from 'react';
import { StyleSheet, TouchableOpacity, Animated, Dimensions, Platform, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { ThemeColors, Spacing, BorderRadius, Shadows } from '@/constants/theme-enhanced';
import { AnimatedButton } from '@/components/AnimatedButton';

interface AppSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onToggle: () => void;
  children: ReactNode;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SIDEBAR_WIDTH = SCREEN_WIDTH * 0.8; // 80% width for modern look

type SidebarControls = {
  isOpen: boolean;
  toggle: () => void;
  close: () => void;
};

const SidebarControlsContext = createContext<SidebarControls | null>(null);

export function useSidebarControls() {
  const ctx = useContext(SidebarControlsContext);
  if (!ctx) {
    throw new Error('useSidebarControls must be used within AppSidebar');
  }
  return ctx;
}

export function AppSidebar({ isOpen, onClose, onToggle, children }: AppSidebarProps) {
  const { theme, isDark } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  
  // Track if sidebar should be rendered (for close animation)
  const [shouldRender, setShouldRender] = useState(false);
  const isNavigatingRef = useRef(false);
  
  // Memoize close handler to ensure it's stable
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  
  // Control rendering based on isOpen
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
    } else {
      // Delay unmounting to allow close animation to complete
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 300); // Slightly longer than animation duration
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Animate sidebar when it opens/closes
  useEffect(() => {
    if (isOpen && shouldRender) {
      // Reset animation values when opening
      slideAnim.setValue(-SIDEBAR_WIDTH);
      backdropOpacity.setValue(0);
      
      // Animate in
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (!isOpen && shouldRender) {
      // Animate out before unmounting
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -SIDEBAR_WIDTH,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isOpen, shouldRender, slideAnim, backdropOpacity]);

  const colors = ThemeColors[theme];
  // Match exact path or pathname starting with the path (for nested routes)
  const isActive = (path: string) => {
    if (!pathname) return false;
    // Exact match or pathname starts with path followed by / (for nested routes)
    return pathname === path || pathname.startsWith(path + '/');
  };

  // Main navigation items (excluding settings)
  const menuItems = [
    { path: '/chatbot', icon: 'message.fill', label: t.tabs.chatbot },
    { path: '/garage', icon: 'car.fill', label: t.tabs.garage },
    { path: '/maintenance', icon: 'wrench.and.screwdriver.fill', label: t.tabs.maintenance },
    { path: '/insurance', icon: 'shield.fill', label: t.tabs.insurance },
  ];

  // Settings item (separated to bottom)
  const settingsItem = { path: '/settings', icon: 'gearshape.fill', label: t.tabs.settings };

  const handleNavigate = useCallback((path: string) => {
    // Prevent double navigation
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;
    
    // Close sidebar first
    handleClose();
    
    // Navigate immediately
    router.replace(path as any);
    
    // Reset navigation guard after delay
    setTimeout(() => {
      isNavigatingRef.current = false;
    }, 1000);
  }, [handleClose, router]);

  return (
    <SidebarControlsContext.Provider
      value={{
        isOpen,
        toggle: onToggle,
        close: handleClose,
      }}>
      <View style={styles.container}>
      {/* Main Content - never shifts, sidebar is overlay */}
      <View style={styles.contentWrapper}>
        {/* App Content */}
        {children}
      </View>

      {/* Backdrop and Sidebar Overlay - only render when shouldRender is true */}
      {shouldRender && (
        <>
          {/* Full-screen backdrop overlay - captures taps to close */}
          <Animated.View
            style={[
              styles.backdrop,
              {
                opacity: backdropOpacity,
                backgroundColor: isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.4)',
              },
            ]}
            pointerEvents={isOpen ? 'auto' : 'none'}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={handleClose}
            />
          </Animated.View>

          {/* Sidebar - edge-to-edge drawer with blue background */}
          <Animated.View
            style={[
              styles.sidebar,
              {
                transform: [{ translateX: slideAnim }],
                top: 0,
                height: Dimensions.get('window').height,
                ...Shadows.glass,
              },
            ]}
            pointerEvents={isOpen ? 'auto' : 'none'}>
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  // Solid theme blue background, edge-to-edge
                  backgroundColor: colors.primary,
                },
              ]}
            />

            <View
              style={[
                styles.sidebarContent,
                {
                  paddingTop: insets.top + Spacing.md,
                  paddingBottom: Math.max(insets.bottom, 34) + Spacing.xxl,
                },
              ]}>
          {/* Header */}
          <View style={styles.header}>
            <ThemedText 
              type="title" 
              style={[
                styles.title, 
                { 
                  color: isDark ? colors.text : colors.text,
                  fontWeight: '900', // Black weight for modern look
                }
              ]}>
              Pocket Mechanic
            </ThemedText>
            <TouchableOpacity
              style={[
                styles.closeButton, 
                { 
                  backgroundColor: isDark 
                    ? 'rgba(255, 255, 255, 0.15)' 
                    : 'rgba(0, 0, 0, 0.08)',
                }
              ]}
              onPress={handleClose}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <IconSymbol 
                name="xmark" 
                size={20} 
                color={isDark ? colors.text : colors.text} 
              />
            </TouchableOpacity>
          </View>

          {/* Main Menu */}
          <View style={styles.menu}>
            {menuItems.map((item) => {
              const active = isActive(item.path);
              return (
                <TouchableOpacity
                  key={item.path}
                  style={[
                    styles.menuItem,
                    active && styles.menuItemActive,
                    active && {
                      backgroundColor: isDark 
                        ? 'rgba(255, 255, 255, 0.15)' 
                        : 'rgba(99, 102, 241, 0.1)',
                    },
                  ]}
                  onPress={() => handleNavigate(item.path)}
                  activeOpacity={0.8}>
                  <View
                    style={[
                      styles.iconContainer,
                      active && { 
                        backgroundColor: isDark 
                          ? 'rgba(255, 255, 255, 0.2)' 
                          : 'rgba(99, 102, 241, 0.15)',
                      },
                      !active && {
                        backgroundColor: isDark 
                          ? 'rgba(255, 255, 255, 0.08)' 
                          : 'rgba(0, 0, 0, 0.04)',
                      },
                    ]}>
                    <IconSymbol
                      name={item.icon as any}
                      size={22}
                      color={active ? colors.primary : (isDark ? colors.textSecondary : colors.textSecondary)}
                    />
                  </View>
                  <ThemedText
                    style={[
                      styles.menuItemText,
                      {
                        color: active ? colors.primary : (isDark ? colors.text : colors.text),
                        fontWeight: active ? '800' : '600', // Heavy weight for active
                      },
                    ]}>
                    {item.label}
                  </ThemedText>
                  {active && (
                    <View style={styles.activeIndicator}>
                      <View style={styles.activeDot} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Bottom Section - Settings */}
          <View style={styles.footer}>
            {/* Settings */}
            <TouchableOpacity
              style={[
                styles.settingsItem,
                isActive(settingsItem.path) && {
                  backgroundColor: isDark 
                    ? 'rgba(255, 255, 255, 0.15)' 
                    : 'rgba(99, 102, 241, 0.1)',
                },
              ]}
              onPress={() => handleNavigate(settingsItem.path)}
              activeOpacity={0.8}>
              <View
                style={[
                  styles.iconContainer,
                  isActive(settingsItem.path) && { 
                    backgroundColor: isDark 
                      ? 'rgba(255, 255, 255, 0.2)' 
                      : 'rgba(99, 102, 241, 0.15)',
                  },
                  !isActive(settingsItem.path) && {
                    backgroundColor: isDark 
                      ? 'rgba(255, 255, 255, 0.08)' 
                      : 'rgba(0, 0, 0, 0.04)',
                  },
                ]}>
                <IconSymbol
                  name={settingsItem.icon as any}
                  size={20}
                  color={isActive(settingsItem.path) ? colors.primary : (isDark ? colors.textSecondary : colors.textSecondary)}
                />
              </View>
              <ThemedText
                style={[
                  styles.settingsItemText,
                  {
                    color: isActive(settingsItem.path) ? colors.primary : (isDark ? colors.text : colors.text),
                    fontWeight: isActive(settingsItem.path) ? '800' : '600',
                  },
                ]}>
                {settingsItem.label}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
        </>
      )}
      </View>
    </SidebarControlsContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentWrapper: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 998,
  },
  sidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: SIDEBAR_WIDTH,
    zIndex: 999,
    overflow: 'hidden',
    borderTopRightRadius: 0, // No rounded corners at top - goes edge to edge
    borderBottomRightRadius: BorderRadius['3xl'], // Only round bottom right corner
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  sidebarContent: {
    flex: 1,
    zIndex: 2,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: '900', // Black weight
    letterSpacing: -0.8,
  },
  closeButton: {
    width: 44, // Minimum tap target
    height: 44,
    borderRadius: BorderRadius['2xl'],
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  menu: {
    flex: 1,
    paddingTop: Spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.xs,
    borderRadius: BorderRadius['2xl'], // Bubble feel
    position: 'relative',
    minHeight: 44, // Minimum tap target
  },
  menuItemActive: {
    transform: [{ scale: 1.01 }],
  },
  iconContainer: {
    width: 44, // Minimum tap target
    height: 44,
    borderRadius: BorderRadius['2xl'],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  menuItemText: {
    fontSize: 17,
    flex: 1,
    letterSpacing: 0.1,
  },
  activeIndicator: {
    position: 'absolute',
    right: Spacing.md,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: 0, // No extra padding here since sidebarContent handles it
    gap: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius['2xl'],
    marginBottom: Spacing.xs,
    minHeight: 44, // Minimum tap target
  },
  settingsItemText: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
});
