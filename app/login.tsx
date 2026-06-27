import { useState, useRef } from 'react';
import {
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { signInWithGoogle, signInWithApple } from '@/lib/auth';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useLanguage } from '@/contexts/LanguageContext';
import { COLORS } from '@/constants/DesignSystem';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const passwordRef = useRef<TextInput>(null);
  const { t } = useLanguage();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError(t.auth.errorBothFields);
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
        setError(authError.message || t.auth.errorSignIn);
      } else {
        router.replace('/(tabs)');
      }
    } catch (err) {
      setError(t.auth.errorUnexpected);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = () => {
    router.push('/signup');
  };

  const handleGuestLogin = () => {
    router.replace('/(tabs)');
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    const { data, error: googleError } = await signInWithGoogle();
    if (googleError) {
      Alert.alert('Sign-In Failed', (googleError as Error).message || 'Could not sign in with Google');
    } else {
      router.replace('/(tabs)');
    }
    setGoogleLoading(false);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* Radial glow */}
      <LinearGradient
        colors={['rgba(245, 166, 35, 0.08)', 'transparent']}
        style={styles.glow}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo + Branding */}
          <View style={styles.brandSection}>
            <View style={styles.logoBox}>
              <Ionicons name="car-sport-outline" size={40} color={COLORS.blue} />
            </View>
            <Text style={styles.appName}>{t.auth.appName}</Text>
            <Text style={styles.tagline}>{t.auth.tagline}</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>{t.auth.email}</Text>
              <TextInput
                style={[
                  styles.input,
                  emailFocused && styles.inputFocused,
                ]}
                placeholder={t.auth.emailPlaceholder}
                placeholderTextColor={COLORS.textMuted}
                value={email}
                onChangeText={setEmail}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                editable={!loading}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>{t.auth.password}</Text>
              <TextInput
                ref={passwordRef}
                style={[
                  styles.input,
                  passwordFocused && styles.inputFocused,
                ]}
                placeholder={t.auth.passwordPlaceholder}
                placeholderTextColor={COLORS.textMuted}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                secureTextEntry
                autoCapitalize="none"
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                editable={!loading}
              />
            </View>

            {error && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color="#FF6B6B" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
              onPress={handleLogin}
              activeOpacity={0.85}
              disabled={loading}
            >
              <Text style={styles.primaryBtnText}>
                {loading ? t.auth.signingIn : t.auth.signIn}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={handleSignUp}
              activeOpacity={0.85}
              disabled={loading}
            >
              <Text style={styles.secondaryBtnText}>{t.auth.signUp}</Text>
            </TouchableOpacity>

            {Platform.select({ ios: true, default: false }) && (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                cornerRadius={14}
                style={{ width: '100%', height: 52, marginBottom: 12 }}
                onPress={async () => {
                  setLoading(true);
                  const { data, error } = await signInWithApple();
                  if (error) {
                    Alert.alert('Sign-In Failed', (error as Error).message || 'Could not sign in with Apple');
                  } else if (data) {
                    router.replace('/(tabs)');
                  }
                  setLoading(false);
                }}
              />
            )}

            <TouchableOpacity
              style={[styles.secondaryBtn, styles.googleBtn]}
              onPress={handleGoogleSignIn}
              activeOpacity={0.85}
              disabled={loading || googleLoading}
            >
              {googleLoading ? (
                <ActivityIndicator color="#000000" />
              ) : (
                <Text style={styles.secondaryBtnText}>Continue with Google</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.guestLink}
              onPress={handleGuestLogin}
              activeOpacity={0.7}
              disabled={loading}
            >
              <Text style={styles.guestLinkText}>{t.auth.continueAsGuest}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  flex: {
    flex: 1,
  },
  glow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 400,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },

  // Branding
  brandSection: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoBox: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  appName: {
    color: COLORS.text,
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  tagline: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: '400',
  },

  // Form
  form: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  fieldGroup: {
    marginBottom: 20,
  },
  label: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 16,
    color: COLORS.text,
    fontSize: 15,
  },
  inputFocused: {
    borderColor: COLORS.blue,
  },

  // Error
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 8,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },

  // Buttons
  primaryBtn: {
    width: '100%',
    height: 52,
    backgroundColor: COLORS.blue,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  primaryBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryBtn: {
    width: '100%',
    height: 52,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  secondaryBtnText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '500',
  },
  googleBtn: {
    marginTop: 12,
  },
  guestLink: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 8,
  },
  guestLinkText: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
});
