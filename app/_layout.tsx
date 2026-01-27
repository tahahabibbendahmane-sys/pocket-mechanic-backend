import { useState, useCallback, useEffect } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ActiveCarProvider } from '@/contexts/ActiveCarContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitsProvider } from '@/contexts/UnitsContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { AppSidebar } from '@/components/AppSidebar';
import { useThemeColor } from '@/hooks/use-theme-color';
import { supabase } from '@/lib/supabase';

function ThemedStatusBar() {
  const { isDark } = useTheme();
  return (
    <StatusBar
      style={isDark ? 'light' : 'dark'}
      translucent
      backgroundColor="transparent"
    />
  );
}

export default function RootLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Verify Supabase connection on initial render
  useEffect(() => {
    supabase.auth.getSession().then(({ data, error }) => {
      console.log('Supabase session check:', { data, error });
    });
  }, []);
  
  const handleCloseSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);
  
  const handleToggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <LanguageProvider>
            <UnitsProvider>
              <ActiveCarProvider>
                <RootLayoutContent
                  sidebarOpen={sidebarOpen}
                  onCloseSidebar={handleCloseSidebar}
                  onToggleSidebar={handleToggleSidebar}
                />
                <ThemedStatusBar />
              </ActiveCarProvider>
            </UnitsProvider>
          </LanguageProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function RootLayoutContent({
  sidebarOpen,
  onCloseSidebar,
  onToggleSidebar,
}: {
  sidebarOpen: boolean;
  onCloseSidebar: () => void;
  onToggleSidebar: () => void;
}) {
  const background = useThemeColor({}, 'background');
  const { isDark } = useTheme();
  const router = useRouter();

  // Header styling that matches Dark Mode theme - use theme background color
  const headerStyle = {
    backgroundColor: isDark ? '#0F172A' : '#F5F5F7', // Deep Slate for dark, off-white for light
    borderBottomWidth: 0, // Remove bottom border
    shadowOpacity: 0, // Remove shadow
    elevation: 0, // Remove shadow on Android
  };

  const headerTitleStyle = {
    color: isDark ? '#FFFFFF' : '#0F172A', // White for dark, dark for light
    fontSize: 18,
    fontWeight: '600' as const,
  };

  const headerTintColor = isDark ? '#FFFFFF' : '#0F172A'; // White for dark mode, dark for light mode

  // Close button component for modals
  const CloseButton = () => (
    <TouchableOpacity
      onPress={() => router.back()}
      style={{
        marginRight: 16,
        padding: 8,
        borderRadius: 8,
      }}
    >
      <View
        style={{
          width: 24,
          height: 24,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <View
          style={{
            width: 18,
            height: 2,
            backgroundColor: headerTintColor,
            transform: [{ rotate: '45deg' }],
            position: 'absolute',
          }}
        />
        <View
          style={{
            width: 18,
            height: 2,
            backgroundColor: headerTintColor,
            transform: [{ rotate: '-45deg' }],
            position: 'absolute',
          }}
        />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: background }}>
      <NavigationThemeProvider value={DefaultTheme}>
        <AppSidebar isOpen={sidebarOpen} onClose={onCloseSidebar} onToggle={onToggleSidebar}>
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'fade', // Smooth fade transitions
              animationDuration: 200,
            }}>
            {/* Main screens - no header */}
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen
              name="onboarding"
              options={{
                headerShown: false,
                animation: 'fade',
              }}
            />
            <Stack.Screen
              name="garage"
              options={{
                headerShown: false,
                animation: 'fade',
              }}
            />
            <Stack.Screen
              name="maintenance"
              options={{
                headerShown: false,
                animation: 'fade',
              }}
            />
            <Stack.Screen
              name="chatbot"
              options={{
                headerShown: false,
                animation: 'fade',
              }}
            />
            <Stack.Screen
              name="insurance"
              options={{
                headerShown: false,
                animation: 'fade',
              }}
            />
            
            {/* Sub-screens - with styled header */}
            <Stack.Screen
              name="settings"
              options={{
                headerShown: true,
                headerBackTitle: 'Back',
                title: 'Settings',
                headerStyle,
                headerTitleStyle,
                headerTintColor,
                animation: 'fade',
              }}
            />
            <Stack.Screen
              name="service-history"
              options={{
                headerShown: true,
                headerBackTitle: 'Back',
                title: 'Service History',
                headerStyle,
                headerTitleStyle,
                headerTintColor,
                animation: 'fade',
              }}
            />
            <Stack.Screen
              name="login"
              options={{
                headerShown: true,
                headerBackTitle: 'Back',
                title: 'Login',
                headerStyle,
                headerTitleStyle,
                headerTintColor,
                animation: 'fade',
              }}
            />
            <Stack.Screen
              name="signup"
              options={{
                headerShown: true,
                headerBackTitle: 'Back',
                title: 'Sign Up',
                headerStyle,
                headerTitleStyle,
                headerTintColor,
                animation: 'fade',
              }}
            />
            
            {/* Modals - with close button and swipe-down support */}
            <Stack.Screen
              name="vehicle-form"
              options={{
                presentation: 'modal',
                headerShown: true,
                title: 'Add Vehicle',
                headerStyle,
                headerTitleStyle,
                headerTintColor,
                headerLeft: () => null, // Remove default back button
                headerRight: () => <CloseButton />,
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen
              name="add-service"
              options={{
                presentation: 'modal',
                headerShown: true,
                title: 'Add Service',
                headerStyle,
                headerTitleStyle,
                headerTintColor,
                headerLeft: () => null,
                headerRight: () => <CloseButton />,
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen
              name="modal"
              options={{
                presentation: 'modal',
                headerShown: true,
                title: 'Modal',
                headerStyle,
                headerTitleStyle,
                headerTintColor,
                headerLeft: () => null,
                headerRight: () => <CloseButton />,
                animation: 'slide_from_bottom',
              }}
            />
          </Stack>
        </AppSidebar>
      </NavigationThemeProvider>
    </View>
  );
}
