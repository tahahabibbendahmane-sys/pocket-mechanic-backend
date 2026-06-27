import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, TouchableOpacity, View, Text, StatusBar, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useAuth } from '@/contexts/AuthContext';
import { useActiveCar } from '@/contexts/ActiveCarContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatMileage, getUnitLabel } from '@/utils/formatting';
import { useUnits } from '@/contexts/UnitsContext';
import { TranslationKeys } from '@/i18n/en';
import { getMaintenanceLogs, getReminders } from '@/lib/maintenance';
import { fetchRecalls } from '@/lib/recalls';
import { supabase } from '@/lib/supabase';
import { calculateFuelStats, getFuelLogs, FuelStats } from '@/lib/fuelTracking';
import { useFocusEffect } from '@react-navigation/native';

import { Colors, SPACING, RADIUS, TYPE, getColors, CARD_SHADOW } from '@/constants/DesignSystem';
import { ChunkyCard } from '@/components/ui/ChunkyCard';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { XPBadge } from '@/components/ui/XPBadge';
import { calculateHealthScore } from '@/lib/healthScore';
import { getUserXP, getUserLevel, getStreak, checkIn, XP_REWARDS } from '@/lib/xpSystem';
import { XPPopup } from '@/components/ui/XPPopup';

const QUICK_ACTIONS = [
  { icon: 'construct-outline' as const, label: 'Log Service', route: '/(tabs)/maintenance' as const },
  { icon: 'chatbubble-ellipses-outline' as const, label: 'Ask Wrenchy', route: '/(tabs)/chatbot' as const },
  { icon: 'alarm-outline' as const, label: 'Reminders', route: '/(tabs)/maintenance' as const },
  { icon: 'car-sport-outline' as const, label: 'My Garage', route: '/(tabs)/garage' as const },
];

function getGreeting(t: TranslationKeys['home']): string {
  const hour = new Date().getHours();
  if (hour < 12) return t.goodMorning;
  if (hour < 17) return t.goodAfternoon;
  return t.goodEvening;
}

function healthStatusLine(score: number): string {
  if (score >= 80) return 'Vehicle is in good standing.';
  if (score >= 60) return 'Some maintenance items need attention.';
  return 'Service is overdue — review reminders.';
}

