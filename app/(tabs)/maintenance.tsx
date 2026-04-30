import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

import {
  getMaintenanceLogs, getReminders, completeReminder, getServiceTypes,
  MaintenanceLog, MaintenanceReminder, ServiceType,
} from '@/lib/maintenance';
import { cancelReminderNotification } from '@/lib/notifications';
import { useTheme } from '@/contexts/ThemeContext';
import { useActiveCar } from '@/contexts/ActiveCarContext';
import { useUnits } from '@/contexts/UnitsContext';
import { formatMileage, getUnitLabel } from '@/utils/formatting';
import { COLORS, SPACING, RADIUS, TYPE, getColors } from '@/constants/DesignSystem';
import { ChunkyCard } from '@/components/ui/ChunkyCard';
import { ChunkyButton } from '@/components/ui/ChunkyButton';
import { XP_REWARDS } from '@/lib/xpSystem';

type ServiceIconConfig = { icon: string; bg: string; color: string };

function getServiceIcon(name: string): ServiceIconConfig {
  const n = (name ?? '').toLowerCase();
  if (n.includes('oil')) return { icon: 'water-outline', bg: COLORS.blue + '20', color: COLORS.blue };
  if (n.includes('brake')) return { icon: 'disc-outline', bg: COLORS.heartRed + '20', color: COLORS.heartRed };
  if (n.includes('tire') || n.includes('tyre') || n.includes('rotation')) return { icon: 'ellipse-outline', bg: '#33333320', color: '#888888' };
  if (n.includes('battery')) return { icon: 'battery-half-outline', bg: COLORS.xpGreen + '20', color: COLORS.xpGreen };
  if (n.includes('filter') || n.includes('air')) return { icon: 'leaf-outline', bg: COLORS.starBlue + '20', color: COLORS.starBlue };
  if (n.includes('transmission') || n.includes('fluid')) return { icon: 'water-outline', bg: COLORS.levelPurple + '20', color: COLORS.levelPurple };
  return { icon: 'construct-outline', bg: COLORS.blue + '20', color: COLORS.blue };
}

