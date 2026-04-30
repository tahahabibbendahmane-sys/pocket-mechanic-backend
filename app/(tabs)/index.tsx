import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, TouchableOpacity, View, Text, StatusBar, ScrollView, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useAuth } from '@/contexts/AuthContext';
import { useActiveCar } from '@/contexts/ActiveCarContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { hasOverdueServices, hasDueSoonServices } from '@/utils/maintenance-status';
import { calculateHealthScore } from '@/lib/healthScore';
import { formatMileage, getUnitLabel } from '@/utils/formatting';
import { useUnits } from '@/contexts/UnitsContext';
import { TranslationKeys } from '@/i18n/en';
import { getMaintenanceLogs, getReminders } from '@/lib/maintenance';
import { fetchRecalls } from '@/lib/recalls';
import { supabase } from '@/lib/supabase';
import { calculateFuelStats, getFuelLogs, FuelStats } from '@/lib/fuelTracking';
import { useFocusEffect } from '@react-navigation/native';

import { COLORS, SPACING, RADIUS, SHADOWS, TYPE, getColors } from '@/constants/DesignSystem';
import { ChunkyCard } from '@/components/ui/ChunkyCard';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { XPBadge } from '@/components/ui/XPBadge';
import { StreakBadge } from '@/components/ui/StreakBadge';
import { getUserXP, getUserLevel, getStreak, checkIn, XP_REWARDS } from '@/lib/xpSystem';
import { XPPopup } from '@/components/ui/XPPopup';

const RECOMMENDED_ACTIONS = [
  { icon: 'document-text-outline' as const, label: 'Log Service', xp: XP_REWARDS.LOG_SERVICE, route: '/(tabs)/maintenance' },
  { icon: 'warning-outline' as const, label: 'Check Recalls', xp: XP_REWARDS.CHECK_RECALLS, route: '/recalls' },
  { icon: 'chatbubble-ellipses-outline' as const, label: 'Ask Wrenchy', xp: XP_REWARDS.ASK_WRENCHY, route: '/(tabs)/chatbot' },
  { icon: 'book-outline' as const, label: 'DIY Guide', xp: XP_REWARDS.COMPLETE_GUIDE, route: '/(tabs)/guides' },
];

function getGreeting(t: TranslationKeys['home']): string {
  const hour = new Date().getHours();
  if (hour < 12) return t.goodMorning;
  if (hour < 17) return t.goodAfternoon;
  return t.goodEvening;
}

