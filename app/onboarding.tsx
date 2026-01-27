import { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { AnimatedButton } from '@/components/AnimatedButton';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUnits } from '@/contexts/UnitsContext';
import { useActiveCar } from '@/contexts/ActiveCarContext';
import { ThemeColors, BorderRadius, Typography, Spacing, Shadows } from '@/constants/theme-enhanced';
import { SafeAreaView } from 'react-native-safe-area-context';

const ONBOARDING_COMPLETE_KEY = '@pocket_mechanic:onboarding_complete';

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const { theme, isDark } = useTheme();
  const { language, setLanguage } = useLanguage();
  const { unitSystem, setUnitSystem } = useUnits();
  const { vehicles, isLoading } = useActiveCar();
  const router = useRouter();
  const colors = ThemeColors[theme];

  // Check if user has completed onboarding or has cars
  useEffect(() => {
    const checkOnboarding = async () => {
      if (isLoading) return;
      
      // If user has cars, skip onboarding
      if (vehicles.length > 0) {
        await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
        router.replace('/chatbot');
        return;
      }

      // Check if onboarding was already completed
      const completed = await AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY);
      if (completed === 'true') {
        router.replace('/chatbot');
      }
    };

    checkOnboarding();
  }, [vehicles.length, isLoading, router]);

  const handleNext = async () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      // Complete onboarding
      await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
      router.replace('/chatbot');
    }
  };

  const handleSkip = async () => {
    await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
    router.replace('/chatbot');
  };

  const handleAddCar = () => {
    router.push('/vehicle-form');
  };

  const steps = [
    {
      title: 'Welcome to Pocket Mechanic',
      subtitle: 'Meet Wrenchy',
      description: 'Your friendly mechanic assistant is here to help you keep your car in perfect shape.',
      icon: 'wrench.and.screwdriver.fill',
      content: (
        <View style={styles.stepContent}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primaryLight }]}>
            <IconSymbol name="wrench.and.screwdriver.fill" size={80} color={colors.primary} />
          </View>
          <ThemedText style={styles.stepDescription}>
            Wrenchy will help you track maintenance, get reminders, and answer questions about your vehicle.
          </ThemedText>
        </View>
      ),
    },
    {
      title: 'Add Your First Car',
      subtitle: 'Get Started',
      description: 'Add your vehicle to start tracking maintenance and getting personalized advice.',
      icon: 'car.fill',
      content: (
        <View style={styles.stepContent}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primaryLight }]}>
            <IconSymbol name="car.fill" size={80} color={colors.primary} />
          </View>
          <ThemedText style={styles.stepDescription}>
            Tell us about your car: make, model, year, and current mileage. We'll use this to provide accurate maintenance reminders.
          </ThemedText>
          <AnimatedButton
            style={[styles.ctaButton, { backgroundColor: colors.primaryDark }, Shadows.md]}
            onPress={handleAddCar}>
            <ThemedView style={[styles.ctaButtonContent, { backgroundColor: colors.primaryDark }]}>
              <IconSymbol name="plus" size={20} color="#FFFFFF" />
              <ThemedText style={[styles.ctaButtonText, { color: '#FFFFFF' }]}>
                Add Your Car
              </ThemedText>
            </ThemedView>
          </AnimatedButton>
        </View>
      ),
    },
    {
      title: 'Choose Your Units',
      subtitle: 'Metric or Imperial',
      description: 'Select your preferred unit system for distances and measurements.',
      icon: 'ruler.fill',
      content: (
        <View style={styles.stepContent}>
          <View style={styles.optionsContainer}>
            <AnimatedButton
              style={[
                styles.optionButton,
                {
                  backgroundColor: unitSystem === 'metric' ? colors.primary : (isDark ? '#1E293B' : '#FFFFFF'),
                  borderWidth: 2,
                  borderColor: unitSystem === 'metric' ? colors.primary : (isDark ? '#334155' : '#E2E8F0'),
                },
                Shadows.sm
              ]}
              onPress={() => setUnitSystem('metric')}>
              <ThemedView style={styles.optionContent}>
                <IconSymbol name="ruler.fill" size={32} color={unitSystem === 'metric' ? '#FFFFFF' : colors.primary} />
                <ThemedText style={[
                  styles.optionText,
                  { color: unitSystem === 'metric' ? '#FFFFFF' : colors.text, fontWeight: '700' }
                ]}>
                  Metric
                </ThemedText>
                <ThemedText style={[
                  styles.optionSubtext,
                  { color: unitSystem === 'metric' ? '#E0E7FF' : colors.textSecondary }
                ]}>
                  km, liters
                </ThemedText>
              </ThemedView>
            </AnimatedButton>
            <AnimatedButton
              style={[
                styles.optionButton,
                {
                  backgroundColor: unitSystem === 'imperial' ? colors.primary : (isDark ? '#1E293B' : '#FFFFFF'),
                  borderWidth: 2,
                  borderColor: unitSystem === 'imperial' ? colors.primary : (isDark ? '#334155' : '#E2E8F0'),
                },
                Shadows.sm
              ]}
              onPress={() => setUnitSystem('imperial')}>
              <ThemedView style={styles.optionContent}>
                <IconSymbol name="ruler.fill" size={32} color={unitSystem === 'imperial' ? '#FFFFFF' : colors.primary} />
                <ThemedText style={[
                  styles.optionText,
                  { color: unitSystem === 'imperial' ? '#FFFFFF' : colors.text, fontWeight: '700' }
                ]}>
                  Imperial
                </ThemedText>
                <ThemedText style={[
                  styles.optionSubtext,
                  { color: unitSystem === 'imperial' ? '#E0E7FF' : colors.textSecondary }
                ]}>
                  miles, gallons
                </ThemedText>
              </ThemedView>
            </AnimatedButton>
          </View>
        </View>
      ),
    },
    {
      title: 'Choose Your Language',
      subtitle: 'Language Preference',
      description: 'Select your preferred language for the app interface.',
      icon: 'globe',
      content: (
        <View style={styles.stepContent}>
          <View style={styles.optionsContainer}>
            {(['en', 'fr', 'es'] as const).map((lang) => (
              <AnimatedButton
                key={lang}
                style={[
                  styles.languageButton,
                  {
                    backgroundColor: language === lang ? colors.primary : (isDark ? '#1E293B' : '#FFFFFF'),
                    borderWidth: 2,
                    borderColor: language === lang ? colors.primary : (isDark ? '#334155' : '#E2E8F0'),
                  },
                  Shadows.sm
                ]}
                onPress={() => setLanguage(lang)}>
                <ThemedView style={styles.languageContent}>
                  <ThemedText style={[
                    styles.languageText,
                    { color: language === lang ? '#FFFFFF' : colors.text, fontWeight: '700' }
                  ]}>
                    {lang === 'en' ? 'English' : lang === 'fr' ? 'Français' : 'Español'}
                  </ThemedText>
                </ThemedView>
              </AnimatedButton>
            ))}
          </View>
        </View>
      ),
    },
  ];

  const currentStep = steps[step];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          {step > 0 && (
            <AnimatedButton
              style={styles.backButton}
              onPress={() => setStep(step - 1)}>
              <IconSymbol name="chevron.left" size={24} color={colors.text} />
            </AnimatedButton>
          )}
          {step < 3 && (
            <AnimatedButton
              style={styles.skipButton}
              onPress={handleSkip}>
              <ThemedText style={[styles.skipText, { color: colors.textSecondary }]}>
                Skip
              </ThemedText>
            </AnimatedButton>
          )}
        </View>

        <View style={styles.content}>
          <ThemedText style={[styles.title, { color: colors.text }]}>
            {currentStep.title}
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
            {currentStep.subtitle}
          </ThemedText>

          {currentStep.content}

          <View style={styles.progressContainer}>
            {steps.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.progressDot,
                  {
                    backgroundColor: index <= step ? colors.primary : (isDark ? '#334155' : '#E2E8F0'),
                  }
                ]}
              />
            ))}
          </View>

          <AnimatedButton
            style={[styles.nextButton, { backgroundColor: colors.primaryDark }, Shadows.md]}
            onPress={handleNext}
            disabled={step === 1 && vehicles.length === 0}>
            <ThemedView style={[styles.nextButtonContent, { backgroundColor: colors.primaryDark }]}>
              <ThemedText style={[styles.nextButtonText, { color: '#FFFFFF' }]}>
                {step === 3 ? 'Get Started' : 'Next'}
              </ThemedText>
              <IconSymbol name="arrow.right" size={20} color="#FFFFFF" />
            </ThemedView>
          </AnimatedButton>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  skipText: {
    fontSize: Typography.fontSize.base,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
  },
  title: {
    fontSize: Typography.fontSize['3xl'],
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: Typography.fontSize.lg,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  stepContent: {
    width: '100%',
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: BorderRadius['3xl'],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  stepDescription: {
    fontSize: Typography.fontSize.base,
    textAlign: 'center',
    lineHeight: Typography.fontSize.base * Typography.lineHeight.relaxed,
    paddingHorizontal: Spacing.lg,
    color: '#64748B',
  },
  optionsContainer: {
    width: '100%',
    gap: Spacing.md,
  },
  optionButton: {
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.lg,
    minHeight: 100,
  },
  optionContent: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  optionText: {
    fontSize: Typography.fontSize.xl,
    fontWeight: '700',
  },
  optionSubtext: {
    fontSize: Typography.fontSize.sm,
  },
  languageButton: {
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.lg,
    minHeight: 60,
  },
  languageContent: {
    alignItems: 'center',
  },
  languageText: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '700',
  },
  ctaButton: {
    borderRadius: BorderRadius['2xl'],
    marginTop: Spacing.xl,
    width: '100%',
  },
  ctaButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  ctaButtonText: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '700',
  },
  progressContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  nextButton: {
    borderRadius: BorderRadius['2xl'],
    width: '100%',
  },
  nextButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  nextButtonText: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '700',
  },
});
