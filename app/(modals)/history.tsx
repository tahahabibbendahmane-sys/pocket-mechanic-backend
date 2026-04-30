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
  FlatList,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useActiveCar } from '@/contexts/ActiveCarContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useUnits } from '@/contexts/UnitsContext';
import { ThemeColors } from '@/constants/theme-enhanced';
import { formatDate, formatMileage, getUnitLabel } from '@/utils/formatting';
import type { ServiceLog, ServiceTypeLabel } from '@/types/service';

const SERVICE_TYPES: { label: ServiceTypeLabel; icon: keyof typeof Ionicons.glyphMap }[] = [
  { label: 'Oil Change', icon: 'water' },
  { label: 'Tire Rotation', icon: 'car-sport' },
  { label: 'Brake Job', icon: 'construct' },
  { label: 'Inspection', icon: 'search' },
  { label: 'Other', icon: 'ellipsis-horizontal' },
];

function toDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default function HistoryModal() {
  const router = useRouter();
  const { activeCar, serviceLogs, addServiceLog, fetchServiceLogs } = useActiveCar();
  const { theme, isDark } = useTheme();
  const { unitSystem } = useUnits();
  const colors = ThemeColors[theme];

  const [addVisible, setAddVisible] = useState(false);
  const [serviceType, setServiceType] = useState<ServiceTypeLabel>('Oil Change');
  const [date, setDate] = useState(toDateOnly(new Date()));
  const [mileage, setMileage] = useState('');
  const [cost, setCost] = useState('');
  const [notes, setNotes] = useState('');
  const [updateHealth, setUpdateHealth] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentMileage = activeCar?.mileage ?? 0;
  const unitLabel = getUnitLabel(unitSystem);

  const openAdd = useCallback(() => {
    setDate(toDateOnly(new Date()));
    setMileage(String(currentMileage));
    setCost('');
    setNotes('');
    setUpdateHealth(true);
    setError(null);
    setAddVisible(true);
  }, [currentMileage]);

  const handleSave = useCallback(async () => {
    if (!activeCar?.id) return;
    const mileageNum = parseInt(mileage.trim(), 10);
    if (isNaN(mileageNum) || mileageNum < 0) {
      setError('Enter a valid mileage');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await addServiceLog(
        {
          vehicle_id: activeCar.id,
          service_type: serviceType,
          date,
          mileage: mileageNum,
          cost: cost.trim() ? parseFloat(cost) : undefined,
          notes: notes.trim() || undefined,
        },
        updateHealth
      );
      setAddVisible(false);
      if (activeCar.id) fetchServiceLogs(activeCar.id);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, [activeCar, serviceType, date, mileage, cost, notes, updateHealth, addServiceLog, fetchServiceLogs]);

  const renderCard = useCallback(
    ({ item }: { item: ServiceLog }) => (
      <View style={[styles.card, { backgroundColor: isDark ? '#1E293B' : '#1E293B' }]}>
        <View style={styles.cardRow}>
          <View style={styles.cardLeft}>
            <ThemedText style={styles.cardDate}>{formatDate(item.date)}</ThemedText>
            <ThemedText style={[styles.cardType, { color: '#F8FAFC' }]}>{item.service_type}</ThemedText>
            <ThemedText style={[styles.cardMileage, { color: '#94A3B8' }]}>
              {formatMileage(item.mileage, unitSystem)} {unitLabel}
            </ThemedText>
          </View>
          {item.cost != null && item.cost > 0 && (
            <Text style={[styles.cardCost, { color: colors.success }]}>${item.cost.toFixed(0)}</Text>
          )}
        </View>
        {item.notes ? (
          <Text style={[styles.cardNotes, { color: '#94A3B8' }]} numberOfLines={2}>
            {item.notes}
          </Text>
        ) : null}
      </View>
    ),
    [isDark, unitSystem, unitLabel, colors.success]
  );

  const keyExtractor = useCallback((item: ServiceLog) => item.id, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#0F172A' }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#94A3B8" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Service History</Text>
        <TouchableOpacity onPress={openAdd} style={styles.addBtn} disabled={!activeCar}>
          <Ionicons name="add" size={26} color={activeCar ? colors.primary : '#64748B'} />
        </TouchableOpacity>
      </View>

      {!activeCar ? (
        <ThemedView style={styles.empty}>
          <Ionicons name="car-sport-outline" size={48} color="#475569" />
          <Text style={[styles.emptyText, { color: '#94A3B8' }]}>
            No active vehicle. Set one in Garage.
          </Text>
        </ThemedView>
      ) : serviceLogs.length === 0 ? (
        <ThemedView style={styles.empty}>
          <Ionicons name="document-text-outline" size={56} color="#475569" />
          <Text style={[styles.emptyTitle, { color: '#F8FAFC' }]}>No service history yet</Text>
          <Text style={[styles.emptySub, { color: '#94A3B8' }]}>Tap + to log maintenance</Text>
          <TouchableOpacity style={[styles.emptyBtn, { backgroundColor: colors.primary }]} onPress={openAdd}>
            <Text style={styles.emptyBtnText}>Add Service</Text>
          </TouchableOpacity>
        </ThemedView>
      ) : (
        <FlatList
          data={serviceLogs}
          renderItem={renderCard}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal visible={addVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalSheet, { backgroundColor: '#1E293B' }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Log Service</Text>
              <TouchableOpacity onPress={() => setAddVisible(false)}>
                <Ionicons name="close" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
              <Text style={[styles.fieldLabel, { color: '#94A3B8' }]}>Service type</Text>
              <View style={styles.pillRow}>
                {SERVICE_TYPES.map(({ label, icon }) => (
                  <TouchableOpacity
                    key={label}
                    style={[
                      styles.pill,
                      serviceType === label && { backgroundColor: colors.primary },
                    ]}
                    onPress={() => setServiceType(label)}
                  >
                    <Ionicons
                      name={icon}
                      size={16}
                      color={serviceType === label ? '#FFF' : '#94A3B8'}
                    />
                    <Text
                      style={[
                        styles.pillText,
                        { color: serviceType === label ? '#FFF' : '#94A3B8' },
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.fieldLabel, { color: '#94A3B8' }]}>Date</Text>
              <TextInput
                style={[styles.input, { backgroundColor: '#0F172A', color: '#F8FAFC' }]}
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#64748B"
              />

              <Text style={[styles.fieldLabel, { color: '#94A3B8' }]}>Mileage ({unitLabel})</Text>
              <TextInput
                style={[styles.input, { backgroundColor: '#0F172A', color: '#F8FAFC' }]}
                value={mileage}
                onChangeText={setMileage}
                placeholder={String(currentMileage)}
                placeholderTextColor="#64748B"
                keyboardType="number-pad"
              />

              <Text style={[styles.fieldLabel, { color: '#94A3B8' }]}>Cost (optional)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: '#0F172A', color: '#F8FAFC' }]}
                value={cost}
                onChangeText={setCost}
                placeholder="0"
                placeholderTextColor="#64748B"
                keyboardType="decimal-pad"
              />

              <Text style={[styles.fieldLabel, { color: '#94A3B8' }]}>Notes (optional)</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline, { backgroundColor: '#0F172A', color: '#F8FAFC' }]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Details..."
                placeholderTextColor="#64748B"
                multiline
                numberOfLines={3}
              />

              <TouchableOpacity
                style={styles.checkRow}
                onPress={() => setUpdateHealth((v) => !v)}
                activeOpacity={0.8}
              >
                <View style={[styles.checkbox, updateHealth && { backgroundColor: colors.primary }]}>
                  {updateHealth && <Ionicons name="checkmark" size={16} color="#FFF" />}
                </View>
                <Text style={[styles.checkLabel, { color: '#CBD5E1' }]}>
                  Update vehicle health? (e.g. reset Oil / Tire / Brake interval)
                </Text>
              </TouchableOpacity>

              {error ? (
                <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
              ) : null}

              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save'}</Text>
              </TouchableOpacity>
            </ScrollView>
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
    borderBottomColor: '#334155',
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#F8FAFC' },
  addBtn: { padding: 4 },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyText: { marginTop: 12, fontSize: 14, textAlign: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 16 },
  emptySub: { fontSize: 14, marginTop: 8 },
  emptyBtn: { marginTop: 24, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 },
  emptyBtnText: { color: '#FFF', fontWeight: '700' },
  listContent: { padding: 16, paddingBottom: 40 },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardLeft: {},
  cardDate: { fontSize: 12, color: '#94A3B8', marginBottom: 4 },
  cardType: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  cardMileage: { fontSize: 14 },
  cardCost: { fontSize: 16, fontWeight: '700' },
  cardNotes: { fontSize: 12, marginTop: 8 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#475569',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#F8FAFC' },
  modalScroll: { paddingHorizontal: 20, paddingBottom: 32 },
  fieldLabel: { fontSize: 12, marginBottom: 8, marginTop: 12 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#334155',
  },
  pillText: { fontSize: 13, fontWeight: '600' },
  input: {
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
  },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  checkRow: { flexDirection: 'row', alignItems: 'center', marginTop: 20, gap: 12 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#64748B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkLabel: { flex: 1, fontSize: 14 },
  errorText: { marginTop: 12, fontSize: 14 },
  saveBtn: { marginTop: 24, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
});

/*
  Supabase: create service_logs table with RLS (run in SQL editor):

  CREATE TABLE public.service_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    service_type TEXT NOT NULL,
    date DATE NOT NULL,
    mileage NUMERIC NOT NULL,
    cost NUMERIC,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
  );

  ALTER TABLE public.service_logs ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "Users can view own vehicle service logs"
    ON public.service_logs FOR SELECT
    USING (auth.uid() = user_id);

  CREATE POLICY "Users can insert own vehicle service logs"
    ON public.service_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

  CREATE POLICY "Users can update own vehicle service logs"
    ON public.service_logs FOR UPDATE
    USING (auth.uid() = user_id);

  CREATE POLICY "Users can delete own vehicle service logs"
    ON public.service_logs FOR DELETE
    USING (auth.uid() = user_id);
*/