export default function DashboardScreen() {
  const router = useRouter();
  const { profile, user, refreshProfile } = useAuth();
  const { activeCar, isLoading } = useActiveCar();
  const { isDark } = useTheme();
  const { unitSystem } = useUnits();
  const { t } = useLanguage();
  const c = getColors(isDark);

  const [forceReady, setForceReady] = useState(false);
  useEffect(() => {
    const timeout = setTimeout(() => setForceReady(true), 6000);
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
    if (!vehicleId) { setData({ logs: [], reminders: [], loaded: true }); return; }
    let cancelled = false;
    const fetchData = async () => {
      try {
        const [logs, reminders] = await Promise.all([getMaintenanceLogs(vehicleId), getReminders(vehicleId)]);
        if (!cancelled) setData({ logs: logs ?? [], reminders: reminders ?? [], loaded: true });
      } catch {
        if (!cancelled) setData({ logs: [], reminders: [], loaded: true });
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, [vehicleId]);

  useEffect(() => {
    if (!activeCar?.id) return;
    Promise.all([
      supabase.from('maintenance_logs').select('*').eq('vehicle_id', activeCar.id).order('created_at', { ascending: false }),
      supabase.from('maintenance_reminders').select('*').eq('vehicle_id', activeCar.id).eq('is_completed', false),
    ]).then(([{ data: logs }, { data: rem }]) => {
      setHomeLogs(logs ?? []);
      setHomeReminders(rem ?? []);
    }).catch(() => { setHomeLogs([]); setHomeReminders([]); });
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
    if (!activeCar?.make || !activeCar?.model || !activeCar?.year) { setRecallsCount(0); return; }
    let cancelled = false;
    fetchRecalls(activeCar.make, activeCar.model, activeCar.year)
      .then((list) => { if (!cancelled) setRecallsCount(list?.length ?? 0); })
      .catch(() => { if (!cancelled) setRecallsCount(0); });
    return () => { cancelled = true; };
  }, [activeCar?.make, activeCar?.model, activeCar?.year]);

  useEffect(() => {
    if (!user?.id) return;
    getUserXP(user.id).then(setTotalXP).catch(() => {});
    getStreak(user.id).then((s) => setStreak({ currentStreak: s.currentStreak, checkedInToday: s.checkedInToday })).catch(() => {});
  }, [user?.id]);

  useFocusEffect(useCallback(() => { refreshProfile(); }, [refreshProfile]));

  const recentLogs = useMemo(() => data.logs.slice(0, 3), [data.logs]);

  const daysSinceLastService = useMemo(() => {
    const mostRecent = data.logs[0];
    if (!mostRecent?.date) return null;
    const logDate = new Date(mostRecent.date);
    if (Number.isNaN(logDate.getTime())) return null;
    return Math.floor((Date.now() - logDate.getTime()) / (1000 * 60 * 60 * 24));
  }, [data.logs]);

  const nextReminder = useMemo(() => {
    if (!activeCar || data.reminders.length === 0) return null;
    const scored = data.reminders.map((r: any) => {
      const mk = r.due_miles ?? Number.POSITIVE_INFINITY;
      const dk = r.due_date ? new Date(r.due_date).getTime() : Number.POSITIVE_INFINITY;
      return { r, sortKey: Math.min(mk, dk) };
    });
    scored.sort((a: any, b: any) => a.sortKey - b.sortKey);
    return scored[0].r ?? null;
  }, [activeCar, data.reminders]);

  const healthResult = activeCar ? calculateHealthScore(activeCar, homeLogs, homeReminders) : null;
  const healthScore = healthResult?.score ?? 100;
  const levelInfo = getUserLevel(totalXP);

  const healthStatusCard = useMemo(() => {
    const issueCount = healthResult?.issues?.length ?? 0;
    let variant: 'green' | 'blue' | 'red' | 'default' = 'green';
    let emoji = '✅';
    let text = 'All caught up! Your car is in great shape.';
    let textColor: string = COLORS.xpGreen;

    if (healthScore < 40) {
      variant = 'red'; emoji = '🔴';
      text = 'Critical maintenance items are overdue. Take action now.';
      textColor = COLORS.heartRed;
    } else if (healthScore < 60) {
      variant = 'default'; emoji = '⚠️';
      text = 'Your car has overdue maintenance. Tap to review.';
      textColor = COLORS.streakOrange;
    } else if (healthScore < 80 || issueCount > 0) {
      variant = 'blue'; emoji = '⚠️';
      text = 'Some items need your attention. Check your service schedule.';
      textColor = COLORS.blue;
    }

    return { variant, emoji, text, textColor };
  }, [healthScore, healthResult?.issues?.length]);

  const totalSpent = useMemo(() => data.logs.reduce((s: number, l: any) => s + (l.cost ?? 0), 0), [data.logs]);

  const displayName = profile?.displayName?.trim() || profile?.name?.trim() || (user?.user_metadata as any)?.full_name || user?.email?.split('@')[0] || t.home.driver;

  const carTitle = activeCar
    ? [activeCar.year, activeCar.make?.trim(), activeCar.model?.trim()].filter(Boolean).join(' ')
    : t.home.noActiveVehicle;

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
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <View style={styles.loadingWrap}>
          <Text style={[TYPE.body, { color: c.textMuted }]}>{t.home.loading}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={c.background} />

      {xpPopup != null && <XPPopup amount={xpPopup} onComplete={() => setXpPopup(null)} />}

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={[TYPE.h2, { color: c.text }]}>
              {getGreeting(t.home)}, {displayName} 👋
            </Text>
            <Text style={[TYPE.bodySM, { color: c.textSecondary, marginTop: 2 }]}>
              {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
            </Text>
          </View>
          <View style={styles.headerBadges}>
            <StreakBadge streak={streak.currentStreak} />
            <XPBadge xp={totalXP} />
          </View>
        </View>

        {activeCar ? (
          <>
            {/* Active Vehicle Hero Card */}
            <ChunkyCard
              style={styles.heroCard}
              noPadding
              onPress={() => router.push({ pathname: '/vehicle-detail', params: { vehicleId: activeCar.id } })}
            >
              {activeCar.photo_url ? (
                <Image
                  source={{ uri: activeCar.photo_url + '?t=' + Date.now() }}
                  style={styles.heroPhoto}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.heroPhotoPlaceholder, { backgroundColor: isDark ? '#1C1C1C' : '#F0EDE6' }]}>
                  <Text style={styles.heroPhotoEmoji}>🚗</Text>
                </View>
              )}
              <View style={styles.activePill}>
                <View style={styles.activePillDot} />
                <Text style={styles.activePillText}>Active</Text>
              </View>
              {recallsCount > 0 && (
                <View style={styles.recallDot} />
              )}
              <View style={styles.heroBody}>
                <View style={styles.heroBodyRow}>
                  <View style={styles.heroInfo}>
                    <Text style={[TYPE.h1, { color: c.text }]}>{activeCar.make} {activeCar.model}</Text>
                    <Text style={[TYPE.body, { color: c.textSecondary, marginTop: 2 }]}>
                      {activeCar.year} · {formatMileage(activeCar.mileage ?? 0, unitSystem)} {getUnitLabel(unitSystem)}
                    </Text>
                    {healthResult?.issues?.length ? (
                      <View style={styles.issuesWrap}>
                        {healthResult.issues.slice(0, 2).map((issue: string, i: number) => (
                          <View key={i} style={[styles.issuePill, { backgroundColor: (healthResult.color ?? COLORS.blue) + '18' }]}>
                            <View style={[styles.issueDot, { backgroundColor: healthResult.color }]} />
                            <Text style={[TYPE.labelSM, { color: healthResult.color }]}>{issue}</Text>
                          </View>
                        ))}
                      </View>
                    ) : null}
                  </View>
                  <ProgressRing
                    score={healthScore}
                    size={70}
                    strokeWidth={6}
                    label={
                      healthScore >= 80 ? 'Great' :
                      healthScore >= 60 ? 'Attention' :
                      healthScore >= 40 ? 'Overdue' : 'Critical'
                    }
                  />
                </View>
                {/* Level progress bar */}
                <View style={styles.levelBar}>
                  <View style={[styles.levelBarTrack, { backgroundColor: isDark ? '#2A2A2A' : '#E5E5E5' }]}>
                    <View style={[styles.levelBarFill, { width: `${levelInfo.xpProgress * 100}%` }]} />
                  </View>
                  <Text style={[TYPE.labelSM, { color: c.textMuted }]}>
                    {levelInfo.emoji} Lvl {levelInfo.level}
                  </Text>
                </View>
              </View>
            </ChunkyCard>

            {/* Daily Check-in Banner */}
            {!streak.checkedInToday && user?.id && (
              <ChunkyCard variant="blue" onPress={handleCheckIn} style={styles.checkinCard}>
                <View style={styles.checkinRow}>
                  <Text style={styles.checkinEmoji}>🔥</Text>
                  <View style={styles.checkinText}>
                    <Text style={[TYPE.h3, { color: '#000' }]}>Keep your streak alive!</Text>
                    <Text style={[TYPE.bodySM, { color: '#00000088' }]}>Tap to check in and earn 10 XP</Text>
                  </View>
                  <View style={styles.checkinXP}>
                    <Text style={[TYPE.label, { color: COLORS.blueDark }]}>+10 XP</Text>
                  </View>
                </View>
              </ChunkyCard>
            )}

            {/* Stats Row */}
            <View style={styles.statsRow}>
              <ChunkyCard style={styles.statCard}>
                <Text style={styles.statEmoji}>🔧</Text>
                <Text style={[TYPE.statSM, { color: c.text }]}>
                  {daysSinceLastService != null ? (daysSinceLastService === 0 ? 'Today' : `${daysSinceLastService}d`) : '—'}
                </Text>
                <Text style={[TYPE.labelSM, { color: c.textSecondary }]}>Last Service</Text>
              </ChunkyCard>
              <ChunkyCard style={styles.statCard}>
                <Text style={styles.statEmoji}>💰</Text>
                <Text style={[TYPE.statSM, { color: COLORS.xpGreen }]}>${totalSpent > 0 ? totalSpent.toLocaleString() : '0'}</Text>
                <Text style={[TYPE.labelSM, { color: c.textSecondary }]}>Total Spent</Text>
              </ChunkyCard>
              <ChunkyCard style={styles.statCard}>
                <Text style={styles.statEmoji}>⚡</Text>
                <Text style={[TYPE.statSM, { color: COLORS.levelPurple }]}>Lvl {levelInfo.level}</Text>
                <Text style={[TYPE.labelSM, { color: c.textSecondary }]}>{levelInfo.title}</Text>
              </ChunkyCard>
            </View>

            <ChunkyCard variant="blue" onPress={() => router.push('/add-fuel')} style={{ marginTop: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Text style={{ fontSize: 28 }}>⛽</Text>
                  <View>
                    <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 17, color: '#1A1A1A' }}>Log Fill-Up</Text>
                    <Text style={{ fontFamily: 'Outfit_400Regular', fontSize: 13, color: '#777777' }}>Track fuel economy & costs</Text>
                  </View>
                </View>
                <View style={{ backgroundColor: '#D7F5B1', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: '#46A302' }}>
                  <Text style={{ fontFamily: 'Outfit_600SemiBold', fontSize: 11, color: '#46A302' }}>+25 XP</Text>
                </View>
              </View>
            </ChunkyCard>

            {/* Fuel Quick Stat */}
            {fuelCardData && (
              <ChunkyCard
                onPress={() => router.push('/fuel-dashboard')}
                style={{ marginTop: SPACING.sm }}
              >
                <View>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: SPACING.sm,
                    }}
                  >
                    <Text style={[TYPE.h3, { color: c.text }]}>
                      ⛽ {fuelCardData.avgConsumption > 0 ? fuelCardData.avgConsumption.toFixed(1) : '—'} L/100km
                    </Text>

                    <Text style={[TYPE.bodySM, { color: c.textSecondary }]}>
                      Last fill: {formatDaysAgo(fuelCardData.lastFillDate)}
                    </Text>
                  </View>

                  <Text style={[TYPE.bodySM, { color: COLORS.blue, marginTop: 8 }]}>
                    Tap to view fuel dashboard →
                  </Text>
                </View>
              </ChunkyCard>
            )}

            {/* Health Status Card — context-aware */}
            {data.loaded && (
              <ChunkyCard
                variant={healthStatusCard.variant}
                onPress={() => router.push('/(tabs)/maintenance')}
                style={styles.nextServiceCard}
              >
                <View style={styles.nextServiceRow}>
                  <Text style={styles.nextServiceEmoji}>{healthStatusCard.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[TYPE.h3, { color: healthStatusCard.variant === 'green' ? healthStatusCard.textColor : (healthStatusCard.variant === 'blue' ? '#000' : '#FFF') }]}>
                      {healthStatusCard.text}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={healthStatusCard.variant === 'green' ? COLORS.xpGreen : (healthStatusCard.variant === 'blue' ? '#00000066' : '#FFFFFF88')} />
                </View>
              </ChunkyCard>
            )}

            {/* Next Service Reminder */}
            {data.loaded && nextReminder && (
              <ChunkyCard
                onPress={() => router.push('/(tabs)/maintenance')}
                style={{ marginTop: SPACING.sm }}
              >
                <View style={styles.nextServiceRow}>
                  <View style={[styles.nextServiceIcon, { backgroundColor: COLORS.blue + '20' }]}>
                    <Ionicons name="build-outline" size={20} color={COLORS.blue} />
                  </View>
                  <View style={styles.nextServiceInfo}>
                    <Text style={[TYPE.labelSM, { color: c.textSecondary }]}>Next Service</Text>
                    <Text style={[TYPE.h3, { color: c.text }]}>{nextReminder.service_name}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
                </View>
              </ChunkyCard>
            )}

            {/* Recommended Actions */}
            <Text style={[TYPE.h2, { color: c.text, marginTop: SPACING.xl, marginBottom: SPACING.md }]}>
              Recommended
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.actionsScroll} contentContainerStyle={styles.actionsScrollContent}>
              {RECOMMENDED_ACTIONS.map((action) => (
                <ChunkyCard
                  key={action.label}
                  style={styles.actionCard}
                  onPress={() => router.push(action.route as any)}
                >
                  <View style={[styles.actionIconWrap, { backgroundColor: COLORS.blue + '20' }]}>
                    <Ionicons name={action.icon} size={20} color={COLORS.blue} />
                  </View>
                  <Text style={[TYPE.label, { color: c.text, marginTop: SPACING.sm }]}>{action.label}</Text>
                  <View style={styles.xpMini}>
                    <Text style={styles.xpMiniText}>+{action.xp} XP</Text>
                  </View>
                </ChunkyCard>
              ))}
            </ScrollView>

            {/* Recent Activity */}
            {data.loaded && recentLogs.length > 0 && (
              <>
                <Text style={[TYPE.h2, { color: c.text, marginTop: SPACING.xl, marginBottom: SPACING.md }]}>
                  Recent Activity
                </Text>
                <ChunkyCard noPadding>
                  {recentLogs.map((log: any, idx: number) => (
                    <View key={log.id}>
                      <View style={styles.activityRow}>
                        <View style={[styles.activityIcon, { backgroundColor: COLORS.blue + '20' }]}>
                          <Ionicons name="build-outline" size={16} color={COLORS.blue} />
                        </View>
                        <View style={styles.activityInfo}>
                          <Text style={[TYPE.body, { color: c.text }]} numberOfLines={1}>{log.service_name}</Text>
                          <Text style={[TYPE.bodySM, { color: c.textSecondary }]}>{formatRelativeDate(log.date)}</Text>
                        </View>
                        <View style={styles.xpMini}>
                          <Text style={styles.xpMiniText}>+{XP_REWARDS.LOG_SERVICE} XP</Text>
                        </View>
                      </View>
                      {idx < recentLogs.length - 1 && <View style={[styles.activityDivider, { backgroundColor: c.divider }]} />}
                    </View>
                  ))}
                </ChunkyCard>
              </>
            )}

            {/* Tip of the Day */}
            <ChunkyCard variant="blue" style={styles.tipCard}>
              <View style={styles.tipRow}>
                <Text style={styles.tipEmoji}>💡</Text>
                <View style={styles.tipTextWrap}>
                  <Text style={[TYPE.labelSM, { color: COLORS.starBlue }]}>Tip of the Day</Text>
                  <Text style={[TYPE.bodySM, { color: c.text, marginTop: 2 }]} numberOfLines={2}>{tips[tipIndex]}</Text>
                </View>
                <TouchableOpacity onPress={() => setTipIndex((tipIndex + 1) % tips.length)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="chevron-forward" size={20} color={COLORS.starBlue} />
                </TouchableOpacity>
              </View>
            </ChunkyCard>
          </>
        ) : (
          <ChunkyCard style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🚗</Text>
            <Text style={[TYPE.h2, { color: c.text, textAlign: 'center' }]}>Add your first vehicle to get started</Text>
            <Text style={[TYPE.body, { color: c.textSecondary, textAlign: 'center', marginTop: SPACING.sm }]}>
              Track maintenance, earn XP, and keep your car healthy
            </Text>
            <TouchableOpacity
              style={styles.addCarBtn}
              activeOpacity={0.8}
              onPress={() => router.push('/vehicle-form')}
            >
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
  headerBadges: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'center' },

  heroCard: { marginBottom: SPACING.lg },
  heroPhoto: { width: '100%', height: 180, borderTopLeftRadius: RADIUS.lg - 2, borderTopRightRadius: RADIUS.lg - 2 },
  heroPhotoPlaceholder: { width: '100%', height: 180, borderTopLeftRadius: RADIUS.lg - 2, borderTopRightRadius: RADIUS.lg - 2, alignItems: 'center', justifyContent: 'center' },
  heroPhotoEmoji: { fontSize: 64 },
  activePill: { position: 'absolute', top: SPACING.md, left: SPACING.md, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.xpGreen, borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 4 },
  activePillDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFFFFF' },
  activePillText: { ...TYPE.labelSM, color: '#FFFFFF' },
  recallDot: { position: 'absolute', top: 12, right: 12, width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.heartRed, borderWidth: 2, borderColor: '#FFFFFF' },
  heroBody: { padding: SPACING.lg },
  heroBodyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroInfo: { flex: 1, marginRight: SPACING.md },
  issuesWrap: { marginTop: SPACING.sm, gap: 4 },
  issuePill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.pill, gap: 6 },
  issueDot: { width: 5, height: 5, borderRadius: 2.5 },
  levelBar: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.lg },
  levelBarTrack: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  levelBarFill: { height: '100%', backgroundColor: COLORS.blue, borderRadius: 3 },

  checkinCard: { marginBottom: SPACING.lg },
  checkinRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  checkinEmoji: { fontSize: 28 },
  checkinText: { flex: 1 },
  checkinXP: { backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 4 },

  statsRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg },
  statCard: { flex: 1, alignItems: 'center', gap: 4 },
  statEmoji: { fontSize: 22 },

  nextServiceCard: { marginBottom: 0 },
  nextServiceRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  nextServiceIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  nextServiceInfo: { flex: 1, gap: 2 },
  nextServiceEmoji: { fontSize: 20 },

  actionsScroll: { marginLeft: -SPACING.xl },
  actionsScrollContent: { paddingHorizontal: SPACING.xl, gap: SPACING.md },
  actionCard: { width: 110, alignItems: 'center', gap: 2 },
  actionIconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  xpMini: { backgroundColor: COLORS.xpGreenLight, borderRadius: RADIUS.pill, paddingHorizontal: 8, paddingVertical: 2, marginTop: 4 },
  xpMiniText: { ...TYPE.labelSM, color: COLORS.xpGreenDark, fontSize: 10 },

  activityRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
  activityIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  activityInfo: { flex: 1, gap: 1 },
  activityDivider: { height: 1, marginLeft: 60 },

  tipCard: { marginTop: SPACING.xl, marginBottom: SPACING.lg },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  tipEmoji: { fontSize: 24 },
  tipTextWrap: { flex: 1 },

  emptyCard: { marginTop: 60, alignItems: 'center', paddingVertical: SPACING.xxxl },
  emptyEmoji: { fontSize: 64, marginBottom: SPACING.lg },
  addCarBtn: { backgroundColor: COLORS.blue, borderRadius: RADIUS.sm, paddingVertical: SPACING.md, paddingHorizontal: SPACING.xxl, marginTop: SPACING.xl },
  addCarBtnText: { ...TYPE.h3, color: '#000000' },
});
