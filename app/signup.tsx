import { useState } from 'react';
import { StyleSheet, TextInput, KeyboardAvoidingView, Platform, ScrollView, View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemeColors, Spacing, BorderRadius, Typography, Shadows } from '@/constants/theme-enhanced';
import { AnimatedButton } from '@/components/AnimatedButton';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { supabase } from '@/lib/supabase';

export default function SignUpScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const colors = ThemeColors[theme];

  const handleSignUp = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      // Sign up with Supabase
      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
      });

      if (authError) {
        setError(authError.message || 'Failed to create account. Please try again.');
        setLoading(false);
        return;
      }

      // Create profile if user was created
      if (data.user) {
        // Wait a moment for potential trigger
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Create/update profile
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            email: email.trim(),
            name: name.trim(),
          }, {
            onConflict: 'id'
          });

        if (profileError) {
          console.error('Error creating profile:', profileError);
          // Don't fail signup if profile creation fails
        }

        // Redirect to main app
        router.replace('/(tabs)');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    router.replace('/login');
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
              Create Account
            </ThemedText>
            <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
              Join Pocket Mechanic
            </ThemedText>
          </ThemedView>

          <ThemedView style={styles.form}>
            <ThemedView style={styles.inputContainer}>
              <ThemedText style={[styles.label, { color: colors.text }]}>Name</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                    borderColor: isDark ? '#334155' : '#E2E8F0',
                    color: colors.text,
                  },
                ]}
                placeholder="Enter your name"
                placeholderTextColor={colors.textSecondary}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                editable={!loading}
              />
            </ThemedView>

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
                placeholder="Enter your password (min 6 characters)"
                placeholderTextColor={colors.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                editable={!loading}
              />
            </ThemedView>

            <ThemedView style={styles.inputContainer}>
              <ThemedText style={[styles.label, { color: colors.text }]}>Confirm Password</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                    borderColor: isDark ? '#334155' : '#E2E8F0',
                    color: colors.text,
                  },
                ]}
                placeholder="Confirm your password"
                placeholderTextColor={colors.textSecondary}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
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
              onPress={handleSignUp}
              disabled={loading}>
              <ThemedView style={styles.buttonContent}>
                {loading ? (
                  <View style={styles.loadingContainer}>
                    <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>Creating account...</Text>
                  </View>
                ) : (
                  <ThemedText style={[styles.buttonText, { color: '#FFFFFF' }]}>
                    Sign Up
                  </ThemedText>
                )}
              </ThemedView>
            </AnimatedButton>

            <AnimatedButton
              style={[styles.button, styles.secondaryButton, { borderColor: colors.primary }]}
              onPress={handleLogin}
              disabled={loading}>
              <ThemedView style={styles.buttonContent}>
                <ThemedText style={[styles.secondaryButtonText, { color: colors.primary }]}>
                  Sign In
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
});
