import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useActiveCar } from '@/contexts/ActiveCarContext';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemeColors } from '@/constants/theme-enhanced';

const ONBOARDING_COMPLETE_KEY = '@pocket_mechanic:onboarding_complete';

export default function Index() {
  const [isChecking, setIsChecking] = useState(true);
  const [shouldShowOnboarding, setShouldShowOnboarding] = useState(false);
  const { vehicles, isLoading: vehiclesLoading } = useActiveCar();
  const { theme } = useTheme();
  const colors = ThemeColors[theme];

  useEffect(() => {
    const checkOnboarding = async () => {
      if (vehiclesLoading) return;

      try {
        const completed = await AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY);
        
        // Show onboarding if:
        // 1. No cars exist AND
        // 2. Onboarding hasn't been completed
        if (vehicles.length === 0 && completed !== 'true') {
          setShouldShowOnboarding(true);
        }
      } catch (error) {
        console.error('Error checking onboarding:', error);
      } finally {
        setIsChecking(false);
      }
    };

    checkOnboarding();
  }, [vehicles.length, vehiclesLoading]);

  // Show loading while checking onboarding
  if (isChecking || vehiclesLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Check onboarding
  if (shouldShowOnboarding) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/chatbot" />;
}
