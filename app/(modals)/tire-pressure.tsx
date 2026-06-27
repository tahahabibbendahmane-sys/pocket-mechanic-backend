import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useActiveCar } from '@/contexts/ActiveCarContext';
import { COLORS } from '@/constants/DesignSystem';
import { ThemeColors } from '@/constants/theme-enhanced';
const PSI_TOLERANCE_OK = 2;
const PSI_TOLERANCE_WARN = 5;

type TireKey = 'tire_psi_fl' | 'tire_psi_fr' | 'tire_psi_rl' | 'tire_psi_rr';
type TargetKey = 'recommended_psi_front' | 'recommended_psi_rear';

function getTireStatus(
  actual: number | undefined,
  recommended: number | undefined
): 'ok' | 'warn' | 'bad' | 'empty' {
  if (actual == null || recommended == null) return 'empty';
  const diff = Math.abs(actual - recommended);
  if (diff <= PSI_TOLERANCE_OK) return 'ok';
  if (diff <= PSI_TOLERANCE_WARN) return 'warn';
  return 'bad';
}

const STATUS_OK = 'ok';
const STATUS_WARN = 'warn';
const STATUS_BAD = 'bad';

function getStatusColor(
  status: 'ok' | 'warn' | 'bad' | 'empty',
  colors: typeof ThemeColors.light
): string {
  if (status === STATUS_OK) return colors.success;
  if (status === STATUS_WARN) return colors.warning;
  if (status === STATUS_BAD) return colors.error;
  return colors.textTertiary;
}

export default function TirePressureModal() {
  const router = useRouter();
  const { activeCar, updateVehicleHealth } = useActiveCar();
  const colors = ThemeColors.light;

  const health = activeCar?.health;
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editTarget, setEditTarget] = useState<TireKey | TargetKey | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  const recommendedFront = health?.recommended_psi_front;
  const recommendedRear = health?.recommended_psi_rear;

  const openTireEdit = useCallback((key: TireKey) => {
    const val = health?.[key];
    setEditTarget(key);
    setEditValue(val != null ? String(val) : '');
    setEditModalVisible(true);
  }, [health]);

  const openTargetEdit = useCallback((key: TargetKey) => {
    const val = health?.[key];
    setEditTarget(key);
    setEditValue(val != null ? String(val) : '');
    setEditModalVisible(true);
  }, [health]);

  const handleSaveEdit = useCallback(async () => {
    if (!activeCar?.id || editTarget == null) return;
    const num = parseInt(editValue.trim(), 10);
    if (isNaN(num) || num < 0 || num > 99) return;
    setSaving(true);
    try {
      await updateVehicleHealth(activeCar.id, { [editTarget]: num });
      setEditModalVisible(false);
      setEditTarget(null);
      setEditValue('');
    } finally {
      setSaving(false);
    }
  }, [activeCar?.id, editTarget, editValue, updateVehicleHealth]);

  function getModalTitle(target: TireKey | TargetKey | null): string {
  if (!target) return 'Set PSI';
  if (target === 'recommended_psi_front') return 'Target Front (PSI)';
  if (target === 'recommended_psi_rear') return 'Target Rear (PSI)';
  return `Actual PSI — ${tireLabel(target as TireKey)}`;
}

