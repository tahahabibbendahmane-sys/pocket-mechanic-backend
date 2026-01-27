import { useState } from 'react';
import { StyleSheet, TextInput, Alert, KeyboardAvoidingView, Platform, ScrollView, View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemeColors, Spacing, BorderRadius, Typography, Shadows } from '@/constants/theme-enhanced';
import { AnimatedButton } from '@/components/AnimatedButton';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { supabase } from '@/lib/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const colors = ThemeColors[theme];

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (authError) {
        setError(authError.message || 'Failed to sign in. Please check your credentials.');
      } else {
        // Redirect to main app
        router.replace('/chatbot');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = () => {
    router.push('/signup');
  };

  const handleGuestMode = async () => {
    setError(null);
    setLoading(true);

    try {
      const { error: authError } = await supabase.auth.signInAnonymously();

      if (authError) {
        Alert.alert('Guest mode is not enabled on the server.');
      } else {
        // The existing Auth Listener should automatically detect the new session and redirect
        // No need to manually redirect here
      }
    } catch (err) {
      Alert.alert('Guest mode is not enabled on the server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        <ThemedView style={styles.content}>
          <ThemedView style={styles.header}>
            <IconSymbol name="wrench.and.screwdriver.fill" size={64} color={colors.primary} />
            <ThemedText style={[styles.title, { color: colors.text }]}>
              Pocket Mechanic
            </ThemedText>
            <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
              Sign in to continue
            </ThemedText>
          </ThemedView>

          <ThemedView style={styles.form}>
            <ThemedView style={styles.inputContainer}>
              <ThemedText style={[styles.label, { color: colors.text }]}>Email</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                    borderColor: isDark ? '#334155' : '#E2E8F0',
                    color: colors.text,
                  },
                ]}
                placeholder="Enter your email"
                placeholderTextColor={colors.textSecondary}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                editable={!loading}
              />
            </ThemedView>

            <ThemedView style={styles.inputContainer}>
              <ThemedText style={[styles.label, { color: colors.text }]}>Password</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                    borderColor: isDark ? '#334155' : '#E2E8F0',
                    color: colors.text,
                  },
                ]}
                placeholder="Enter your password"
                placeholderTextColor={colors.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                editable={!loading}
              />
            </ThemedView>

            {error && (
              <View style={[styles.errorContainer, { backgroundColor: isDark ? '#7F1D1D' : '#FEE2E2' }]}>
                <Text style={[styles.errorText, { color: isDark ? '#FCA5A5' : '#DC2626' }]}>
                  {error}
                </Text>
              </View>
            )}

            <AnimatedButton
              style={[styles.button, { backgroundColor: colors.primaryDark }, Shadows.md]}
              onPress={handleLogin}
              disabled={loading}>
              <ThemedView style={styles.buttonContent}>
                {loading ? (
                  <View style={styles.loadingContainer}>
                    <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>Signing in...</Text>
                  </View>
                ) : (
                  <ThemedText style={[styles.buttonText, { color: '#FFFFFF' }]}>
                    Sign In
                  </ThemedText>
                )}
              </ThemedView>
            </AnimatedButton>

            <AnimatedButton
              style={[styles.button, styles.secondaryButton, { borderColor: colors.primary }]}
              onPress={handleSignUp}
              disabled={loading}>
              <ThemedView style={styles.buttonContent}>
                <ThemedText style={[styles.secondaryButtonText, { color: colors.primary }]}>
                  Sign Up
                </ThemedText>
              </ThemedView>
            </AnimatedButton>

            <AnimatedButton
              style={[styles.button, styles.guestButton]}
              onPress={handleGuestMode}
              disabled={loading}>
              <ThemedView style={styles.buttonContent}>
                <ThemedText style={[styles.guestButtonText, { color: colors.textSecondary }]}>
                  Continue as Guest
                </ThemedText>
              </ThemedView>
            </AnimatedButton>
          </ThemedView>
        </ThemedView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    padding: Spacing.xl,
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  title: {
    fontSize: Typography.fontSize['3xl'],
    fontWeight: '900',
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.fontSize.base,
    opacity: 0.7,
  },
  form: {
    gap: Spacing.lg,
  },
  inputContainer: {
    gap: Spacing.sm,
  },
  label: {
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
  button: {
    borderRadius: BorderRadius['2xl'],
    overflow: 'hidden',
    marginTop: Spacing.md,
  },
  buttonContent: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
  },
  errorContainer: {
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.sm,
  },
  errorText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
    textAlign: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    borderWidth: 2,
    backgroundColor: 'transparent',
    marginTop: Spacing.sm,
  },
  secondaryButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
  },
  guestButton: {
    borderWidth: 0,
    backgroundColor: 'transparent',
    marginTop: Spacing.xs,
  },
  guestButtonText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '500',
    opacity: 0.7,
  },
});