export default function ServiceScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const { activeCar, isLoading: isCarLoading, refreshActiveCar } = useActiveCar();
  const { unitSystem } = useUnits();
  const c = getColors(isDark);

  const [forceReady, setForceReady] = useState(false);
  useEffect(() => {
    const timeout = setTimeout(() => setForceReady(true), 6000);
    return () => clearTimeout(timeout);
  }, []);

  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [reminders, setReminders] = useState<MaintenanceReminder[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [serviceTypesLoading, setServiceTypesLoading] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

  const unitLabel = getUnitLabel(unitSystem);
  const currentMileage = activeCar?.mileage ?? 0;

  const loadData = useCallback(async () => {
    if (!activeCar?.id) { setLogs([]); setReminders([]); setLoading(false); setLoaded(true); return; }
    try {
      setLoading(true);
      const timeoutId = setTimeout(() => { setLoading(false); setLoaded(true); }, 5000);
      const [logsData, remindersData] = await Promise.all([getMaintenanceLogs(activeCar.id), getReminders(activeCar.id)]);
      clearTimeout(timeoutId);
      setLogs(logsData);
      setReminders(remindersData);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to load maintenance data.');
    } finally { setLoading(false); setLoaded(true); }
  }, [activeCar?.id]);

  useEffect(() => { if (activeCar?.id) loadData(); }, [activeCar?.id, loadData]);

  useEffect(() => {
    const loadTypes = async () => {
      try { setServiceTypesLoading(true); setServiceTypes(await getServiceTypes()); }
      catch { /* silent */ }
      finally { setServiceTypesLoading(false); }
    };
    loadTypes();
  }, []);

  useFocusEffect(useCallback(() => { if (activeCar?.id) loadData(); }, [activeCar?.id, loadData]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await Promise.all([refreshActiveCar(), activeCar?.id ? loadData() : Promise.resolve()]); }
    finally { setRefreshing(false); }
  }, [activeCar?.id, loadData, refreshActiveCar]);

  const handleAddLog = () => {
    if (!activeCar) return;
    router.push({ pathname: '/log-service', params: { vehicleId: activeCar.id, currentMileage: String(activeCar.mileage ?? 0) } });
  };

  const handleCompleteReminder = async (id: string) => {
    try {
      const reminder = reminders.find((r) => r.id === id);
      if (reminder?.maintenance_log_id) await cancelReminderNotification(reminder.maintenance_log_id);
      await completeReminder(id);
      setReminders((prev) => prev.filter((r) => r.id !== id));
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to complete reminder.');
    }
  };

  const formatDateNice = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatDateShort = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return Number.isNaN(d.getTime()) ? dateStr : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const formatReminderDue = (reminder: MaintenanceReminder) => {
    let label = 'Upcoming';
    let isOverdue = false;
    if (reminder.due_miles != null && currentMileage != null) {
      const remaining = reminder.due_miles - currentMileage;
      if (remaining <= 0) { isOverdue = true; label = 'Overdue'; }
      else label = `Due in ${remaining.toLocaleString()} ${unitLabel}`;
    } else if (reminder.due_date) {
      const d = new Date(reminder.due_date);
      if (!Number.isNaN(d.getTime())) {
        isOverdue = d < new Date(new Date().toDateString());
        label = `Due ${formatDateShort(reminder.due_date)}`;
      }
    }
    return { label, isOverdue };
  };

  const totalServices = logs.length;
  const totalSpent = useMemo(() => logs.reduce((s, l) => s + (l.cost ?? 0), 0), [logs]);

  const lastServiceDays = useMemo(() => {
    if (!logs.length) return null;
    const d = new Date(logs[0].date);
    return Number.isNaN(d.getTime()) ? null : Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  }, [logs]);

  const lastServiceLabel = useMemo(() => {
    if (lastServiceDays == null) return '—';
    if (lastServiceDays <= 0) return 'Today';
    if (lastServiceDays === 1) return '1 day';
    return `${lastServiceDays}d`;
  }, [lastServiceDays]);

  const recommendedTypes = useMemo(() => {
    if (!serviceTypes.length) return [];
    const recent = new Set(logs.map((l) => l.service_type_id).filter((id): id is string => !!id));
    return serviceTypes.filter((t) => !recent.has(t.id)).slice(0, 5);
  }, [logs, serviceTypes]);

  const formatInterval = (type: ServiceType) => {
    if (type.default_interval_miles && type.default_interval_days) return `Every ${type.default_interval_miles.toLocaleString()} ${unitLabel}`;
    if (type.default_interval_miles) return `Every ${type.default_interval_miles.toLocaleString()} ${unitLabel}`;
    if (type.default_interval_days) return `Every ${type.default_interval_days} days`;
    return 'Recommended';
  };

  const monthlySummary = useMemo(() => {
    const now = new Date();
    const months: { label: string; count: number; spent: number }[] = [];
    for (let offset = 0; offset < 2; offset++) {
      const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
      const matching = logs.filter((l) => l.date?.startsWith(monthKey));
      months.push({ label: monthLabel, count: matching.length, spent: matching.reduce((s, l) => s + (l.cost ?? 0), 0) });
    }
    return months;
  }, [logs]);

  const toggleNotes = (id: string) => {
    setExpandedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  if (isCarLoading && !forceReady) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={['top']}>
        <View style={styles.loadingWrap}><ActivityIndicator color={COLORS.blue} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={[TYPE.displayMD, { color: c.text }]}>Service</Text>
        {activeCar && (
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: COLORS.blue, borderColor: COLORS.blueDark }]}
            activeOpacity={0.8}
            onPress={handleAddLog}
          >
            <Ionicons name="add" size={22} color="#000" />
          </TouchableOpacity>
        )}
      </View>

      {!activeCar ? (
        <View style={styles.emptyWrap}>
          <Text style={{ fontSize: 56 }}>🚗</Text>
          <Text style={[TYPE.h2, { color: c.text, marginTop: SPACING.lg }]}>No active vehicle</Text>
          <Text style={[TYPE.body, { color: c.textSecondary, marginTop: SPACING.sm, textAlign: 'center' }]}>
            Add a vehicle in Garage to track services
          </Text>
          <ChunkyButton title="Go to Garage" onPress={() => router.push('/(tabs)/garage')} style={{ marginTop: SPACING.xl }} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.blue} />}
          showsVerticalScrollIndicator={false}
        >
          {/* ═══ Stats Dashboard ═══ */}
          <ChunkyCard style={styles.dashCard}>
            <View style={styles.dashRow}>
              <View style={styles.dashCol}>
                <Text style={[TYPE.stat, { color: c.text }]} adjustsFontSizeToFit numberOfLines={1}>{totalServices}</Text>
                <Text style={[TYPE.labelSM, { color: c.textMuted }]}>Services</Text>
              </View>
              <View style={[styles.dashDivider, { backgroundColor: c.divider }]} />
              <View style={styles.dashCol}>
                <Text style={[TYPE.stat, { color: COLORS.blue }]} adjustsFontSizeToFit numberOfLines={1}>${totalSpent.toFixed(0)}</Text>
                <Text style={[TYPE.labelSM, { color: c.textMuted }]}>Total Spent</Text>
              </View>
              <View style={[styles.dashDivider, { backgroundColor: c.divider }]} />
              <View style={styles.dashCol}>
                <Text style={[TYPE.stat, { color: c.text }]} adjustsFontSizeToFit numberOfLines={1}>{lastServiceLabel}</Text>
                <Text style={[TYPE.labelSM, { color: c.textMuted }]}>Since Last</Text>
              </View>
            </View>
          </ChunkyCard>

          {loading && !loaded && logs.length === 0 && (
            <View style={styles.loadingInline}><ActivityIndicator color={COLORS.blue} /></View>
          )}

          {/* ═══ Reminders ═══ */}
          {reminders.length > 0 && (
            <>
              <Text style={[TYPE.h2, { color: c.text, marginTop: SPACING.xl, marginBottom: SPACING.md }]}>Upcoming</Text>
              {reminders.map((rem) => {
                const { label, isOverdue } = formatReminderDue(rem);
                const si = getServiceIcon(rem.service_name);
                return (
                  <ChunkyCard key={rem.id} variant={isOverdue ? 'red' : 'default'} style={styles.reminderCard}>
                    <View style={styles.reminderRow}>
                      <View style={[styles.iconCircle, { backgroundColor: si.bg }]}>
                        <Ionicons name={si.icon as any} size={20} color={si.color} />
                      </View>
                      <View style={styles.reminderInfo}>
                        <Text style={[TYPE.h3, { color: c.text }]}>{rem.service_name}</Text>
                        <Text style={[TYPE.bodySM, { color: isOverdue ? COLORS.heartRed : c.textSecondary }]}>{label}</Text>
                      </View>
                      <ChunkyButton title="Done" variant="success" small onPress={() => handleCompleteReminder(rem.id)} />
                    </View>
                  </ChunkyCard>
                );
              })}
            </>
          )}

          {/* ═══ Monthly Summary ═══ */}
          {logs.length > 0 && (
            <View style={styles.monthlySection}>
              {monthlySummary.map((m) => (
                <View key={m.label} style={styles.monthRow}>
                  <Text style={[TYPE.h3, { color: c.text }]}>{m.label}</Text>
                  <Text style={[TYPE.bodySM, { color: c.textSecondary, marginTop: 2 }]}>
                    {m.count} service{m.count !== 1 ? 's' : ''} · ${m.spent.toFixed(0)} spent
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* ═══ History ═══ */}
          <View style={styles.sectionHeader}>
            <Text style={[TYPE.h2, { color: c.text }]}>History</Text>
            <TouchableOpacity>
              <Text style={[TYPE.bodySM, { color: c.textMuted }]}>All</Text>
            </TouchableOpacity>
          </View>

          {logs.length === 0 && !loading ? (
            <View style={styles.emptyHistory}>
              <Text style={{ fontSize: 60 }}>🔧</Text>
              <Text style={[TYPE.h2, { color: c.text, marginTop: SPACING.lg, textAlign: 'center' }]}>
                No services logged yet
              </Text>
              <Text style={[TYPE.body, { color: c.textSecondary, marginTop: SPACING.sm, textAlign: 'center' }]}>
                Tap + to log your first service
              </Text>
              <View style={styles.emptyBtnRow}>
                <ChunkyButton title="Log First Service" onPress={handleAddLog} style={{ flex: 1 }} />
                <View style={styles.xpBadge}>
                  <Text style={styles.xpBadgeText}>+{XP_REWARDS.LOG_SERVICE} XP ⚡</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.timeline}>
              {logs.map((log, idx) => {
                const si = getServiceIcon(log.service_name);
                const hasNotes = !!log.notes?.trim();
                const isExpanded = expandedNotes.has(log.id);
                const notesLong = (log.notes?.length ?? 0) > 100;

                return (
                  <View key={log.id} style={styles.feedItem}>
                    {/* Timeline connector */}
                    <View style={styles.feedLeft}>
                      <View style={[styles.feedDot, { backgroundColor: si.color, borderColor: si.color + '40' }]} />
                      {idx < logs.length - 1 && (
                        <View style={[styles.feedLine, { backgroundColor: COLORS.blue + '25' }]} />
                      )}
                    </View>

                    {/* Card */}
                    <ChunkyCard style={styles.feedCard} noPadding>
                      <View style={styles.feedCardInner}>
                        {/* Top row: icon + name + cost */}
                        <View style={styles.feedTopRow}>
                          <View style={[styles.iconCircle, { backgroundColor: si.bg }]}>
                            <Ionicons name={si.icon as any} size={18} color={si.color} />
                          </View>
                          <Text style={[TYPE.h3, { color: c.text, flex: 1 }]} numberOfLines={1}>{log.service_name}</Text>
                          {log.cost != null && log.cost > 0 && (
                            <Text style={[TYPE.h3, { color: COLORS.blue }]}>${log.cost.toFixed(2)}</Text>
                          )}
                        </View>

                        {/* Meta rows */}
                        <View style={styles.metaBlock}>
                          <View style={styles.metaRow}>
                            <Text style={styles.metaIcon}>📅</Text>
                            <Text style={[TYPE.bodySM, { color: c.textSecondary }]}>{formatDateNice(log.date)}</Text>
                          </View>
                          {log.mileage_at_service > 0 && (
                            <View style={styles.metaRow}>
                              <Text style={styles.metaIcon}>⏱</Text>
                              <Text style={[TYPE.bodySM, { color: c.textSecondary }]}>
                                {formatMileage(log.mileage_at_service, unitSystem)} {unitLabel}
                              </Text>
                            </View>
                          )}
                          {!!log.shop_name?.trim() && (
                            <View style={styles.metaRow}>
                              <Text style={styles.metaIcon}>🏪</Text>
                              <Text style={[TYPE.bodySM, { color: c.textSecondary }]}>{log.shop_name}</Text>
                            </View>
                          )}
                        </View>

                        {/* Notes */}
                        {hasNotes && (
                          <TouchableOpacity
                            style={[styles.notesBox, { backgroundColor: isDark ? '#ffffff08' : '#00000005' }]}
                            onPress={() => notesLong && toggleNotes(log.id)}
                            activeOpacity={notesLong ? 0.6 : 1}
                          >
                            <Text style={[TYPE.bodySM, { color: c.textSecondary }]} numberOfLines={isExpanded ? undefined : 2}>
                              {log.notes}
                            </Text>
                            {notesLong && !isExpanded && (
                              <Text style={[TYPE.labelSM, { color: COLORS.blue, marginTop: 4 }]}>Read more</Text>
                            )}
                          </TouchableOpacity>
                        )}

                        {/* Bottom row: XP badge */}
                        <View style={styles.feedBottomRow}>
                          <View style={{ flex: 1 }} />
                          <View style={styles.xpBadge}>
                            <Text style={styles.xpBadgeText}>+{XP_REWARDS.LOG_SERVICE} XP ⚡</Text>
                          </View>
                        </View>
                      </View>
                    </ChunkyCard>
                  </View>
                );
              })}
            </View>
          )}

          {/* ═══ Recommended ═══ */}
          {recommendedTypes.length > 0 && (
            <>
              <View style={[styles.sectionHeader, { marginTop: SPACING.xl }]}>
                <Text style={[TYPE.h2, { color: c.text }]}>Recommended</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.recScroll}
                contentContainerStyle={styles.recScrollContent}
              >
                {recommendedTypes.map((type) => {
                  const si = getServiceIcon(type.name);
                  return (
                    <ChunkyCard
                      key={type.id}
                      style={styles.recCard}
                      onPress={() => activeCar && router.push({
                        pathname: '/log-service',
                        params: { vehicleId: activeCar.id, currentMileage: String(currentMileage), serviceTypeId: type.id, serviceName: type.name },
                      })}
                    >
                      <View style={[styles.recIcon, { backgroundColor: si.bg }]}>
                        <Ionicons name={si.icon as any} size={24} color={si.color} />
                      </View>
                      <Text style={[TYPE.h3, { color: c.text, textAlign: 'center', marginTop: SPACING.sm }]} numberOfLines={2}>{type.name}</Text>
                      <Text style={[TYPE.bodySM, { color: c.textSecondary, textAlign: 'center', marginTop: 2 }]} numberOfLines={2}>{formatInterval(type)}</Text>
                      <View style={styles.recBottom}>
                        <View style={styles.recLogBtn}>
                          <Text style={styles.recLogText}>Log</Text>
                        </View>
                        <View style={styles.xpBadgeSm}>
                          <Text style={styles.xpBadgeSmText}>+{XP_REWARDS.LOG_SERVICE}</Text>
                        </View>
                      </View>
                    </ChunkyCard>
                  );
                })}
              </ScrollView>
            </>
          )}

          <View style={{ height: 80 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingInline: { paddingVertical: 24, alignItems: 'center' },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl, paddingTop: SPACING.lg, paddingBottom: SPACING.md,
  },
  addBtn: {
    width: 44, height: 44, borderRadius: 22,
    borderWidth: 2.5, borderBottomWidth: 4,
    justifyContent: 'center', alignItems: 'center',
  },
  scroll: { flex: 1 },
  content: { paddingHorizontal: SPACING.xl, paddingBottom: SPACING.xxl },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.xl },

  // Stats Dashboard
  dashCard: { marginBottom: SPACING.sm },
  dashRow: { flexDirection: 'row', alignItems: 'center' },
  dashCol: { flex: 1, alignItems: 'center', paddingVertical: SPACING.sm },
  dashDivider: { width: 1, height: 40, marginHorizontal: 2 },

  // Reminders
  reminderCard: { marginBottom: SPACING.md },
  reminderRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  reminderInfo: { flex: 1, gap: 2 },

  // Monthly summary
  monthlySection: { marginTop: SPACING.xl, marginBottom: SPACING.sm, gap: SPACING.md },
  monthRow: { paddingBottom: SPACING.md, borderBottomWidth: 1, borderBottomColor: 'transparent' },

  // Section header
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: SPACING.md,
  },

  // Empty history
  emptyHistory: { alignItems: 'center', paddingVertical: SPACING.xxxl * 2 },
  emptyBtnRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.xl, width: '100%' },

  // Icon circle
  iconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },

  // Timeline / Feed
  timeline: { gap: 0 },
  feedItem: { flexDirection: 'row', marginBottom: SPACING.lg },
  feedLeft: { alignItems: 'center', width: 24, paddingTop: SPACING.xl },
  feedDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 3 },
  feedLine: { width: 2, flex: 1, marginTop: 4 },
  feedCard: { flex: 1, marginLeft: SPACING.md },
  feedCardInner: { padding: SPACING.lg, gap: SPACING.md },
  feedTopRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  metaBlock: { gap: 6, marginLeft: 52 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaIcon: { fontSize: 13, width: 18 },
  notesBox: { borderRadius: RADIUS.sm, padding: SPACING.md, marginLeft: 52 },
  feedBottomRow: { flexDirection: 'row', alignItems: 'center', marginLeft: 52 },

  // XP Badges
  xpBadge: { backgroundColor: COLORS.xpGreenLight, borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 4 },
  xpBadgeText: { ...TYPE.labelSM, color: COLORS.xpGreenDark, fontSize: 11 },
  xpBadgeSm: { backgroundColor: COLORS.xpGreenLight, borderRadius: RADIUS.pill, paddingHorizontal: 6, paddingVertical: 2 },
  xpBadgeSmText: { ...TYPE.labelSM, color: COLORS.xpGreenDark, fontSize: 9 },

  // Recommended horizontal cards
  recScroll: { marginLeft: -SPACING.xl },
  recScrollContent: { paddingHorizontal: SPACING.xl, gap: SPACING.md },
  recCard: { width: 160, alignItems: 'center', paddingVertical: SPACING.lg },
  recIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  recBottom: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: SPACING.md },
  recLogBtn: {
    backgroundColor: COLORS.blue, borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs + 2,
    borderWidth: 2, borderBottomWidth: 3, borderColor: COLORS.blueDark,
  },
  recLogText: { ...TYPE.label, color: '#000', fontSize: 12 },
});
