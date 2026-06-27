import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Alert, StatusBar,
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
import { useActiveCar } from '@/contexts/ActiveCarContext';
import { useUnits } from '@/contexts/UnitsContext';
import { formatMileage, getUnitLabel } from '@/utils/formatting';
import { Colors, COLORS, SPACING, RADIUS, TYPE, getColors, CARD_SHADOW } from '@/constants/DesignSystem';
import { ChunkyCard } from '@/components/ui/ChunkyCard';
import { ChunkyButton } from '@/components/ui/ChunkyButton';
import { XP_REWARDS } from '@/lib/xpSystem';

type ServiceIconConfig = { icon: string; bg: string; color: string };

function getServiceAccent(name: string): string {
  const n = (name ?? '').toLowerCase();
  if (n.includes('oil')) return Colors.warning;
  if (n.includes('tire') || n.includes('tyre') || n.includes('rotation')) return Colors.primary;
  if (n.includes('brake')) return Colors.danger;
  return Colors.textMuted;
}

function getServiceIcon(name: string): ServiceIconConfig {
  const n = (name ?? '').toLowerCase();
  let icon: keyof typeof Ionicons.glyphMap = 'construct-outline';
  if (n.includes('oil')) icon = 'water-outline';
  else if (n.includes('brake')) icon = 'disc-outline';
  else if (n.includes('tire') || n.includes('tyre') || n.includes('rotation')) icon = 'ellipse-outline';
  else if (n.includes('battery')) icon = 'battery-half-outline';
  else if (n.includes('filter') || n.includes('air')) icon = 'leaf-outline';
  else if (n.includes('transmission') || n.includes('fluid')) icon = 'water-outline';
  return { icon, bg: Colors.primaryLight, color: Colors.primary };
}

