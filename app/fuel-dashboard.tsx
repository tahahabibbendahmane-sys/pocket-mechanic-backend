import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  StatusBar,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useActiveCar } from '@/contexts/ActiveCarContext';
import { supabase } from '@/lib/supabase';

import { ChunkyCard } from '@/components/ui/ChunkyCard';
import { COLORS, SPACING, RADIUS, TYPE, getColors } from '@/constants/DesignSystem';
import { getFuelLogs, calculateFuelStats, calculateConsumption, checkFuelAnomaly, deleteFuelLog, FuelLog } from '@/lib/fuelTracking';

const { width: screenWidth } = Dimensions.get('window');

export default function FuelDashboardScreen() {
  const router = useRouter();
  const { activeCar } = useActiveCar();
  const c = getColors();

  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<FuelLog[]>([]);

  const fetchLogs = async (vehicleId: string) => {
    setLoading(true);
    try {
      const fetched = await getFuelLogs(vehicleId);
      setLogs(fetched);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!activeCar?.id) {
      setLogs([]);
      setLoading(false);
      return;
    }
    void fetchLogs(activeCar.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCar?.id]);

  const sortedAsc = useMemo(() => [...logs].sort((a, b) => a.mileage_at_fillup - b.mileage_at_fillup), [logs]);
  const stats = useMemo(() => calculateFuelStats(sortedAsc), [sortedAsc]);
  const anomaly = useMemo(() => checkFuelAnomaly(sortedAsc), [sortedAsc]);

  const consumptionData = useMemo(() => calculateConsumption(sortedAsc), [sortedAsc]);

  const fuelTrendChart = useMemo(() => {
    if (consumptionData.length < 2) return null;

    // labels: use month short from date; values: consumption
    const labels = consumptionData.map((d) => {
      const dt = new Date(d.date);
      return dt.toLocaleDateString(undefined, { month: 'short' });
    });

    // LineChart expects a single numeric dataset
    const values = consumptionData.map((d) => d.consumption);

    return (
      <LineChart
        data={{
          labels,
          datasets: [
            {
              data: values,
            },
          ],
        }}
        width={screenWidth - 48}
        height={220}
        chartConfig={{
          backgroundColor: c.surface,
          backgroundGradientFrom: c.surface,
          backgroundGradientTo: c.surface,
          decimalPlaces: 1,
          color: (opacity: number) => `rgba(5,103,166,${opacity})`,
          labelColor: (opacity: number) => c.textMuted,
          propsForDots: {
            r: '3',
            strokeWidth: '1',
            stroke: COLORS.blue,
            fill: COLORS.blue,
          },
        }}
        bezier
        style={styles.chartStyle}
        withDots
        withInnerLines
        withOuterLines={false}
        fromZero={false}
        segments={4}
      />
    );
  }, [consumptionData, c.surface, c.textMuted]);

  const monthly = useMemo(() => {
    if (!logs.length) return [];
    const byMonth = new Map<string, FuelLog[]>();
    for (const l of sortedAsc) {
      const dt = new Date(l.date);
      if (Number.isNaN(dt.getTime())) continue;
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      const bucket = byMonth.get(key) ?? [];
      bucket.push(l);
      byMonth.set(key, bucket);
    }

    const entries = Array.from(byMonth.entries()).map(([key, items]) => {
      const [yStr, mStr] = key.split('-');
      const y = Number(yStr);
      const m = Number(mStr);
      const dt = new Date(y, m - 1, 1);
      const label = dt.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

      const totalLiters = items.reduce((s, x) => s + (Number(x.liters) || 0), 0);
      const totalCost = items.reduce((s, x) => s + (Number(x.cost) || 0), 0);

      // Approx avg consumption for that month: compute consumption intervals whose "curr date" is in month
      const consumptionForMonth = consumptionData
        .filter((cd) => {
          const dtd = new Date(cd.date);
          if (Number.isNaN(dtd.getTime())) return false;
          return dtd.getFullYear() === y && dtd.getMonth() === dt.getMonth();
        })
        .map((cd) => cd.consumption);

      const avgConsumption =
        consumptionForMonth.length > 0
          ? consumptionForMonth.reduce((a, b) => a + b, 0) / consumptionForMonth.length
          : null;

      return {
        key,
        label,
        count: items.length,
        totalLiters: Math.round(totalLiters * 10) / 10,
        totalCost: Math.round(totalCost * 100) / 100,
        avgConsumption: avgConsumption != null ? Math.round(avgConsumption * 10) / 10 : null,
      };
    });

    // Show last 2 months max, descending
    entries.sort((a, b) => (a.key < b.key ? 1 : -1));
    return entries.slice(0, 2);
  }, [logs.length, sortedAsc, consumptionData]);

  const vehicleLabel = useMemo(() => {
    if (!activeCar) return 'Vehicle';
    return [activeCar.year, activeCar.make?.trim(), activeCar.model?.trim()].filter(Boolean).join(' ');
  }, [activeCar]);

  const askWrenchyForAnomaly = () => {
    if (!anomaly) return;
    router.push({
      pathname: '/(tabs)/chatbot',
      params: { initialMessage: `Consumption anomaly detected for my ${vehicleLabel}. ${anomaly}` },
    });
  };

  const onDelete = async (logId: string) => {
    Alert.alert('Delete fuel log?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const ok = await deleteFuelLog(logId);
          if (!ok) return Alert.alert('Error', 'Could not delete fuel log.');
          if (activeCar?.id) await fetchLogs(activeCar.id);
        },
      },
    ]);
  };

  const renderLog = ({ item, index }: { item: FuelLog; index: number }) => {
    const prevFull = (() => {
      // previous full tank entry
      const mileageSorted = sortedAsc;
      const idx = mileageSorted.findIndex((l) => l.id === item.id);
      if (idx <= 0) return null;
      for (let i = idx - 1; i >= 0; i--) {
        if (mileageSorted[i].full_tank) return mileageSorted[i];
      }
      return null;
    })();

    const consumptionEstimate = (() => {
      if (!prevFull || !item.full_tank) return null;
      const distance = item.mileage_at_fillup - prevFull.mileage_at_fillup;
      if (distance <= 0) return null;
      const consumption = (item.liters / distance) * 100;
      return Math.round(consumption * 10) / 10;
    })();

    const costPerLiter = item.liters > 0 ? Math.round((item.cost / item.liters) * 100) / 100 : null;
    const consumptionColor = (() => {
      if (consumptionEstimate == null) return c.textMuted;
      // compare against average consumption (rough)
      if (stats.avgConsumption <= 0) return COLORS.blue;
      if (consumptionEstimate <= stats.avgConsumption * 1.03) return COLORS.xpGreen;
      if (consumptionEstimate <= stats.avgConsumption * 1.15) return COLORS.blue;
      return COLORS.heartRed;
    })();

    // Timeline connector color
    return (
      <View>
        <View style={styles.timelineRow}>
          <View style={styles.timelineLeft}>
            <View style={[styles.iconDot, { backgroundColor: COLORS.blue + '20', borderColor: COLORS.blue }]}>
              <Ionicons name="car-sport-outline" size={14} color={COLORS.blue} />
            </View>
            {index < logs.length - 1 && <View style={[styles.connectorLine, { backgroundColor: COLORS.blue }]} />}
          </View>

          <View style={[styles.logCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={styles.logHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 }}>
                <Ionicons name="water-outline" size={18} color={COLORS.primary} />
                <Text style={[TYPE.h3, { color: c.text }]} numberOfLines={1}>
                  {new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  {' · '}
                  {item.mileage_at_fillup.toLocaleString()} km
                </Text>
              </View>
              <TouchableOpacity onPress={() => onDelete(item.id)} hitSlop={8} style={{ paddingLeft: 8 }}>
                <Ionicons name="trash-outline" size={18} color={c.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={[TYPE.bodySM, { color: c.textSecondary, marginTop: 6 }]}>
              {item.liters.toLocaleString()}L · ${item.cost.toFixed(2)}
              {item.station_name ? ` · ${item.station_name}` : ''}
            </Text>

            <Text style={[TYPE.bodySM, { color: c.textSecondary, marginTop: 6 }]}>
              {consumptionEstimate != null ? (
                <>
                  <Text style={{ color: consumptionColor, fontFamily: 'Outfit_700Bold' }}>
                    {consumptionEstimate}
                  </Text>{' '}
                  L/100km ·{' '}
                </>
              ) : (
                <>Consumption: — · </>
              )}
              {costPerLiter != null ? `$${costPerLiter}/L` : '—'}
            </Text>

            <View style={styles.xpRow}>
              <View style={[styles.xpBadge, { borderColor: COLORS.xpGreen }]}>
                <Text style={[TYPE.labelSM, { color: COLORS.xpGreen }]}>+25 XP</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const logsDesc = useMemo(() => [...logs].sort((a, b) => (a.date < b.date ? 1 : -1)), [logs]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
      <StatusBar barStyle="dark-content" backgroundColor={c.background} />
      <View style={[styles.header, { backgroundColor: c.background }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={26} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={[TYPE.displayMD, { color: c.text }]}>Fuel Dashboard</Text>
        <TouchableOpacity
          onPress={() => router.push('/add-fuel')}
          hitSlop={10}
          style={[styles.addBtn, { backgroundColor: COLORS.primary }]}
        >
          <Ionicons name="add" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={[TYPE.bodySM, { color: c.textSecondary, marginTop: SPACING.sm }]}>
            Loading fuel logs...
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <ChunkyCard style={styles.statsCard}>
            <View style={styles.statsGrid}>
              <View style={styles.statsCell}>
                <Text style={[TYPE.statSM, { color: COLORS.blue }]}>
                  {stats.avgConsumption > 0 ? stats.avgConsumption : '—'}
                </Text>
                <Text style={[TYPE.labelSM, { color: c.textSecondary }]}>Avg Consumption</Text>
              </View>
              <View style={styles.statsCell}>
                <Text style={[TYPE.statSM, { color: COLORS.blue }]}>
                  {stats.avgCostPerKm > 0 ? `$${stats.avgCostPerKm.toFixed(2)}/km` : '—'}
                </Text>
                <Text style={[TYPE.labelSM, { color: c.textSecondary }]}>Avg Cost</Text>
              </View>
              <View style={styles.statsCell}>
                <Text style={[TYPE.statSM, { color: COLORS.xpGreen }]}>
                  {stats.avgCostPerLiter > 0 ? `$${stats.avgCostPerLiter.toFixed(2)}/L` : '—'}
                </Text>
                <Text style={[TYPE.labelSM, { color: c.textSecondary }]}>Avg Fuel Price</Text>
              </View>
              <View style={styles.statsCell}>
                <Text style={[TYPE.statSM, { color: c.text }]}>
                  {stats.fillUpCount > 0 ? stats.fillUpCount : '—'}
                </Text>
                <Text style={[TYPE.labelSM, { color: c.textSecondary }]}>Fill-Ups</Text>
              </View>
            </View>
          </ChunkyCard>

          {anomaly && (
            <ChunkyCard style={{ ...styles.anomalyCard, backgroundColor: COLORS.warningLight, borderColor: COLORS.border }}>
              <View style={styles.anomalyRow}>
                <Ionicons name="warning-outline" size={22} color={COLORS.warning} style={{ marginRight: 8 }} />
                <Text style={[TYPE.h3, { color: c.text, flex: 1 }]}>Consumption spike detected</Text>
              </View>
              <Text style={[TYPE.bodySM, { color: c.textSecondary, marginTop: 8 }]}>{anomaly}</Text>
              <TouchableOpacity onPress={askWrenchyForAnomaly} style={[styles.anomalyCTA, { backgroundColor: COLORS.primary }]}>
                <Text style={[TYPE.bodySM, { color: '#FFFFFF', fontFamily: 'Outfit_600SemiBold' }]}>Ask Wrenchy for diagnosis</Text>
              </TouchableOpacity>
            </ChunkyCard>
          )}

          {monthly.length > 0 && (
            <View style={styles.monthlyWrap}>
              {monthly.map((m) => (
                <View key={m.key} style={styles.monthRow}>
                  <Text style={[TYPE.h3, { color: c.text }]}>{m.label}</Text>
                  <Text style={[TYPE.bodySM, { color: c.textSecondary, marginTop: 6 }]}>
                    {m.count} fill-ups · {m.totalLiters}L · ${m.totalCost.toFixed(2)} ·{' '}
                    {m.avgConsumption != null ? `${m.avgConsumption} L/100km` : '—'}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <ChunkyCard style={styles.chartCard}>
            <Text style={[TYPE.h2, { color: c.text, marginBottom: 10 }]}>Consumption Trend</Text>
            {fuelTrendChart ?? (
              <Text style={[TYPE.bodySM, { color: c.textSecondary }]}>
                Log at least 2 full-tank fill-ups to see your trend.
              </Text>
            )}
          </ChunkyCard>

          <ChunkyCard style={styles.historyCard}>
            <Text style={[TYPE.h2, { color: c.text, marginBottom: 10 }]}>Fill-Up History</Text>

            {logsDesc.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="water-outline" size={48} color={COLORS.primary} />
                <Text style={[TYPE.h2, { color: c.text, marginTop: SPACING.sm }]}>No fuel logs yet</Text>
                <Text style={[TYPE.bodySM, { color: c.textSecondary, marginTop: SPACING.xs, textAlign: 'center' }]}>
                  Tap + to log your first fill-up.
                </Text>
              </View>
            ) : (
              <FlatList
                data={logsDesc}
                keyExtractor={(item) => item.id}
                renderItem={renderLog as any}
                scrollEnabled={false}
              />
            )}
          </ChunkyCard>

          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    gap: 10,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.md, paddingBottom: 0 },
  statsCard: { marginBottom: SPACING.lg },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: SPACING.md },
  statsCell: { width: '48%', alignItems: 'center' },
  anomalyCard: { marginBottom: SPACING.lg, padding: 16 },
  anomalyRow: { flexDirection: 'row', alignItems: 'center' },
  anomalyCTA: {
    marginTop: 12,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  monthlyWrap: { marginBottom: SPACING.lg, gap: 14 },
  monthRow: { paddingVertical: 8, borderTopWidth: 1, borderTopColor: COLORS.blue + '22' },
  chartCard: { marginBottom: SPACING.lg, padding: 16 },
  chartStyle: { borderRadius: 16 },
  historyCard: { marginBottom: SPACING.xxxl, padding: 16 },
  emptyState: { alignItems: 'center', paddingVertical: SPACING.xl },
  timelineRow: { flexDirection: 'row', gap: 12, marginBottom: 18 },
  timelineLeft: { width: 34, alignItems: 'center' },
  iconDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectorLine: { width: 2, height: 18, borderRadius: 1, marginTop: 6 },
  logCard: { flex: 1, borderWidth: 1, borderRadius: 14, padding: 14 },
  logHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  xpRow: { marginTop: 12 },
  xpBadge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
});

