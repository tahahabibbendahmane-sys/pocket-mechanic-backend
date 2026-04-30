import React, { useEffect, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { requestNotificationPermissions } from '@/lib/notifications';
import { startDriveDetection } from '@/lib/driveDetection';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ActiveCarProvider } from '@/contexts/ActiveCarContext';
import { UnitsProvider } from '@/contexts/UnitsContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ChatProvider } from '@/contexts/ChatContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { XPProvider } from '@/contexts/XPContext';
import MileageUpdateModal from '@/components/MileageUpdateModal';

export default function RootLayout() {
  const router = useRouter();
  const [showMileageUpdateModal, setShowMileageUpdateModal] = useState(false);

  useEffect(() => {
    requestNotificationPermissions();
  }, []);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      const type = data?.type;
      const screen = data?.screen;

      if (type === 'drive_mileage_update') {
        setShowMileageUpdateModal(true);
        return;
      }

      if (screen === 'service') {
        router.push('/(tabs)/maintenance');
      }
    });
    return () => subscription.remove();
  }, [router]);

  useEffect(() => {
    const restoreDriveDetection = async () => {
      try {
        const enabled = await AsyncStorage.getItem('drive_detection_enabled');
        if (enabled === 'true') {
          await startDriveDetection();
        }
      } catch (e) {
        console.error('[driveDetection] restore failed:', e);
      }
    };

    restoreDriveDetection();
  }, []);

  useEffect(() => {
    // If the user taps a notification while the app is opening from background/quit
    const openFromLastResponse = async () => {
      try {
        const lastResponse = await Notifications.getLastNotificationResponseAsync();
        const data = lastResponse?.notification?.request?.content?.data;
        if (data?.type === 'drive_mileage_update') {
          setShowMileageUpdateModal(true);
        }
      } catch {
        // ignore
      }
    };

    openFromLastResponse();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <LanguageProvider>
        <AuthProvider>
          <ChatProvider>
            <UnitsProvider>
              <ThemeProvider>
                <ActiveCarProvider>
                  <XPProvider>
                  <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="(tabs)" />
                    <Stack.Screen name="(modals)" options={{ presentation: 'modal' }} />
                    <Stack.Screen name="insurance" />
                    <Stack.Screen name="login" />
                    <Stack.Screen name="signup" />
                    <Stack.Screen name="vehicle-form" />
                    <Stack.Screen name="guide-detail" />
                    <Stack.Screen name="privacy-policy" />
                    <Stack.Screen name="terms-of-service" />
                    <Stack.Screen name="edit-profile" />
                    <Stack.Screen name="onboarding" />
                    <Stack.Screen name="recalls" />
                    <Stack.Screen name="documents" />
                    <Stack.Screen name="add-fuel" />
                    <Stack.Screen name="fuel-dashboard" />
                    <Stack.Screen name="index" />
                  </Stack>
                    <MileageUpdateModal
                      visible={showMileageUpdateModal}
                      onClose={() => setShowMileageUpdateModal(false)}
                    />
                  </XPProvider>
                </ActiveCarProvider>
              </ThemeProvider>
            </UnitsProvider>
          </ChatProvider>
        </AuthProvider>
      </LanguageProvider>
    </GestureHandlerRootView>
  );
}