export default function ServiceScreen() {
  const router = useRouter();
  const { activeCar, isLoading: isCarLoading, refreshActiveCar } = useActiveCar();
  const { unitSystem } = useUnits();
  const c = getColors();

  const [forceReady, setForceReady] = useState(false);
  useEffect(() => {
    const timeout = setTimeout(() => setForceReady(true), 5000);
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
    if (!activeCar?.id) {
      setLogs([]);
      setReminders([]);
      setLoading(false);
      setLoaded(true);
      return;
    }
    const timeoutId = setTimeout(() => {
      setLoading(false);
      setLoaded(true);
    }, 5000);
    try {
      setLoading(true);
      const [logsData, remindersData] = await Promise.all([
        getMaintenanceLogs(activeCar.id),
        getReminders(activeCar.id),
      ]);
      setLogs(logsData ?? []);
      setReminders(remindersData ?? []);
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', error?.message || 'Failed to load maintenance data.');
      setLogs([]);
      setReminders([]);
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
      setLoaded(true);
    }
  }, [activeCar?.id]);

  useEffect(() => {
    if (activeCar?.id) loadData();
  }, [activeCar?.id, loadData]);

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
      <SafeAreaView style={[styles.container, { backgroundColor: Colors.background }]} edges={['top']}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors.background }]} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Service Log</Text>
        {activeCar && (
          <TouchableOpacity style={styles.addBtn} activeOpacity={0.85} onPress={handleAddLog}>
            <Ionicons name="add" size={22} color={Colors.surface} />
          </TouchableOpacity>
        )}
      </View>

      {!activeCar ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="car-sport-outline" size={56} color={Colors.primary} />
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          showsVerticalScrollIndicator={false}
        >
          {/* ═══ Stats Dashboard ═══ */}
          <ChunkyCard style={styles.dashCard}>
            <View style={styles.dashRow}>
              <View style={styles.dashCol}>
                <Text style={styles.dashStat} adjustsFontSizeToFit numberOfLines={1}>
                  {loaded ? String(totalServices) : '--'}
                </Text>
                <Text style={styles.dashStatLabel}>Services</Text>
              </View>
              <View style={[styles.dashDivider, { backgroundColor: c.divider }]} />
              <View style={styles.dashCol}>
                <Text style={styles.dashStat} adjustsFontSizeToFit numberOfLines={1}>
                  {loaded ? `$${totalSpent.toFixed(0)}` : '--'}
                </Text>
                <Text style={styles.dashStatLabel}>Total Spent</Text>
              </View>
              <View style={[styles.dashDivider, { backgroundColor: c.divider }]} />
              <View style={styles.dashCol}>
                <Text style={styles.dashStat} adjustsFontSizeToFit numberOfLines={1}>
                  {loaded ? lastServiceLabel : '--'}
                </Text>
                <Text style={styles.dashStatLabel}>Since Last</Text>
              </View>
            </View>
          </ChunkyCard>

          {loading && !loaded && logs.length === 0 && (
            <View style={styles.loadingInline}>
              <ActivityIndicator color={Colors.primary} />
            </View>
          )}

          {/* ═══ Reminders ═══ */}
          {reminders.length > 0 && (
            <>
              <Text style={[TYPE.h2, { color: c.text, marginTop: SPACING.xl, marginBottom: SPACING.md }]}>Upcoming</Text>
              {reminders.map((rem) => {
                const { label, isOverdue } = formatReminderDue(rem);
                const si = getServiceIcon(rem.service_name);
                return (
                  <ChunkyCard key={rem.id} style={styles.reminderCard}>
                    <View style={styles.reminderRow}>
                      <View style={[styles.iconCircle, { backgroundColor: si.bg }]}>
                        <Ionicons name={si.icon as any} size={20} color={si.color} />
                      </View>
                      <View style={styles.reminderInfo}>
                        <Text style={[TYPE.h3, { color: c.text }]}>{rem.service_name}</Text>
                        <Text style={[TYPE.bodySM, { color: isOverdue ? Colors.danger : c.textSecondary }]}>{label}</Text>
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
              <Ionicons name="construct-outline" size={56} color={Colors.primary} />
              <Text style={styles.emptyTitle}>No services yet!</Text>
              <Text style={[TYPE.body, { color: COLORS.textMuted, marginTop: SPACING.sm, textAlign: 'center' }]}>
                Log maintenance to track spending and earn XP.
              </Text>
              <ChunkyButton
                title="Log First Service"
                variant="primary"
                onPress={handleAddLog}
                style={{ marginTop: SPACING.xl, width: '100%', backgroundColor: '#1A6FBF', borderRadius: 12, paddingVertical: 14, borderWidth: 0, borderColor: '#1A6FBF' }}
              />
            </View>
          ) : (
            <View style={styles.logList}>
              {logs.map((log) => {
                const accent = getServiceAccent(log.service_name);
                const hasNotes = !!log.notes?.trim();
                const isExpanded = expandedNotes.has(log.id);
                const notesLong = (log.notes?.length ?? 0) > 100;
                const metaParts = [
                  formatDateNice(log.date),
                  log.mileage_at_service > 0 ? `${formatMileage(log.mileage_at_service, unitSystem)} ${unitLabel}` : null,
                ].filter(Boolean) as string[];

                return (
                  <View key={log.id} style={styles.logCard}>
                    <View style={[styles.accentStrip, { backgroundColor: accent }]} />
                    <View style={styles.logCardBody}>
                      <View style={styles.logTopRow}>
                        <Text style={styles.serviceTitle} numberOfLines={2}>{log.service_name}</Text>
                        {log.cost != null && log.cost > 0 ? (
                          <View style={styles.costPill}>
                            <Text style={styles.costPillText}>${log.cost.toFixed(2)}</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.logMeta}>{metaParts.join(' · ')}</Text>
                      {!!log.shop_name?.trim() && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                          <Ionicons name="storefront-outline" size={14} color={Colors.textMuted} />
                          <Text style={styles.logMeta}>{log.shop_name}</Text>
                        </View>
                      )}
                      {hasNotes && (
                        <TouchableOpacity
                          style={styles.notesBox}
                          onPress={() => notesLong && toggleNotes(log.id)}
                          activeOpacity={notesLong ? 0.6 : 1}
                        >
                          <Text style={[TYPE.bodySM, { color: c.textSecondary }]} numberOfLines={isExpanded ? undefined : 2}>
                            {log.notes}
                          </Text>
                          {notesLong && !isExpanded && (
                            <Text style={[TYPE.labelSM, { color: Colors.primary, marginTop: 4 }]}>Read more</Text>
                          )}
                        </TouchableOpacity>
                      )}
                      <View style={{ alignSelf: 'flex-end', marginTop: SPACING.sm }}>
                        <View style={styles.xpBadge}>
                          <Text style={styles.xpBadgeText}>+{XP_REWARDS.LOG_SERVICE} XP</Text>
                        </View>
                      </View>
                    </View>
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
  headerTitle: { fontFamily: 'Outfit_700Bold', fontSize: 26, color: Colors.textPrimary },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: { flex: 1 },
  content: { paddingHorizontal: SPACING.xl, paddingBottom: SPACING.xxl },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.xl },

  // Stats Dashboard
  dashCard: { marginBottom: SPACING.sm },
  dashRow: { flexDirection: 'row', alignItems: 'center' },
  dashCol: { flex: 1, alignItems: 'center', paddingVertical: SPACING.sm },
  dashStat: { fontFamily: 'Outfit_700Bold', fontSize: 20, color: Colors.textPrimary },
  dashStatLabel: { fontFamily: 'Outfit_400Regular', fontSize: 12, color: Colors.textMuted, marginTop: 4 },
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
  emptyTitle: { fontFamily: 'Outfit_800ExtraBold', fontSize: 24, color: COLORS.text, marginTop: SPACING.lg, textAlign: 'center' },
  emptyBtnRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.xl, width: '100%' },

  // Icon circle
  iconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },

  logList: { gap: SPACING.md },
  logCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...CARD_SHADOW,
  },
  accentStrip: { width: 3, borderTopLeftRadius: 2, borderBottomLeftRadius: 2 },
  logCardBody: { flex: 1, padding: SPACING.md },
  logTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: SPACING.md },
  serviceTitle: { fontFamily: 'Outfit_600SemiBold', fontSize: 15, color: Colors.textPrimary, flex: 1 },
  logMeta: { fontFamily: 'Outfit_400Regular', fontSize: 13, color: COLORS.textMuted, marginTop: SPACING.xs },
  costPill: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  costPillText: { fontFamily: 'Outfit_600SemiBold', fontSize: 13, color: Colors.primary },

  notesBox: { borderRadius: RADIUS.sm, padding: SPACING.md, marginTop: SPACING.sm, backgroundColor: Colors.surfaceSecondary },

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
    backgroundColor: '#EBF3FC',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  recLogText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 12,
    color: '#1A6FBF',
  },
});