export default function DashboardScreen() {
  const router = useRouter();
  const { profile, user, refreshProfile } = useAuth();
  const { activeCar, isLoading } = useActiveCar();
  const { unitSystem } = useUnits();
  const { t } = useLanguage();
  const c = getColors();

  const [forceReady, setForceReady] = useState(false);
  useEffect(() => {
    const timeout = setTimeout(() => setForceReady(true), 5000);
    return () => clearTimeout(timeout);
  }, []);

  const [data, setData] = useState<{ logs: any[]; reminders: any[]; loaded: boolean }>({ logs: [], reminders: [], loaded: false });
  const [homeLogs, setHomeLogs] = useState<any[]>([]);
  const [homeReminders, setHomeReminders] = useState<any[]>([]);
  const [fuelStats, setFuelStats] = useState<FuelStats | null>(null);
  const [recallsCount, setRecallsCount] = useState(0);
  const [totalXP, setTotalXP] = useState(0);
  const [streak, setStreak] = useState({ currentStreak: 0, checkedInToday: false });
  const [xpPopup, setXpPopup] = useState<number | null>(null);
  const tips = useMemo(
    () => [
      'Check your tire pressure monthly. Properly inflated tires improve fuel economy by up to 3%.',
      'Change your engine oil every 5,000-7,500 km for optimal engine health.',
      'Inspect your brake pads every 20,000 km. Squealing sounds mean immediate replacement needed.',
      'Rotate your tires every 10,000 km to ensure even wear and extend their lifespan.',
      'Check your air filter every 15,000 km. A clogged filter reduces engine performance.',
      "Test your battery every year if it's over 3 years old.",
      'Keep your gas tank above 1/4 full to protect your fuel pump.',
      'Inspect belts and hoses every 50,000 km to prevent breakdowns.',
      "Use the correct engine oil viscosity from your owner's manual.",
      'Top up windshield washer fluid regularly for clear visibility.',
    ],
    []
  );
  const [tipIndex, setTipIndex] = useState(Math.floor(Date.now() / 86400000) % 10);

  const vehicleId = activeCar?.id;

  useEffect(() => {
    if (!vehicleId) {
      setData({ logs: [], reminders: [], loaded: true });
      return;
    }
    let cancelled = false;
    const timeout = setTimeout(() => {
      if (!cancelled) setData((d) => ({ ...d, loaded: true }));
    }, 5000);
    (async () => {
      try {
        const [logs, reminders] = await Promise.all([getMaintenanceLogs(vehicleId), getReminders(vehicleId)]);
        if (!cancelled) setData({ logs: logs ?? [], reminders: reminders ?? [], loaded: true });
      } catch (e) {
        console.error(e);
        if (!cancelled) setData({ logs: [], reminders: [], loaded: true });
      } finally {
        clearTimeout(timeout);
      }
    })();
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [vehicleId]);

  useEffect(() => {
    if (!activeCar?.id) return;
    let cancelled = false;
    const timeout = setTimeout(() => {
      if (!cancelled) {
        setHomeLogs([]);
        setHomeReminders([]);
      }
    }, 5000);
    (async () => {
      try {
        const [{ data: logs, error: e1 }, { data: rem, error: e2 }] = await Promise.all([
          supabase.from('maintenance_logs').select('*').eq('vehicle_id', activeCar.id).order('created_at', { ascending: false }),
          supabase.from('maintenance_reminders').select('*').eq('vehicle_id', activeCar.id).eq('is_completed', false),
        ]);
        if (e1) throw e1;
        if (e2) throw e2;
        if (!cancelled) {
          setHomeLogs(logs ?? []);
          setHomeReminders(rem ?? []);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setHomeLogs([]);
          setHomeReminders([]);
        }
      } finally {
        clearTimeout(timeout);
      }
    })();
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [activeCar?.id]);

  useEffect(() => {
    if (!activeCar?.id) {
      setFuelStats(null);
      return;
    }
    let cancelled = false;
    const loadFuel = async () => {
      try {
        const fuelLogs = await getFuelLogs(activeCar.id);
        if (cancelled) return;
        setFuelStats(fuelLogs.length > 0 ? calculateFuelStats(fuelLogs) : null);
      } catch {
        if (!cancelled) setFuelStats(null);
      }
    };
    void loadFuel();
    return () => {
      cancelled = true;
    };
  }, [activeCar?.id]);

  useEffect(() => {
    if (!activeCar?.make || !activeCar?.model || !activeCar?.year) {
      setRecallsCount(0);
      return;
    }
    let cancelled = false;
    fetchRecalls(activeCar.make, activeCar.model, activeCar.year)
      .then((list) => {
        if (!cancelled) setRecallsCount(list?.length ?? 0);
      })
      .catch(() => {
        if (!cancelled) setRecallsCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, [activeCar?.make, activeCar?.model, activeCar?.year]);

  useEffect(() => {
    if (!user?.id) return;
    getUserXP(user.id).then(setTotalXP).catch(() => {});
    getStreak(user.id)
      .then((s) => setStreak({ currentStreak: s.currentStreak, checkedInToday: s.checkedInToday }))
      .catch(() => {});
  }, [user?.id]);

  useFocusEffect(useCallback(() => {
    refreshProfile();
  }, [refreshProfile]));

  const recentLogs = useMemo(() => data.logs.slice(0, 3), [data.logs]);

  const daysSinceLastService = useMemo(() => {
    const mostRecent = data.logs[0];
    if (!mostRecent?.date) return null;
    const logDate = new Date(mostRecent.date);
    if (Number.isNaN(logDate.getTime())) return null;
    return Math.floor((Date.now() - logDate.getTime()) / (1000 * 60 * 60 * 24));
  }, [data.logs]);

  const nextReminder = useMemo(() => {
    if (!activeCar?.id || data.reminders.length === 0) return null;
    const scored = data.reminders.map((r: any) => {
      const mk = r.due_miles ?? Number.POSITIVE_INFINITY;
      const dk = r.due_date ? new Date(r.due_date).getTime() : Number.POSITIVE_INFINITY;
      return { r, sortKey: Math.min(mk, dk) };
    });
    scored.sort((a: any, b: any) => a.sortKey - b.sortKey);
    return scored[0].r ?? null;
  }, [activeCar?.id, data.reminders]);

  const healthResult = activeCar ? calculateHealthScore(activeCar, homeLogs, homeReminders) : null;
  const healthScore = healthResult?.score ?? 100;
  const levelInfo = getUserLevel(totalXP);

  const totalSpent = useMemo(() => data.logs.reduce((s: number, l: any) => s + (l.cost ?? 0), 0), [data.logs]);

  const lastServiceDisplay =
    daysSinceLastService != null ? (daysSinceLastService === 0 ? 'Today' : `${daysSinceLastService}d`) : '--';
  const spentDisplay =
    !data.loaded ? '--' : data.logs.length === 0 && totalSpent === 0 ? '--' : `$${totalSpent.toLocaleString()}`;
  const levelDisplay = `Lvl ${levelInfo.level}`;

  const displayName =
    profile?.displayName?.trim() ||
    profile?.name?.trim() ||
    (user?.user_metadata as any)?.full_name ||
    user?.email?.split('@')[0] ||
    t.home.driver;

  const handleCheckIn = async () => {
    if (!user?.id || streak.checkedInToday) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const result = await checkIn(user.id);
    setStreak({ currentStreak: result.streak, checkedInToday: true });
    setTotalXP((prev) => prev + result.xpEarned);
    setXpPopup(result.xpEarned);
  };

  const formatRelativeDate = (dateStr: string): string => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    const diff = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diff <= 0) return 'Today';
    if (diff === 1) return '1 day ago';
    if (diff < 7) return `${diff} days ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const formatDaysAgo = (dateStr: string): string => {
    if (!dateStr) return '0 days ago';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '0 days ago';
    const diff = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
    const safe = Math.max(0, diff);
    if (safe === 1) return '1 day ago';
    return `${safe} days ago`;
  };

  const fuelCardData = useMemo(() => {
    if (!fuelStats) return null;
    if (fuelStats.fillUpCount <= 0) return null;
    if (!fuelStats.lastFillUp?.date) return null;
    return {
      avgConsumption: fuelStats.avgConsumption,
      lastFillDate: fuelStats.lastFillUp.date,
    };
  }, [fuelStats]);

  if (isLoading && !forceReady) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={['top']}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.loadingWrap}>
          <Text style={[TYPE.body, { color: c.textMuted }]}>{t.home.loading}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={c.background} />

      {xpPopup != null && <XPPopup amount={xpPopup} onComplete={() => setXpPopup(null)} />}

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>{getGreeting(t.home)}</Text>
            <Text style={styles.nameTitle}>{displayName}</Text>
          </View>
          <XPBadge xp={totalXP} />
        </View>

        {activeCar ? (
          <>
            <TouchableOpacity
              activeOpacity={0.92}
              onPress={() => router.push({ pathname: '/vehicle-detail', params: { vehicleId: activeCar.id } })}
              style={styles.vehicleCard}
            >
              <View style={styles.vehicleCardInner}>
                <View style={styles.vehicleCardRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.vehicleTitle}>
                      {[activeCar.make?.trim(), activeCar.model?.trim()].filter(Boolean).join(' ')}
                    </Text>
                    <Text style={styles.vehicleSub}>
                      {[activeCar.year, activeCar.nickname?.trim()].filter(Boolean).join(' · ') || String(activeCar.year ?? '')}
                    </Text>
                    <Text style={styles.healthCaption}>{healthStatusLine(healthScore)}</Text>
                    {healthResult?.issues?.length ? (
                      <View style={styles.issuesBlock}>
                        {healthResult.issues.slice(0, 3).map((issue: string, i: number) => (
                          <Text key={i} style={styles.issueLine}>
                            • {issue}
                          </Text>
                        ))}
                      </View>
                    ) : null}
                  </View>
                  <ProgressRing
                    score={healthScore}
                    size={88}
                    strokeWidth={5}
                    label={healthScore >= 80 ? 'Good' : healthScore >= 60 ? 'Fair' : 'Low'}
                  />
                </View>
                <Text style={[TYPE.caption, { color: Colors.textMuted, marginTop: SPACING.sm }]}>
                  {formatMileage(activeCar.mileage ?? 0, unitSystem)} {getUnitLabel(unitSystem)}
                </Text>
                <View style={styles.levelBar}>
                  <View style={[styles.levelBarTrack, { backgroundColor: Colors.border }]}>
                    <View style={[styles.levelBarFill, { width: `${levelInfo.xpProgress * 100}%` }]} />
                  </View>
                  <Text style={[TYPE.caption, { color: Colors.textMuted }]}>
                    Level {levelInfo.level} · {levelInfo.title}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            {!streak.checkedInToday && user?.id && (
              <TouchableOpacity activeOpacity={0.9} onPress={handleCheckIn} style={styles.streakBanner}>
                <Ionicons name="flame-outline" size={22} color={Colors.warning} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.streakCount}>{streak.currentStreak} day streak</Text>
                  <Text style={styles.streakSub}>Tap to check in</Text>
                </View>
                <View style={styles.streakXpPill}>
                  <Text style={styles.streakXpPillText}>+10 XP</Text>
                </View>
              </TouchableOpacity>
            )}

            <Text style={styles.sectionLabel}>Overview</Text>
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{lastServiceDisplay}</Text>
                <Text style={styles.statLabel}>Last Service</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{spentDisplay}</Text>
                <Text style={styles.statLabel}>Total Spent</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{levelDisplay}</Text>
                <Text style={styles.statLabel} numberOfLines={1}>
                  {levelInfo.title}
                </Text>
              </View>
            </View>

            <Text style={styles.sectionLabel}>Quick actions</Text>
            <View style={styles.quickGrid}>
              {QUICK_ACTIONS.map((action) => (
                <TouchableOpacity
                  key={action.label}
                  activeOpacity={0.85}
                  style={styles.quickCard}
                  onPress={() => router.push(action.route as any)}
                >
                  <Ionicons name={action.icon} size={26} color={Colors.primary} />
                  <Text style={styles.quickLabel}>{action.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <ChunkyCard onPress={() => router.push('/add-fuel')} style={{ marginTop: SPACING.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Ionicons name="water-outline" size={26} color={Colors.primary} />
                  <View>
                    <Text style={TYPE.cardValue}>Log fill-up</Text>
                    <Text style={TYPE.caption}>Track fuel economy and costs</Text>
                  </View>
                </View>
                <View style={styles.xpHint}>
                  <Text style={styles.xpHintText}>+{XP_REWARDS.LOG_FUEL} XP</Text>
                </View>
              </View>
            </ChunkyCard>

            {fuelCardData && (
              <ChunkyCard onPress={() => router.push('/fuel-dashboard')} style={{ marginTop: SPACING.sm }}>
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: SPACING.sm }}>
                    <Text style={[TYPE.cardValue, { flex: 1 }]}>
                      {fuelCardData.avgConsumption > 0 ? `${fuelCardData.avgConsumption.toFixed(1)} L/100km` : '—'}
                    </Text>
                    <Text style={[TYPE.caption, { color: Colors.textSecondary }]}>
                      Last fill: {formatDaysAgo(fuelCardData.lastFillDate)}
                    </Text>
                  </View>
                  <Text style={[TYPE.caption, { color: Colors.primary, marginTop: 8 }]}>View fuel dashboard</Text>
                </View>
              </ChunkyCard>
            )}

            {data.loaded && nextReminder && (
              <ChunkyCard onPress={() => router.push('/(tabs)/maintenance')} style={{ marginTop: SPACING.sm }}>
                <View style={styles.nextServiceRow}>
                  <Ionicons name="build-outline" size={22} color={Colors.primary} />
                  <View style={styles.nextServiceInfo}>
                    <Text style={TYPE.caption}>Next service</Text>
                    <Text style={TYPE.cardValue}>{nextReminder.service_name}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
                </View>
              </ChunkyCard>
            )}

            {data.loaded && recentLogs.length > 0 && (
              <>
                <Text style={[styles.sectionLabel, { marginTop: SPACING.lg }]}>Recent activity</Text>
                <ChunkyCard noPadding>
                  {recentLogs.map((log: any, idx: number) => (
                    <View key={log.id}>
                      <View style={styles.activityRow}>
                        <Ionicons name="construct-outline" size={18} color={Colors.primary} />
                        <View style={styles.activityInfo}>
                          <Text style={[TYPE.body, { color: c.text }]} numberOfLines={1}>
                            {log.service_name}
                          </Text>
                          <Text style={[TYPE.caption, { color: Colors.textSecondary }]}>{formatRelativeDate(log.date)}</Text>
                        </View>
                        <Text style={styles.xpMiniText}>+{XP_REWARDS.LOG_SERVICE} XP</Text>
                      </View>
                      {idx < recentLogs.length - 1 && <View style={[styles.activityDivider, { backgroundColor: c.divider }]} />}
                    </View>
                  ))}
                </ChunkyCard>
              </>
            )}

            <ChunkyCard style={{ marginTop: SPACING.xl }}>
              <View style={styles.wrenchyTipHeader}>
                <Ionicons name="information-circle-outline" size={22} color={Colors.primary} />
                <Text style={TYPE.cardValue}>Maintenance tip</Text>
              </View>
              <Text style={styles.wrenchyTipText}>{tips[tipIndex]}</Text>
              <TouchableOpacity
                onPress={() => setTipIndex((tipIndex + 1) % tips.length)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={{ alignSelf: 'flex-end', marginTop: SPACING.sm }}
              >
                <Text style={[TYPE.caption, { color: Colors.primary }]}>Next tip</Text>
              </TouchableOpacity>
            </ChunkyCard>
          </>
        ) : (
          <ChunkyCard style={styles.emptyCard}>
            <Ionicons name="car-sport-outline" size={48} color={Colors.primary} style={{ marginBottom: SPACING.md }} />
            <Text style={[TYPE.h2, { color: c.text, textAlign: 'center' }]}>Add your first vehicle</Text>
            <Text style={[TYPE.body, { color: c.textSecondary, textAlign: 'center', marginTop: SPACING.sm }]}>
              Track maintenance, earn XP, and keep your car healthy.
            </Text>
            <TouchableOpacity style={styles.addCarBtn} activeOpacity={0.85} onPress={() => router.push('/vehicle-form')}>
              <Text style={styles.addCarBtnText}>{t.home.addVehicle}</Text>
            </TouchableOpacity>
          </ChunkyCard>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingHorizontal: SPACING.xl, paddingBottom: 160 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: SPACING.sm, marginBottom: SPACING.lg },
  headerLeft: { flex: 1, marginRight: SPACING.md },
  greeting: { fontFamily: 'Outfit_400Regular', fontSize: 13, color: Colors.textMuted },
  nameTitle: { fontFamily: 'Outfit_700Bold', fontSize: 28, color: Colors.textPrimary, marginTop: 4 },

  sectionLabel: {
    ...TYPE.sectionHeader,
    marginBottom: 10,
    marginTop: 8,
  },

  vehicleCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: Colors.border,
    marginBottom: SPACING.lg,
    overflow: 'hidden',
    ...CARD_SHADOW,
  },
  vehicleCardInner: { padding: SPACING.lg },
  vehicleCardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  vehicleTitle: { fontFamily: 'Outfit_600SemiBold', fontSize: 17, color: Colors.textPrimary },
  vehicleSub: { fontFamily: 'Outfit_400Regular', fontSize: 13, color: Colors.textMuted, marginTop: 4 },
  healthCaption: { fontFamily: 'Outfit_400Regular', fontSize: 14, color: Colors.textSecondary, marginTop: SPACING.sm, lineHeight: 20 },
  issuesBlock: { marginTop: SPACING.sm, gap: 4 },
  issueLine: { ...TYPE.caption, color: Colors.textSecondary },
  levelBar: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.md },
  levelBarTrack: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  levelBarFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 2 },

  streakBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: Colors.surfaceSecondary,
    marginBottom: SPACING.lg,
  },
  streakCount: { fontFamily: 'Outfit_600SemiBold', fontSize: 15, color: Colors.textPrimary },
  streakSub: { fontFamily: 'Outfit_400Regular', fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  streakXpPill: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  streakXpPillText: { fontFamily: 'Outfit_600SemiBold', fontSize: 13, color: Colors.primary },

  statsRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  statCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: Colors.border,
    paddingVertical: 14,
    paddingHorizontal: 6,
    ...CARD_SHADOW,
  },
  statValue: { fontFamily: 'Outfit_600SemiBold', fontSize: 18, color: Colors.textPrimary, textAlign: 'center' },
  statLabel: { fontFamily: 'Outfit_400Regular', fontSize: 12, color: Colors.textMuted, marginTop: 4, textAlign: 'center' },

  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: SPACING.md },
  quickCard: {
    width: '47%',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: Colors.border,
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginBottom: SPACING.sm,
    ...CARD_SHADOW,
  },
  quickLabel: { fontFamily: 'Outfit_600SemiBold', fontSize: 14, color: Colors.textPrimary, textAlign: 'center', marginTop: SPACING.sm },

  xpHint: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  xpHintText: { fontFamily: 'Outfit_600SemiBold', fontSize: 11, color: Colors.primary },

  nextServiceRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  nextServiceInfo: { flex: 1, gap: 2 },

  activityRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
  activityInfo: { flex: 1, gap: 1 },
  activityDivider: { height: 1, marginLeft: 52 },
  xpMiniText: { fontFamily: 'Outfit_600SemiBold', fontSize: 11, color: Colors.primary },

  wrenchyTipHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  wrenchyTipText: { ...TYPE.body, marginTop: 4 },

  emptyCard: { marginTop: 48, alignItems: 'center', paddingVertical: SPACING.xxxl },
  addCarBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: SPACING.xxl,
    marginTop: SPACING.xl,
    width: '100%',
    alignItems: 'center',
  },
  addCarBtnText: { ...TYPE.button, color: Colors.surface },
});
