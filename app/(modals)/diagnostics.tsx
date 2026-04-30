import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useActiveCar } from '@/contexts/ActiveCarContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useUnits } from '@/contexts/UnitsContext';
import { ThemeColors } from '@/constants/theme-enhanced';
import { formatMileage, getUnitLabel } from '@/utils/formatting';

const OIL_INTERVAL_KM = 8000;
const TIRES_INTERVAL_KM = 10000;
const BRAKES_INTERVAL_KM = 50000;
const COOLANT_INTERVAL_KM = 50000;

const PSI_TOLERANCE_OK = 2;
const PSI_TOLERANCE_WARN = 5;

type CheckStatus = 'good' | 'warning' | 'critical' | 'unknown';

interface DiagnosticItem {
  label: string;
  status: CheckStatus;
  detail: string;
  icon: keyof typeof Ionicons.glyphMap;
}

function getLifePercent(currentKm: number, lastKm: number | undefined | null, intervalKm: number): number {
  if (lastKm == null) return -1;
  const used = currentKm - lastKm;
  return Math.max(0, Math.min(1, 1 - used / intervalKm));
}

function percentToStatus(pct: number): CheckStatus {
  if (pct < 0) return 'unknown';
  if (pct <= 0) return 'critical';
  if (pct <= 0.2) return 'warning';
  return 'good';
}

function tireStatus(actual: number | undefined, recommended: number | undefined): CheckStatus {
  if (actual == null || recommended == null) return 'unknown';
  const diff = Math.abs(actual - recommended);
  if (diff <= PSI_TOLERANCE_OK) return 'good';
  if (diff <= PSI_TOLERANCE_WARN) return 'warning';
  return 'critical';
}

const STATUS_CONFIG: Record<CheckStatus, { color: string; icon: keyof typeof Ionicons.glyphMap; label: string }> = {
  good: { color: '#22C55E', icon: 'checkmark-circle', label: 'Good' },
  warning: { color: '#F59E0B', icon: 'warning', label: 'Attention' },
  critical: { color: '#EF4444', icon: 'alert-circle', label: 'Critical' },
  unknown: { color: '#6B7280', icon: 'help-circle', label: 'No Data' },
};

function overallScore(items: DiagnosticItem[]): { score: number; label: string; color: string } {
  const known = items.filter((i) => i.status !== 'unknown');
  if (known.length === 0) return { score: -1, label: 'No Data', color: '#6B7280' };
  const weights: Record<CheckStatus, number> = { good: 1, warning: 0.5, critical: 0, unknown: 0 };
  const total = known.reduce((sum, i) => sum + weights[i.status], 0);
  const pct = Math.round((total / known.length) * 100);
  const color = pct >= 80 ? '#22C55E' : pct >= 50 ? '#F59E0B' : '#EF4444';
  const label = pct >= 80 ? 'Healthy' : pct >= 50 ? 'Needs Attention' : 'Action Required';
  return { score: pct, label, color };
}

