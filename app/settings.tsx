import { useState, useLayoutEffect } from 'react';
import { StyleSheet, ScrollView, TextInput, View, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUnits, UnitSystem } from '@/contexts/UnitsContext';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Language } from '@/i18n';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { BorderRadius, Spacing, Typography, Shadows, ThemeColors } from '@/constants/theme-enhanced';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { AnimatedButton } from '@/components/AnimatedButton';
import { Alert } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useSidebarControls } from '@/components/AppSidebar';

export default function SettingsScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { toggle } = useSidebarControls();
  const { language, setLanguage, t } = useLanguage();
  const { unitSystem, setUnitSystem } = useUnits();
  const { theme, toggleTheme, isDark } = useTheme();
  const { signOut, profile, session } = useAuth();
  
  // Auth form state
  const [showSignIn, setShowSignIn] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const colors = ThemeColors[theme];
  const tintColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');
  const borderColor = useThemeColor({}, 'border');
  const iconColor = useThemeColor({}, 'icon');
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');

  // Disable native header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const languages: { code: Language; label: string }[] = [
    { code: 'en', label: t.settings.english },
    { code: 'fr', label: t.settings.french },
    { code: 'es', label: t.settings.spanish },
  ];

  const handleLanguageChange = async (lang: Language) => {
    await setLanguage(lang);
  };

  const handleUnitChange = async (unit: UnitSystem) => {
    await setUnitSystem(unit);
  };

  const units: { code: UnitSystem; label: string }[] = [
    { code: 'metric', label: t.settings.metric },
    { code: 'imperial', label: t.settings.imperial },
  ];

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      setAuthError('Please enter both email and password');
      return;
    }

    setAuthError(null);
    setAuthLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        setAuthError(error.message || 'Failed to sign in. Please check your credentials.');
      } else {
        setEmail('');
        setPassword('');
        setShowSignIn(false);
        setAuthError(null);
      }
    } catch (err) {
      setAuthError('An unexpected error occurred. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setAuthError('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      setAuthError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setAuthError('Passwords do not match');
      return;
    }

    setAuthError(null);
    setAuthLoading(true);

    try {
      // Let Supabase Auth + DB trigger handle profile creation.
      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            name: name.trim(),
          },
        },
      });

      if (authError) {
        setAuthError(authError.message || 'Failed to create account. Please try again.');
        setAuthLoading(false);
        return;
      }

      if (data.user) {
        // Local cleanup only; profile row is created by the database trigger.
        setName('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setShowSignUp(false);
        setAuthError(null);
      }
    } catch (err) {
      setAuthError('An unexpected error occurred. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      {/* Custom Header */}
      <ThemedView style={[styles.customHeader, { 
        paddingTop: insets.top + 10,
        backgroundColor: isDark ? '#0F172A' : '#F5F5F7',
      }]}>
        <View style={styles.headerRow}>
          {/* Left: Menu Button */}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Open menu"
            onPress={() => {
              try {
                const parent = navigation.getParent();
                if (parent && 'openDrawer' in parent) {
                  (parent as any).openDrawer();
                } else {
                  toggle();
                }
              } catch (error) {
                console.log('Sidebar toggle needed');
                toggle();
              }
            }}
            style={[styles.menuButton, { backgroundColor: colors.surface }]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <IconSymbol name="line.3.horizontal" size={20} color={iconColor} />
          </TouchableOpacity>

          {/* Center: Title */}
          <ThemedText 
            type="title" 
            style={[styles.headerTitle, { 
              color: isDark ? '#FFFFFF' : '#0F172A',
              fontWeight: '800' 
            }]}>
            Settings
          </ThemedText>

          {/* Right: Empty spacer for balance */}
          <View style={styles.headerRightSpacer} />
        </View>
      </ThemedView>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <ThemedText style={styles.subtitle}>{t.settings.subtitle}</ThemedText>

        {/* Language Section */}
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            {t.settings.language}
          </ThemedText>
          <ThemedText style={styles.sectionDescription}>{t.settings.languageDescription}</ThemedText>
          
          <ThemedView style={styles.languageList}>
            {languages.map((lang) => (
              <AnimatedButton
                key={lang.code}
                style={[
                  styles.languageItem,
                  { 
                    backgroundColor: colors.surface, 
                    borderColor: language === lang.code ? tintColor : borderColor,
                    borderWidth: language === lang.code ? 2 : 1,
                  },
                  Shadows.sm,
                ]}
                onPress={() => handleLanguageChange(lang.code)}>
                <ThemedView style={styles.languageItemContent}>
                  <ThemedView style={[styles.languageIconContainer, { backgroundColor: colors.primaryLight }]}>
                    <IconSymbol name="globe" size={20} color={tintColor} />
                  </ThemedView>
                  <ThemedText style={[styles.languageLabel, { color: textColor, fontWeight: language === lang.code ? '700' : '500' }]}>
                    {lang.label}
                  </ThemedText>
                  {language === lang.code && (
                    <ThemedView style={[styles.checkIconContainer, { backgroundColor: tintColor }]}>
                      <IconSymbol name="checkmark" size={16} color={colors.textInverse} />
                    </ThemedView>
                  )}
                </ThemedView>
              </AnimatedButton>
            ))}
          </ThemedView>
        </ThemedView>

        {/* Units Section */}
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            {t.settings.units}
          </ThemedText>
          <ThemedText style={styles.sectionDescription}>{t.settings.unitsDescription}</ThemedText>
          
          <ThemedView style={styles.languageList}>
            {units.map((unit) => (
              <AnimatedButton
                key={unit.code}
                style={[
                  styles.languageItem,
                  { 
                    backgroundColor: colors.surface, 
                    borderColor: unitSystem === unit.code ? tintColor : borderColor,
                    borderWidth: unitSystem === unit.code ? 2 : 1,
                  },
                  Shadows.sm,
                ]}
                onPress={() => handleUnitChange(unit.code)}>
                <ThemedView style={styles.languageItemContent}>
                  <ThemedView style={[styles.languageIconContainer, { backgroundColor: colors.primaryLight }]}>
                    <IconSymbol name={unit.code === 'metric' ? 'ruler' : 'speedometer'} size={20} color={tintColor} />
                  </ThemedView>
                  <ThemedText style={[styles.languageLabel, { color: textColor, fontWeight: unitSystem === unit.code ? '700' : '500' }]}>
                    {unit.label}
                  </ThemedText>
                  {unitSystem === unit.code && (
                    <ThemedView style={[styles.checkIconContainer, { backgroundColor: tintColor }]}>
                      <IconSymbol name="checkmark" size={16} color={colors.textInverse} />
                    </ThemedView>
                  )}
                </ThemedView>
              </AnimatedButton>
            ))}
          </ThemedView>
        </ThemedView>

        {/* Theme Section */}
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            {t.settings.theme}
          </ThemedText>
          <ThemedText style={styles.sectionDescription}>
            {t.settings.themeDescription}
          </ThemedText>
          
          <AnimatedButton
            style={[
              styles.languageItem,
              { 
                backgroundColor: colors.surface, 
                borderColor: borderColor,
                borderWidth: 1,
              },
              Shadows.sm,
            ]}
            onPress={toggleTheme}>
            <ThemedView style={styles.languageItemContent}>
              <ThemedView style={[styles.languageIconContainer, { backgroundColor: colors.primaryLight }]}>
                <IconSymbol name={isDark ? 'sun.max.fill' : 'moon.fill'} size={20} color={tintColor} />
              </ThemedView>
              <ThemedText style={[styles.languageLabel, { color: textColor, fontWeight: '600' }]}>
                {isDark ? t.settings.lightMode : t.settings.darkMode}
              </ThemedText>
            </ThemedView>
          </AnimatedButton>
        </ThemedView>

        {/* About Section (Placeholder) */}
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            {t.settings.about}
          </ThemedText>
          <ThemedView style={styles.placeholderItem}>
            <ThemedText style={styles.placeholderText}>{t.settings.version} 1.0.0</ThemedText>
          </ThemedView>
        </ThemedView>

        {/* Account Section */}
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Account
          </ThemedText>
          
          {session ? (
            <>
              {profile?.email && (
                <ThemedView style={styles.placeholderItem}>
                  <ThemedText style={styles.placeholderText}>{profile.email}</ThemedText>
                </ThemedView>
              )}
              {!session.user?.is_anonymous ? (
                <AnimatedButton
                  style={[
                    styles.languageItem,
                    { 
                      backgroundColor: colors.surface, 
                      borderColor: '#EF4444',
                      borderWidth: 1,
                    },
                    Shadows.sm,
                  ]}
                  onPress={() => {
                    Alert.alert(
                      'Sign Out',
                      'Are you sure you want to sign out?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Sign Out',
                          style: 'destructive',
                          onPress: async () => {
                            await signOut();
                          },
                        },
                      ]
                    );
                  }}>
                  <ThemedView style={styles.languageItemContent}>
                    <ThemedView style={[styles.languageIconContainer, { backgroundColor: '#FEE2E2' }]}>
                      <IconSymbol name="arrow.right.square" size={20} color="#EF4444" />
                    </ThemedView>
                    <ThemedText style={[styles.languageLabel, { color: '#EF4444', fontWeight: '600' }]}>
                      Sign Out
                    </ThemedText>
                  </ThemedView>
                </AnimatedButton>
              ) : null}
            </>
          ) : (
            <>
              {!showSignIn && !showSignUp && (
                <>
                  <AnimatedButton
                    style={[
                      styles.languageItem,
                      { 
                        backgroundColor: colors.surface, 
                        borderColor: tintColor,
                        borderWidth: 1,
                      },
                      Shadows.sm,
                    ]}
                    onPress={() => {
                      setShowSignIn(true);
                      setShowSignUp(false);
                      setAuthError(null);
                    }}>
                    <ThemedView style={styles.languageItemContent}>
                      <ThemedView style={[styles.languageIconContainer, { backgroundColor: colors.primaryLight }]}>
                        <IconSymbol name="person.fill" size={20} color={tintColor} />
                      </ThemedView>
                      <ThemedText style={[styles.languageLabel, { color: textColor, fontWeight: '600' }]}>
                        Sign In
                      </ThemedText>
                    </ThemedView>
                  </AnimatedButton>
                  
                  <AnimatedButton
                    style={[
                      styles.languageItem,
                      { 
                        backgroundColor: colors.surface, 
                        borderColor: tintColor,
                        borderWidth: 1,
                      },
                      Shadows.sm,
                    ]}
                    onPress={() => {
                      setShowSignUp(true);
                      setShowSignIn(false);
                      setAuthError(null);
                    }}>
                    <ThemedView style={styles.languageItemContent}>
                      <ThemedView style={[styles.languageIconContainer, { backgroundColor: colors.primaryLight }]}>
                        <IconSymbol name="person.badge.plus.fill" size={20} color={tintColor} />
                      </ThemedView>
                      <ThemedText style={[styles.languageLabel, { color: textColor, fontWeight: '600' }]}>
                        Sign Up
                      </ThemedText>
                    </ThemedView>
                  </AnimatedButton>
                </>
              )}

              {(showSignIn || showSignUp) && (
                <ThemedView style={styles.authForm}>
                  {authError && (
                    <View style={[styles.errorContainer, { backgroundColor: isDark ? '#7F1D1D' : '#FEE2E2' }]}>
                      <Text style={[styles.errorText, { color: isDark ? '#FCA5A5' : '#DC2626' }]}>
                        {authError}
                      </Text>
                    </View>
                  )}

                  {showSignUp && (
                    <ThemedView style={styles.inputContainer}>
                      <ThemedText style={[styles.inputLabel, { color: textColor }]}>Name</ThemedText>
                      <TextInput
                        style={[
                          styles.input,
                          {
                            backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                            borderColor: isDark ? '#334155' : '#E2E8F0',
                            color: textColor,
                          },
                        ]}
                        placeholder="Enter your name"
                        placeholderTextColor={textSecondary}
                        value={name}
                        onChangeText={setName}
                        autoCapitalize="words"
                        editable={!authLoading}
                      />
                    </ThemedView>
                  )}

                  <ThemedView style={styles.inputContainer}>
                    <ThemedText style={[styles.inputLabel, { color: textColor }]}>Email</ThemedText>
                    <TextInput
                      style={[
                        styles.input,
                        {
                          backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                          borderColor: isDark ? '#334155' : '#E2E8F0',
                          color: textColor,
                        },
                      ]}
                      placeholder="Enter your email"
                      placeholderTextColor={textSecondary}
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="email-address"
                      editable={!authLoading}
                    />
                  </ThemedView>

                  <ThemedView style={styles.inputContainer}>
                    <ThemedText style={[styles.inputLabel, { color: textColor }]}>Password</ThemedText>
                    <TextInput
                      style={[
                        styles.input,
                        {
                          backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                          borderColor: isDark ? '#334155' : '#E2E8F0',
                          color: textColor,
                        },
                      ]}
                      placeholder={showSignUp ? "Enter your password (min 6 characters)" : "Enter your password"}
                      placeholderTextColor={textSecondary}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                      autoCapitalize="none"
                      editable={!authLoading}
                    />
                  </ThemedView>

                  {showSignUp && (
                    <ThemedView style={styles.inputContainer}>
                      <ThemedText style={[styles.inputLabel, { color: textColor }]}>Confirm Password</ThemedText>
                      <TextInput
                        style={[
                          styles.input,
                          {
                            backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                            borderColor: isDark ? '#334155' : '#E2E8F0',
                            color: textColor,
                          },
                        ]}
                        placeholder="Confirm your password"
                        placeholderTextColor={textSecondary}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry
                        autoCapitalize="none"
                        editable={!authLoading}
                      />
                    </ThemedView>
                  )}

                  <AnimatedButton
                    style={[
                      styles.languageItem,
                      { 
                        backgroundColor: colors.primaryDark, 
                        borderColor: colors.primaryDark,
                        borderWidth: 1,
                      },
                      Shadows.sm,
                    ]}
                    onPress={showSignIn ? handleSignIn : handleSignUp}
                    disabled={authLoading}>
                    <ThemedView style={styles.languageItemContent}>
                      <ThemedText style={[styles.languageLabel, { color: '#FFFFFF', fontWeight: '700' }]}>
                        {authLoading ? (showSignIn ? 'Signing in...' : 'Creating account...') : (showSignIn ? 'Sign In' : 'Sign Up')}
                      </ThemedText>
                    </ThemedView>
                  </AnimatedButton>

                  <AnimatedButton
                    style={styles.cancelButton}
                    onPress={() => {
                      setShowSignIn(false);
                      setShowSignUp(false);
                      setEmail('');
                      setPassword('');
                      setName('');
                      setConfirmPassword('');
                      setAuthError(null);
                    }}
                    disabled={authLoading}>
                    <ThemedText style={[styles.cancelButtonText, { color: textSecondary }]}>
                      Cancel
                    </ThemedText>
                  </AnimatedButton>
                </ThemedView>
              )}
            </>
          )}
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  customHeader: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    minHeight: 60,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    flexShrink: 1,
  },
  headerRightSpacer: {
    width: 24,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    paddingTop: Spacing.md,
  },
  subtitle: {
    marginBottom: Spacing.lg,
    marginTop: 20,
    fontSize: Typography.fontSize.base,
    opacity: 0.7,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    marginBottom: Spacing.sm,
    fontSize: Typography.fontSize.xl,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  sectionDescription: {
    fontSize: Typography.fontSize.sm,
    opacity: 0.7,
    marginBottom: Spacing.md,
    lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.sm,
  },
  languageList: {
    gap: Spacing.md,
  },
  languageItem: {
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.md,
    minHeight: 44,
  },
  languageItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  languageIconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  languageLabel: {
    flex: 1,
    fontSize: Typography.fontSize.base,
  },
  checkIconContainer: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderItem: {
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    opacity: 0.6,
  },
  placeholderText: {
    fontSize: Typography.fontSize.sm,
    opacity: 0.7,
  },
  authForm: {
    gap: Spacing.md,
  },
  inputContainer: {
    gap: Spacing.sm,
  },
  inputLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    fontSize: Typography.fontSize.base,
    minHeight: 48,
  },
  errorContainer: {
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
  },
  errorText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
    textAlign: 'center',
  },
  cancelButton: {
    marginTop: Spacing.sm,
  },
  cancelButtonText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
    textAlign: 'center',
  },
  guestCard: {
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.lg,
    borderWidth: 1,
    gap: Spacing.md,
  },
  guestCardContent: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'flex-start',
  },
  guestIconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  guestTextContainer: {
    flex: 1,
    gap: Spacing.xs,
  },
  guestTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
  },
  guestDescription: {
    fontSize: Typography.fontSize.sm,
    lineHeight: Typography.fontSize.sm * Typography.lineHeight.relaxed,
  },
  guestButton: {
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  },
  guestButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
  },
});
