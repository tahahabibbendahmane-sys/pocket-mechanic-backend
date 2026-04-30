import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedView } from '@/components/themed-view';
import { useActiveCar } from '@/contexts/ActiveCarContext';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemeColors } from '@/constants/theme-enhanced';

const OIL_ICON_COLOR = '#EAB308'; // Gold/Yellow for oil drop

export default function OilSpecsModal() {
  const router = useRouter();
  const { activeCar, updateVehicleHealth } = useActiveCar();
  const { theme, isDark } = useTheme();
  const colors = ThemeColors[theme];

  const health = activeCar?.health;
  const [editing, setEditing] = useState(false);
  const [oilType, setOilType] = useState(health?.oil_type ?? '');
  const [oilCapacity, setOilCapacity] = useState(health?.oil_capacity ?? '');
  const [oilFilter, setOilFilter] = useState(health?.oil_filter_part_number ?? '');
  const [saving, setSaving] = useState(false);

  const hasAnySpec =
    (health?.oil_type?.trim()?.length ?? 0) > 0 ||
    (health?.oil_capacity?.trim()?.length ?? 0) > 0 ||
    (health?.oil_filter_part_number?.trim()?.length ?? 0) > 0;

  const startEdit = useCallback(() => {
    setOilType(health?.oil_type ?? '');
    setOilCapacity(health?.oil_capacity ?? '');
    setOilFilter(health?.oil_filter_part_number ?? '');
    setEditing(true);
  }, [health]);

  const handleSave = useCallback(async () => {
    if (!activeCar?.id) return;
    setSaving(true);
    try {
      await updateVehicleHealth(activeCar.id, {
        oil_type: oilType.trim() || undefined,
        oil_capacity: oilCapacity.trim() || undefined,
        oil_filter_part_number: oilFilter.trim() || undefined,
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }, [activeCar?.id, oilType, oilCapacity, oilFilter, updateVehicleHealth]);

  const handleCancel = useCallback(() => {
    setOilType(health?.oil_type ?? '');
    setOilCapacity(health?.oil_capacity ?? '');
    setOilFilter(health?.oil_filter_part_number ?? '');
    setEditing(false);
  }, [health]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#0F172A' }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#94A3B8" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Oil Specifications</Text>
        {!editing ? (
          <TouchableOpacity
            onPress={startEdit}
            style={styles.editBtn}
            disabled={!activeCar}
          >
            <Text style={[styles.editBtnText, { color: activeCar ? colors.primary : '#64748B' }]}>
              Edit Specs
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={handleCancel} style={styles.editBtn}>
            <Text style={[styles.editBtnText, { color: '#94A3B8' }]}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>

      {!activeCar ? (
        <ThemedView style={styles.empty}>
          <Ionicons name="car-sport-outline" size={48} color="#475569" />
          <Text style={[styles.emptyText, { color: '#94A3B8' }]}>
            No active vehicle. Set one in Garage.
          </Text>
        </ThemedView>
      ) : editing ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={[styles.fieldLabel, { color: '#94A3B8' }]}>Oil type (e.g. 5W-30 Synthetic)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: '#1E293B', color: '#F8FAFC' }]}
              value={oilType}
              onChangeText={setOilType}
              placeholder="5W-30 Synthetic"
              placeholderTextColor="#64748B"
              autoCapitalize="none"
            />
            <Text style={[styles.fieldLabel, { color: '#94A3B8' }]}>Capacity (e.g. 5.7L)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: '#1E293B', color: '#F8FAFC' }]}
              value={oilCapacity}
              onChangeText={setOilCapacity}
              placeholder="5.7 Liters"
              placeholderTextColor="#64748B"
            />
            <Text style={[styles.fieldLabel, { color: '#94A3B8' }]}>Filter part number (optional)</Text>
            <TextInput
              style={[styles.input, styles.inputMono, { backgroundColor: '#1E293B', color: '#F8FAFC' }]}
              value={oilFilter}
              onChangeText={setOilFilter}
              placeholder="e.g. Fram PH3614"
              placeholderTextColor="#64748B"
              autoCapitalize="characters"
            />
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.primary }]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      ) : !hasAnySpec ? (
        <ThemedView style={styles.empty}>
          <View style={[styles.emptyIconWrap, { backgroundColor: '#1E293B' }]}>
            <Ionicons name="water" size={56} color={OIL_ICON_COLOR} />
          </View>
          <Text style={[styles.emptyTitle, { color: '#F8FAFC' }]}>No oil specs saved</Text>
          <Text style={[styles.emptySub, { color: '#94A3B8' }]}>Tap Edit to add them.</Text>
          <TouchableOpacity style={[styles.emptyBtn, { backgroundColor: colors.primary }]} onPress={startEdit}>
            <Text style={styles.emptyBtnText}>Edit Specs</Text>
          </TouchableOpacity>
        </ThemedView>
      ) : (
        <View style={styles.cardWrap}>
          <View style={[styles.card, { backgroundColor: '#1E293B' }]}>
            <View style={[styles.iconWrap, { backgroundColor: '#334155' }]}>
              <Ionicons name="water" size={48} color={OIL_ICON_COLOR} />
            </View>
            <Text style={styles.cardLabel}>Digital glovebox</Text>
            <Text style={[styles.oilType, { color: '#F8FAFC' }]}>
              {health?.oil_type?.trim() || '—'}
            </Text>
            <Text style={[styles.capacity, { color: '#94A3B8' }]}>
              Capacity: {health?.oil_capacity?.trim() || '—'}
            </Text>
            {health?.oil_filter_part_number?.trim() ? (
              <Text style={[styles.filterPart, { color: '#CBD5E1' }]}>
                {health.oil_filter_part_number.trim()}
              </Text>
            ) : null}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
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
  editBtn: { padding: 4 },
  editBtnText: { fontSize: 16, fontWeight: '600' },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyText: { marginTop: 12, fontSize: 14, textAlign: 'center' },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginTop: 8 },
  emptySub: { fontSize: 14, marginTop: 8 },
  emptyBtn: { marginTop: 24, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 },
  emptyBtnText: { color: '#FFF', fontWeight: '700' },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  fieldLabel: { fontSize: 12, marginBottom: 8, marginTop: 16 },
  input: { borderRadius: 10, padding: 14, fontSize: 16 },
  inputMono: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  saveBtn: { marginTop: 28, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  cardWrap: { flex: 1, padding: 20, justifyContent: 'center' },
  card: {
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  cardLabel: { fontSize: 12, color: '#64748B', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  oilType: { fontSize: 32, fontWeight: '800', marginBottom: 12, textAlign: 'center' },
  capacity: { fontSize: 18, marginBottom: 8 },
  filterPart: { fontSize: 16, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', marginTop: 8 },
});

/*
  Supabase: add oil spec columns to vehicle_health (run in SQL editor):

  ALTER TABLE public.vehicle_health
  ADD COLUMN IF NOT EXISTS oil_type TEXT,
  ADD COLUMN IF NOT EXISTS oil_capacity TEXT,
  ADD COLUMN IF NOT EXISTS oil_filter_part_number TEXT;
*/