export default function DiagnosticsModal() {
  const router = useRouter();
  const { activeCar } = useActiveCar();
  const { isDark } = useTheme();
  const { unitSystem } = useUnits();

  const health = activeCar?.health;
  const km = activeCar?.mileage ?? 0;
  const unitLabel = getUnitLabel(unitSystem);

  const oilPct = getLifePercent(km, health?.last_oil_change_km, OIL_INTERVAL_KM);
  const tiresPct = getLifePercent(km, health?.last_tire_rotation_km, TIRES_INTERVAL_KM);
  const brakesPct = getLifePercent(km, health?.last_brake_service_km, BRAKES_INTERVAL_KM);
  const coolantPct = getLifePercent(km, health?.last_coolant_flush_km, COOLANT_INTERVAL_KM);

  const flStatus = tireStatus(health?.tire_psi_fl, health?.recommended_psi_front);
  const frStatus = tireStatus(health?.tire_psi_fr, health?.recommended_psi_front);
  const rlStatus = tireStatus(health?.tire_psi_rl, health?.recommended_psi_rear);
  const rrStatus = tireStatus(health?.tire_psi_rr, health?.recommended_psi_rear);

  const tirePressureOverall: CheckStatus =
    [flStatus, frStatus, rlStatus, rrStatus].every((s) => s === 'unknown')
      ? 'unknown'
      : [flStatus, frStatus, rlStatus, rrStatus].some((s) => s === 'critical')
        ? 'critical'
        : [flStatus, frStatus, rlStatus, rrStatus].some((s) => s === 'warning')
          ? 'warning'
          : 'good';

  const formatLife = (pct: number, intervalKm: number) => {
    if (pct < 0) return 'No service recorded';
    const remaining = Math.round(pct * intervalKm);
    return `${formatMileage(remaining, unitSystem)} ${unitLabel} remaining`;
  };

  const items: DiagnosticItem[] = [
    { label: 'Engine Oil', status: percentToStatus(oilPct), detail: formatLife(oilPct, OIL_INTERVAL_KM), icon: 'water' },
    { label: 'Brakes', status: percentToStatus(brakesPct), detail: formatLife(brakesPct, BRAKES_INTERVAL_KM), icon: 'disc' },
    { label: 'Tire Rotation', status: percentToStatus(tiresPct), detail: formatLife(tiresPct, TIRES_INTERVAL_KM), icon: 'car-sport' },
    { label: 'Coolant', status: percentToStatus(coolantPct), detail: formatLife(coolantPct, COOLANT_INTERVAL_KM), icon: 'thermometer' },
    {
      label: 'Tire Pressure',
      status: tirePressureOverall,
      detail:
        tirePressureOverall === 'unknown'
          ? 'No pressure data recorded'
          : tirePressureOverall === 'good'
            ? 'All tires within range'
            : 'Some tires need adjustment',
      icon: 'speedometer',
    },
  ];

  const { score, label: scoreLabel, color: scoreColor } = overallScore(items);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#0F172A' }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#94A3B8" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Vehicle Diagnostics</Text>
        <View style={styles.headerRight} />
      </View>

      {!activeCar ? (
        <View style={styles.empty}>
          <Ionicons name="car-sport-outline" size={48} color="#475569" />
          <Text style={styles.emptyText}>No active vehicle. Set one in Garage.</Text>
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {/* Overall Score */}
          <View style={styles.scoreCard}>
            <Text style={[styles.scoreNumber, { color: scoreColor }]}>
              {score >= 0 ? `${score}%` : '—'}
            </Text>
            <Text style={[styles.scoreLabel, { color: scoreColor }]}>{scoreLabel}</Text>
            <Text style={styles.scoreSub}>
              {activeCar.nickname || `${activeCar.make} ${activeCar.model}`.trim() || 'Vehicle'} {'·'} {formatMileage(km, unitSystem)} {unitLabel}
            </Text>
          </View>

          {/* Checklist */}
          <Text style={styles.sectionTitle}>System Checks</Text>
          {items.map((item) => {
            const cfg = STATUS_CONFIG[item.status];
            return (
              <View key={item.label} style={styles.checkItem}>
                <View style={[styles.checkIcon, { backgroundColor: cfg.color + '20' }]}>
                  <Ionicons name={item.icon} size={20} color={cfg.color} />
                </View>
                <View style={styles.checkContent}>
                  <Text style={styles.checkLabel}>{item.label}</Text>
                  <Text style={styles.checkDetail}>{item.detail}</Text>
                </View>
                <View style={styles.checkStatus}>
                  <Ionicons name={cfg.icon} size={20} color={cfg.color} />
                  <Text style={[styles.checkStatusText, { color: cfg.color }]}>{cfg.label}</Text>
                </View>
              </View>
            );
          })}

          {/* Oil Specs Summary */}
          {(health?.oil_type || health?.oil_capacity) && (
            <>
              <Text style={styles.sectionTitle}>Oil Specs</Text>
              <View style={styles.specCard}>
                {health.oil_type ? (
                  <View style={styles.specRow}>
                    <Text style={styles.specLabel}>Type</Text>
                    <Text style={styles.specValue}>{health.oil_type}</Text>
                  </View>
                ) : null}
                {health.oil_capacity ? (
                  <View style={styles.specRow}>
                    <Text style={styles.specLabel}>Capacity</Text>
                    <Text style={styles.specValue}>{health.oil_capacity}</Text>
                  </View>
                ) : null}
                {health.oil_filter_part_number ? (
                  <View style={styles.specRow}>
                    <Text style={styles.specLabel}>Filter</Text>
                    <Text style={styles.specValue}>{health.oil_filter_part_number}</Text>
                  </View>
                ) : null}
              </View>
            </>
          )}

          {/* Quick links */}
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => router.push('/(modals)/tire-pressure')}
            >
              <Ionicons name="speedometer" size={22} color="#94A3B8" />
              <Text style={styles.actionText}>Tires</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => router.push('/(modals)/oil-specs')}
            >
              <Ionicons name="flask" size={22} color="#94A3B8" />
              <Text style={styles.actionText}>Oil Specs</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => router.push('/(modals)/history')}
            >
              <Ionicons name="time" size={22} color="#94A3B8" />
              <Text style={styles.actionText}>History</Text>
            </TouchableOpacity>
          </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#F8FAFC' },
  headerRight: { width: 32 },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyText: { marginTop: 12, color: '#94A3B8', fontSize: 14, textAlign: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 48 },
  scoreCard: {
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 28,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  scoreNumber: { fontSize: 56, fontWeight: '800', letterSpacing: -1 },
  scoreLabel: { fontSize: 18, fontWeight: '700', marginTop: 4 },
  scoreSub: { fontSize: 14, color: '#94A3B8', marginTop: 8 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    marginTop: 8,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  checkIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkContent: { flex: 1 },
  checkLabel: { fontSize: 15, fontWeight: '700', color: '#F8FAFC', marginBottom: 2 },
  checkDetail: { fontSize: 12, color: '#94A3B8' },
  checkStatus: { alignItems: 'center', minWidth: 60 },
  checkStatusText: { fontSize: 10, fontWeight: '700', marginTop: 2 },
  specCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  specLabel: { fontSize: 14, color: '#94A3B8' },
  specValue: { fontSize: 14, fontWeight: '600', color: '#F8FAFC' },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  actionText: { fontSize: 12, fontWeight: '600', color: '#94A3B8', marginTop: 6 },
});
