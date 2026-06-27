import { useLayoutEffect, useState, useEffect, useCallback } from 'react';
import { StyleSheet, ScrollView, View, Text, TouchableOpacity, Switch, Alert, StatusBar, Linking } from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

import { useLanguage } from '@/contexts/LanguageContext';
import { useUnits, UnitSystem } from '@/contexts/UnitsContext';
import { Language } from '@/i18n';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { getDocumentCount } from '@/lib/documents';
import { COLORS, SPACING, RADIUS, TYPE, getColors } from '@/constants/DesignSystem';
import { ChunkyCard } from '@/components/ui/ChunkyCard';
import { getUserXP, getUserLevel, getStreak } from '@/lib/xpSystem';
import { getUserAchievements, BADGES, ALL_BADGE_IDS } from '@/lib/achievements';
import { startDriveDetection, stopDriveDetection, isDriveDetectionActive } from '@/lib/driveDetection';

export default function SettingsScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { language, setLanguage, t } = useLanguage();
  const { unitSystem, setUnitSystem } = useUnits();
  const { toggleTheme, isDark } = useTheme();
  const { signOut, profile, session, refreshProfile } = useAuth();
  const user = session?.user ?? null;
  const c = getColors();

  const [documentCount, setDocumentCount] = useState(0);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [serviceAlertsEnabled, setServiceAlertsEnabled] = useState(false);
  const [driveDetectionEnabled, setDriveDetectionEnabled] = useState(false);
  const [totalXP, setTotalXP] = useState(0);
  const [streakCount, setStreakCount] = useState(0);
  const [badgeCount, setBadgeCount] = useState(0);

  useEffect(() => {
    AsyncStorage.getItem('notificationsEnabled').then((v) => { if (v !== null) setNotificationsEnabled(JSON.parse(v)); });
    AsyncStorage.getItem('serviceAlertsEnabled').then((v) => { if (v !== null) setServiceAlertsEnabled(JSON.parse(v)); });
    AsyncStorage.getItem('drive_detection_enabled').then((v) => {
      if (v !== null) setDriveDetectionEnabled(v === 'true');
    });
  }, []);

  useEffect(() => {
    // If user previously enabled but the task isn't registered anymore, reflect that here.
    (async () => {
      if (!driveDetectionEnabled) return;
      const active = await isDriveDetectionActive();
      if (!active) setDriveDetectionEnabled(false);
    })();
  }, [driveDetectionEnabled]);

  useEffect(() => {
    if (!user?.id) return;
    getUserXP(user.id).then(setTotalXP).catch(() => {});
    getStreak(user.id).then((s) => setStreakCount(s.currentStreak)).catch(() => {});
    getUserAchievements(user.id).then((a) => setBadgeCount(a.length)).catch(() => {});
  }, [user?.id]);

  const toggleNotifications = async () => {
    if (!notificationsEnabled) {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please enable notifications in your device Settings.', [{ text: 'OK' }]);
        return;
      }
    }
    const v = !notificationsEnabled;
    setNotificationsEnabled(v);
    await AsyncStorage.setItem('notificationsEnabled', JSON.stringify(v));
  };

  const toggleServiceAlerts = async () => {
    const v = !serviceAlertsEnabled;
    setServiceAlertsEnabled(v);
    await AsyncStorage.setItem('serviceAlertsEnabled', JSON.stringify(v));
  };

  const toggleDriveDetection = async (value: boolean) => {
    if (value) {
      const success = await startDriveDetection();
      if (success) {
        setDriveDetectionEnabled(true);
        await AsyncStorage.setItem('drive_detection_enabled', 'true');
      } else {
        setDriveDetectionEnabled(false);
        await AsyncStorage.setItem('drive_detection_enabled', 'false');
        Alert.alert(
          'Location Permission Required',
          'Drive detection needs "Always Allow" location access to detect when you finish a drive. Please enable it in iOS Location Services.',
          [{ text: 'OK' }]
        );
      }
    } else {
      await stopDriveDetection();
      setDriveDetectionEnabled(false);
      await AsyncStorage.setItem('drive_detection_enabled', 'false');
    }
  };

  useFocusEffect(useCallback(() => { refreshProfile(); }, [refreshProfile]));
  useFocusEffect(useCallback(() => { getDocumentCount().then(setDocumentCount); }, []));

  useLayoutEffect(() => { navigation.setOptions({ headerShown: false }); }, [navigation]);

  const displayName = profile?.displayName?.trim() || profile?.name?.trim() || (user?.user_metadata as any)?.full_name || user?.email?.split('@')[0] || t.settings.guest;
  const displayEmail = profile?.email || user?.email || t.settings.notSignedIn;
  const avatarInitial = (displayName || 'G').charAt(0).toUpperCase();
  const isGuest = !user || user.is_anonymous;
  const levelInfo = getUserLevel(totalXP);

  const languageLabel = language === 'en' ? t.settings.english : language === 'fr' ? t.settings.french : t.settings.spanish;
  const cycleLanguage = async () => {
    const order: Language[] = ['en', 'fr', 'es'];
    await setLanguage(order[(order.indexOf(language) + 1) % order.length]);
  };
  const toggleUnits = async () => { await setUnitSystem(unitSystem === 'metric' ? 'imperial' : 'metric'); };

  const handleLogout = () => {
    Alert.alert(t.settings.logOut, t.settings.logOutConfirm, [
      { text: t.settings.cancel, style: 'cancel' },
      { text: t.settings.logOut, style: 'destructive', onPress: async () => { try { await signOut(); router.replace('/login'); } catch {} } },
    ]);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: COLORS.background }]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <View style={styles.headerRow}>
        <Text style={styles.screenTitle}>Settings</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <ChunkyCard noPadding style={styles.profileCard}>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{avatarInitial}</Text>
            </View>
            <View style={styles.profileText}>
              <Text style={[TYPE.h2, { color: c.text, marginBottom: 4 }]}>{displayName}</Text>
              <Text style={[TYPE.bodySM, { color: c.textSecondary, marginBottom: SPACING.sm }]}>{displayEmail}</Text>
              <View style={styles.levelPill}>
                <Text style={styles.levelPillText}>
                  Level {levelInfo.level} — {levelInfo.title}
                </Text>
              </View>
              {/* XP progress */}
              <View style={styles.xpBarWide}>
                <View style={[styles.xpBarTrackWide, { backgroundColor: COLORS.border }]}>
                  <View style={[styles.xpBarFillWide, { width: `${levelInfo.xpProgress * 100}%` }]} />
                </View>
                <Text style={[TYPE.labelSM, { color: c.textMuted, marginTop: 4 }]}>
                  {totalXP} / {levelInfo.xpForNext > 0 ? totalXP + levelInfo.xpForNext : totalXP} XP to Level {levelInfo.level + 1}
                </Text>
              </View>
              {!isGuest ? (
                <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/edit-profile')}>
                  <Text style={[TYPE.bodySM, { color: COLORS.primary, marginTop: SPACING.sm }]}>{t.settings.editProfile} →</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/login')}>
                  <Text style={[TYPE.bodySM, { color: COLORS.primary, marginTop: SPACING.sm }]}>{t.settings.signInToSync} →</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ChunkyCard>

        {/* Stats Overview */}
        <View style={styles.statsRow}>
          <ChunkyCard style={styles.statMini}>
            <Ionicons name="flame-outline" size={22} color={COLORS.primary} style={{ marginBottom: 4 }} />
            <Text style={[TYPE.statSM, { color: c.text }]}>{String(streakCount ?? 0)}</Text>
            <Text style={[TYPE.labelSM, { color: c.textSecondary }]}>Streak</Text>
          </ChunkyCard>
          <ChunkyCard style={styles.statMini}>
            <Ionicons name="flash-outline" size={22} color={COLORS.primary} style={{ marginBottom: 4 }} />
            <Text style={[TYPE.statSM, { color: c.text }]}>{String(totalXP ?? 0)}</Text>
            <Text style={[TYPE.labelSM, { color: c.textSecondary }]}>Total XP</Text>
          </ChunkyCard>
          <ChunkyCard style={styles.statMini}>
            <Ionicons name="ribbon-outline" size={22} color={COLORS.primary} style={{ marginBottom: 4 }} />
            <Text style={[TYPE.statSM, { color: c.text }]}>{String(badgeCount ?? 0)}</Text>
            <Text style={[TYPE.labelSM, { color: c.textSecondary }]}>Badges</Text>
          </ChunkyCard>
        </View>

        {/* Documents */}
        <Text style={styles.sectionHeading}>DOCUMENTS</Text>
        <ChunkyCard onPress={() => router.push('/documents')} style={styles.settingsCard}>
          <View style={styles.settingsRowInner}>
            <Ionicons name="document-text-outline" size={20} color={COLORS.amber} />
            <View style={{ flex: 1 }}>
              <Text style={[TYPE.body, { color: c.text }]}>My Documents</Text>
              <Text style={[TYPE.bodySM, { color: c.textSecondary }]}>Insurance, license & registration</Text>
            </View>
            {documentCount > 0 && (
              <View style={styles.badge}><Text style={styles.badgeText}>{documentCount}</Text></View>
            )}
            <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
          </View>
        </ChunkyCard>

        {/* Preferences */}
        <Text style={styles.sectionHeading}>{t.settings.preferences}</Text>
        <ChunkyCard noPadding style={styles.settingsGroup}>
          <SettingRow icon="globe-outline" label={t.settings.language} value={languageLabel} onPress={cycleLanguage} c={c} iconTint="#6B7280" />
          <View style={[styles.divider, { backgroundColor: c.divider }]} />
          <SettingRow icon="speedometer-outline" label={t.settings.units} value={unitSystem === 'metric' ? t.settings.kilometers : t.settings.miles} onPress={toggleUnits} c={c} iconTint="#6B7280" />
          <View style={[styles.divider, { backgroundColor: c.divider }]} />
          <SettingRow icon="moon-outline" label={t.settings.darkMode} c={c} iconTint="#6B7280"
            rightElement={<Switch value={isDark} onValueChange={toggleTheme} trackColor={{ false: COLORS.border, true: COLORS.amber }} thumbColor="#FFFFFF" ios_backgroundColor={COLORS.border} />}
          />
        </ChunkyCard>

        {/* Notifications */}
        <Text style={styles.sectionHeading}>{t.settings.notifications}</Text>
        <ChunkyCard noPadding style={styles.settingsGroup}>
          <SettingRow icon="notifications-outline" label={t.settings.maintenanceReminders} c={c}
            rightElement={<Switch value={notificationsEnabled} onValueChange={toggleNotifications} trackColor={{ false: COLORS.border, true: COLORS.amber }} thumbColor="#FFFFFF" ios_backgroundColor={COLORS.border} />}
          />
          <View style={[styles.divider, { backgroundColor: c.divider }]} />
          <SettingRow icon="construct-outline" label={t.settings.serviceAlerts} c={c}
            rightElement={<Switch value={serviceAlertsEnabled} onValueChange={toggleServiceAlerts} trackColor={{ false: COLORS.border, true: COLORS.amber }} thumbColor="#FFFFFF" ios_backgroundColor={COLORS.border} />}
          />
          <View style={[styles.divider, { backgroundColor: c.divider }]} />
          <SettingRow
            icon="location-outline"
            label="Drive Detection"
            c={c}
            rightElement={
              <Switch
                value={driveDetectionEnabled}
                onValueChange={toggleDriveDetection}
                trackColor={{ false: COLORS.border, true: COLORS.amber }}
                thumbColor="#FFFFFF"
                ios_backgroundColor={COLORS.border}
              />
            }
          />
          <Text
            style={{
              color: c.textSecondary,
              fontSize: 12,
              paddingHorizontal: SPACING.lg,
              marginTop: -2,
              marginBottom: SPACING.sm,
            }}
          >
            Get reminded to update mileage after each drive
          </Text>
        </ChunkyCard>

        {/* About */}
        <Text style={styles.sectionHeading}>{t.settings.about}</Text>
        <ChunkyCard noPadding style={styles.settingsGroup}>
          <SettingRow icon="information-circle-outline" label={t.settings.version} value="1.0.2" c={c} />
          <View style={[styles.divider, { backgroundColor: c.divider }]} />
          <SettingRow icon="star-outline" label={t.settings.rateApp} onPress={() => Linking.openURL('https://pocketmechanic.app')} c={c} />
          <View style={[styles.divider, { backgroundColor: c.divider }]} />
          <SettingRow icon="share-outline" label="Share with Friends" onPress={() => {}} c={c} />
          <View style={[styles.divider, { backgroundColor: c.divider }]} />
          <SettingRow icon="shield-checkmark-outline" label={t.settings.privacyPolicy} onPress={() => router.push('/privacy-policy')} c={c} />
          <View style={[styles.divider, { backgroundColor: c.divider }]} />
          <SettingRow icon="document-text-outline" label={t.settings.termsOfService} onPress={() => router.push('/terms-of-service')} c={c} />
        </ChunkyCard>

        {/* Danger Zone */}
        {!isGuest && (
          <View style={styles.dangerZone}>
            <TouchableOpacity style={[styles.logoutBtn, { borderColor: COLORS.heartRed }]} onPress={handleLogout} activeOpacity={0.8}>
              <Text style={[TYPE.h3, { color: COLORS.heartRed }]}>{t.settings.logOut}</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function SettingRow({ icon, label, value, onPress, rightElement, c, iconTint }: {
  icon: string; label: string; value?: string; onPress?: () => void;
  rightElement?: React.ReactNode; c: ReturnType<typeof getColors>;
  iconTint?: string;
}) {
  const inner = (
    <View style={styles.settingRow}>
      <View style={styles.settingRowLeft}>
        <View style={[styles.iconSquare, { backgroundColor: COLORS.amberLight }]}>
          <Ionicons name={icon as any} size={20} color={iconTint ?? COLORS.amber} />
        </View>
        <Text style={[TYPE.body, { fontFamily: 'Outfit_600SemiBold', fontSize: 16, color: COLORS.text }]}>{label}</Text>
      </View>
      {rightElement ?? (
        <View style={styles.settingRowRight}>
          {value ? <Text style={[TYPE.body, { color: COLORS.textLight }]}>{value}</Text> : null}
          {onPress ? <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} /> : null}
        </View>
      )}
    </View>
  );
  return onPress ? <TouchableOpacity activeOpacity={0.6} onPress={onPress}>{inner}</TouchableOpacity> : inner;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.lg, paddingBottom: SPACING.md },
  screenTitle: { fontFamily: 'Outfit_800ExtraBold', fontSize: 28, color: COLORS.text },
  sectionHeading: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 11,
    color: COLORS.textLight,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: SPACING.sm,
    marginTop: SPACING.lg,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.sm },

  profileCard: { marginBottom: SPACING.lg },
  profileRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: SPACING.xl, paddingHorizontal: SPACING.xl, gap: SPACING.lg },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontFamily: 'Outfit_700Bold', fontSize: 18, color: COLORS.primary },
  profileText: { flex: 1 },
  levelPill: { backgroundColor: COLORS.primaryLight, borderRadius: RADIUS.pill, paddingHorizontal: 12, paddingVertical: 5, alignSelf: 'flex-start', marginBottom: SPACING.sm },
  levelPillText: { ...TYPE.label, color: COLORS.primary },
  xpBarWide: { marginTop: 0 },
  xpBarTrackWide: { height: 8, borderRadius: 4, overflow: 'hidden' },
  xpBarFillWide: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 4 },

  statsRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  statMini: { flex: 1, alignItems: 'center', gap: 2 },
  settingsCard: { marginBottom: 0 },
  settingsRowInner: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  badge: { backgroundColor: '#1A6FBF', paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.pill },
  badgeText: { ...TYPE.labelSM, color: '#FFFFFF', fontSize: 11 },

  settingsGroup: { marginBottom: 0 },
  iconSquare: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: SPACING.lg },
  settingRowLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, flex: 1 },
  settingRowRight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  divider: { height: 1, marginLeft: 68 },

  dangerZone: { marginTop: SPACING.xxl },
  logoutBtn: { borderWidth: 0.5, borderBottomWidth: 0, borderRadius: RADIUS.sm, paddingVertical: SPACING.md, alignItems: 'center' },
});