const tireLabel = (key: TireKey): string => {
    if (key === 'tire_psi_fl') return 'FL';
    if (key === 'tire_psi_fr') return 'FR';
    if (key === 'tire_psi_rl') return 'RL';
    return 'RR';
  };

  const renderTire = (key: TireKey, recommended: number | undefined) => {
    const actual = health?.[key];
    const status = getTireStatus(actual, recommended);
    const color = getStatusColor(status, colors);
    return (
      <TouchableOpacity
        key={key}
        style={[styles.tireBox, { backgroundColor: COLORS.surface, borderColor: color }]}
        onPress={() => openTireEdit(key)}
        activeOpacity={0.8}
      >
        <Text style={[styles.tireLabel, { color: colors.textTertiary }]}>{tireLabel(key)}</Text>
        <Text style={[styles.tirePsi, { color }]}>{actual != null ? `${actual}` : '—'}</Text>
        <Text style={[styles.tireUnit, { color: colors.textTertiary }]}>{'PSI'}</Text>
        {status === STATUS_OK && (
          <Ionicons name="checkmark-circle" size={16} color={color} style={styles.tireIcon} />
        )}
        {(status === STATUS_WARN || status === STATUS_BAD) && (
          <Ionicons name="warning" size={16} color={color} style={styles.tireIcon} />
        )}
      </TouchableOpacity>
    );
  };

  const hasAnyTireData =
    health?.tire_psi_fl != null ||
    health?.tire_psi_fr != null ||
    health?.tire_psi_rl != null ||
    health?.tire_psi_rr != null;
  const lastUpdatedText = hasAnyTireData ? 'Last updated when values were set' : 'No data yet — tap tires to set';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: COLORS.background }]} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textMuted} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: COLORS.text }]}>{'Tire Pressure Monitor'}</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.lastUpdatedRow}>
          <Ionicons name="time-outline" size={14} color={COLORS.textMuted} />
          <ThemedText style={styles.lastUpdated}>{lastUpdatedText}</ThemedText>
        </View>

        {!activeCar ? (
          <ThemedView style={styles.noCar}>
            <Ionicons name="car-sport-outline" size={48} color={COLORS.textMuted} />
            <Text style={[styles.noCarText, { color: COLORS.textMuted }]}>
              No active vehicle. Set one in Garage.
            </Text>
          </ThemedView>
        ) : (
          <>
            {/* Recommended targets */}
            <View
              style={[
                styles.targetsRow,
                { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
              ]}
            >
              <TouchableOpacity
                style={styles.targetBlock}
                onPress={() => openTargetEdit('recommended_psi_front')}
              >
                <Text style={[styles.targetLabel, { color: COLORS.textMuted }]}>{'Target Front'}</Text>
                <Text style={[styles.targetValue, { color: COLORS.text }]}>
                  {recommendedFront != null ? `${recommendedFront} PSI` : 'Set'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.targetBlock}
                onPress={() => openTargetEdit('recommended_psi_rear')}
              >
                <Text style={[styles.targetLabel, { color: COLORS.textMuted }]}>{'Target Rear'}</Text>
                <Text style={[styles.targetValue, { color: COLORS.text }]}>
                  {recommendedRear != null ? `${recommendedRear} PSI` : 'Set'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Car diagram: top row FL, FR; center car; bottom RL, RR */}
            <View style={styles.diagram}>
              <View style={styles.tireRow}>
                {renderTire('tire_psi_fl', recommendedFront)}
                {renderTire('tire_psi_fr', recommendedFront)}
              </View>
              <View style={[styles.carBody, { backgroundColor: COLORS.surface }]}>
                <Ionicons name="car-sport" size={32} color={COLORS.textMuted} />
                <Text style={[styles.carBodyText, { color: COLORS.textMuted }]}>Vehicle</Text>
              </View>
              <View style={styles.tireRow}>
                {renderTire('tire_psi_rl', recommendedRear)}
                {renderTire('tire_psi_rr', recommendedRear)}
              </View>
            </View>

            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
                <Text style={[styles.legendText, { color: COLORS.textMuted }]}>Within ±2 PSI</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.warning }]} />
                <Text style={[styles.legendText, { color: COLORS.textMuted }]}>±3–5 PSI</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.error }]} />
                <Text style={[styles.legendText, { color: COLORS.textMuted }]}>&gt;5 PSI off</Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      <Modal visible={editModalVisible} transparent animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: COLORS.card }]}>
            <ThemedText style={styles.modalTitle}>
              {getModalTitle(editTarget)}
            </ThemedText>
            <TextInput
              style={[styles.modalInput, { backgroundColor: COLORS.surface, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border }]}
              value={editValue}
              onChangeText={setEditValue}
              placeholder="e.g. 32"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="number-pad"
              maxLength={3}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setEditModalVisible(false)}>
                <Text style={styles.modalBtnCancelText}>{'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtnSave, { backgroundColor: colors.primary }]}
                onPress={handleSaveEdit}
                disabled={saving}
              >
                <Text style={styles.modalBtnSaveText}>{saving ? 'Saving…' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    borderBottomColor: COLORS.border,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerRight: { width: 32 },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  lastUpdatedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
  },
  lastUpdated: { fontSize: 12, color: COLORS.textMuted },
  noCar: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  noCarText: { marginTop: 12, color: COLORS.textMuted, fontSize: 14 },
  targetsRow: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 16,
  },
  targetBlock: { flex: 1 },
  targetLabel: { fontSize: 12, marginBottom: 4 },
  targetValue: { fontSize: 18, fontWeight: '700' },
  diagram: { alignItems: 'center', marginBottom: 24 },
  tireRow: { flexDirection: 'row', gap: 24, marginVertical: 12 },
  tireBox: {
    width: 88,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
  },
  tireLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  tirePsi: { fontSize: 22, fontWeight: '800' },
  tireUnit: { fontSize: 10, marginTop: 2 },
  tireIcon: { position: 'absolute', top: 6, right: 6 },
  carBody: {
    width: 160,
    paddingVertical: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  carBodyText: { fontSize: 12, color: COLORS.textMuted, marginTop: 6 },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 20, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: COLORS.textMuted },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: { borderRadius: 16, padding: 24 },
  modalTitle: { fontSize: 16, fontWeight: '600', marginBottom: 16, color: COLORS.text },
  modalInput: {
    borderRadius: 10,
    padding: 14,
    fontSize: 18,
    marginBottom: 20,
  },
  modalActions: { flexDirection: 'row', gap: 12, justifyContent: 'flex-end' },
  modalBtnCancel: { paddingVertical: 12, paddingHorizontal: 20 },
  modalBtnCancelText: { color: COLORS.textMuted, fontWeight: '600' },
  modalBtnSave: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10 },
  modalBtnSaveText: { color: COLORS.white, fontWeight: '700' },
});

/*
  Supabase: add tire pressure columns to vehicle_health (run in SQL editor):

  ALTER TABLE public.vehicle_health
  ADD COLUMN IF NOT EXISTS tire_psi_fl NUMERIC,
  ADD COLUMN IF NOT EXISTS tire_psi_fr NUMERIC,
  ADD COLUMN IF NOT EXISTS tire_psi_rl NUMERIC,
  ADD COLUMN IF NOT EXISTS tire_psi_rr NUMERIC,
  ADD COLUMN IF NOT EXISTS recommended_psi_front NUMERIC,
  ADD COLUMN IF NOT EXISTS recommended_psi_rear NUMERIC;
*/
