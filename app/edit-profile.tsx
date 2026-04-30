import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

const BLUE = '#0567A6';

type ProfileRow = {
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  email: string | null;
};

export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const { user } = useAuth();

  const bg = isDark ? '#0D0D0D' : '#F2F2F7';
  const card = '#1A1A1A';
  const border = '#2A2A2A';
  const textPrimary = '#FFFFFF';
  const textSecondary = '#888888';

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');

  const [initialFirstName, setInitialFirstName] = useState('');
  const [initialLastName, setInitialLastName] = useState('');
  const [initialDisplayName, setInitialDisplayName] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const hasChanges =
    firstName !== initialFirstName ||
    lastName !== initialLastName ||
    displayName !== initialDisplayName;

  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('first_name, last_name, display_name, email')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error loading profile', error);
          setEmail(user.email ?? '');
        } else if (data) {
          const fn = data.first_name ?? '';
          const ln = data.last_name ?? '';
          const dn = data.display_name ?? '';
          setFirstName(fn);
          setLastName(ln);
          setDisplayName(dn);
          setInitialFirstName(fn);
          setInitialLastName(ln);
          setInitialDisplayName(dn);
          setEmail(data.email ?? user.email ?? '');
        } else {
          setEmail(user.email ?? '');
        }
      } catch (e) {
        console.error('Unexpected error loading profile', e);
        setEmail(user?.email ?? '');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user?.id, user?.email]);

  const showSuccessToast = () => {
    if (Platform.OS === 'android') {
      ToastAndroid.show('Profile updated!', ToastAndroid.SHORT);
    } else {
      Alert.alert('Profile updated!');
    }
  };

  const handleSave = async () => {
    if (!user?.id || !hasChanges) return;
    try {
      setSaving(true);
      const updates = {
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        display_name: displayName.trim() || null,
      };

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) {
        console.error('Error updating profile', error);
        Alert.alert('Error', error.message || 'Failed to update profile.');
        return;
      }

      setInitialFirstName(firstName);
      setInitialLastName(lastName);
      setInitialDisplayName(displayName);

      showSuccessToast();
      router.back();
    } catch (e: any) {
      console.error('Unexpected error updating profile', e);
      Alert.alert('Error', e?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const initials = (() => {
    const source =
      (displayName || `${firstName} ${lastName}`.trim()) ||
      user?.email ||
      'PM';
    const parts = source.trim().split(/\s+/);
    const chars = parts.slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
    return chars || 'PM';
  })();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={bg} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.headerCancel}>Cancel</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Edit Profile</Text>

        <TouchableOpacity
          onPress={handleSave}
          disabled={!hasChanges || saving}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {saving ? (
            <ActivityIndicator size="small" color={BLUE} />
          ) : (
            <Text
              style={[
                styles.headerSave,
                { color: hasChanges ? BLUE : '#555555' },
              ]}
            >
              Save
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={BLUE} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={styles.changePhotoText}>Change Photo</Text>
            </TouchableOpacity>
          </View>

          {/* Fields card */}
          <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
            {/* First Name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>First Name</Text>
              <TextInput
                style={[
                  styles.input,
                  focusedField === 'firstName' && { borderColor: BLUE },
                ]}
                value={firstName}
                onChangeText={setFirstName}
                placeholder=""
                placeholderTextColor={textSecondary}
                onFocus={() => setFocusedField('firstName')}
                onBlur={() => setFocusedField((prev) => (prev === 'firstName' ? null : prev))}
              />
            </View>

            {/* Last Name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Last Name</Text>
              <TextInput
                style={[
                  styles.input,
                  focusedField === 'lastName' && { borderColor: BLUE },
                ]}
                value={lastName}
                onChangeText={setLastName}
                placeholder=""
                placeholderTextColor={textSecondary}
                onFocus={() => setFocusedField('lastName')}
                onBlur={() => setFocusedField((prev) => (prev === 'lastName' ? null : prev))}
              />
            </View>

            {/* Display Name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Display Name</Text>
              <TextInput
                style={[
                  styles.input,
                  focusedField === 'displayName' && { borderColor: BLUE },
                ]}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder=""
                placeholderTextColor={textSecondary}
                onFocus={() => setFocusedField('displayName')}
                onBlur={() => setFocusedField((prev) => (prev === 'displayName' ? null : prev))}
              />
              <Text style={styles.helperText}>
                This is how your name appears in the app
              </Text>
            </View>

            {/* Email - read only */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[
                  styles.input,
                  styles.emailInput,
                ]}
                value={email}
                editable={false}
                pointerEvents="none"
              />
              <Text style={styles.helperText}>Email cannot be changed</Text>
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  headerCancel: {
    color: '#888888',
    fontSize: 15,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  headerSave: {
    fontSize: 15,
    fontWeight: '600',
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: BLUE,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarInitials: {
    color: '#0D0D0D',
    fontSize: 28,
    fontWeight: '700',
  },
  changePhotoText: {
    color: BLUE,
    fontSize: 13,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
  },
  fieldGroup: {
    marginBottom: 20,
  },
  label: {
    color: '#888888',
    fontSize: 13,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 16,
    color: '#FFFFFF',
    fontSize: 15,
  },
  emailInput: {
    backgroundColor: '#111111',
    color: '#555555',
  },
  helperText: {
    marginTop: 6,
    color: '#555555',
    fontSize: 12,
  },
});

