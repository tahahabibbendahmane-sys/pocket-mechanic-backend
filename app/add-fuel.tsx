import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StatusBar,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useActiveCar } from '@/contexts/ActiveCarContext';
import { supabase } from '@/lib/supabase';
import { useXP } from '@/contexts/XPContext';

import { COLORS, RADIUS, SPACING, TYPE, getColors } from '@/constants/DesignSystem';
import { ChunkyCard } from '@/components/ui/ChunkyCard';
import { ChunkyButton } from '@/components/ui/ChunkyButton';

import {
  addFuelLog,
  checkFuelAnomaly,
  calculateConsumption,
  calculateFuelStats,
  getFuelLogs,
} from '@/lib/fuelTracking';

const FUEL_TYPES = ['regular', 'mid-grade', 'premium', 'diesel'] as const;

type Params = {
  vehicleId?: string;
};

export default function AddFuelScreen() {
  const router = useRouter();
  const { vehicleId: vehicleIdParam } = useLocalSearchParams<Params>();
  const c = getColors();

  const { activeCar, vehicles, fetchVehicles } = useActiveCar();
  const { earnXP } = useXP();

  const resolvedVehicle = useMemo(() => {
    const paramId = typeof vehicleIdParam === 'string' ? vehicleIdParam : undefined;
    if (paramId) return vehicles.find((v: any) => v.id === paramId) ?? activeCar;
    return activeCar;
  }, [activeCar, vehicles, vehicleIdParam]);

  const [loading, setLoading] = useState(true);
  const [fuelLogs, setFuelLogs] = useState<any[]>([]);

  // Form state
  const [date, setDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [mileageAtFillup, setMileageAtFillup] = useState<string>('');
  const [liters, setLiters] = useState<string>('');
  const [cost, setCost] = useState<string>('');
  const [fullTank, setFullTank] = useState(true);
  const [fuelType, setFuelType] = useState<(typeof FUEL_TYPES)[number]>('regular');
  const [stationName, setStationName] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!resolvedVehicle?.id) return;
      setLoading(true);
      try {
        const logs = await getFuelLogs(resolvedVehicle.id);
        if (cancelled) return;
        setFuelLogs(logs);
        setMileageAtFillup(String(resolvedVehicle.mileage ?? 0));
      } catch (e) {
        if (cancelled) return;
        setFuelLogs([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [resolvedVehicle?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const vehicleMileageNumber = useMemo(() => {
    const parsed = parseInt(mileageAtFillup.replace(/[^0-9]/g, ''), 10);
    return Number.isNaN(parsed) ? 0 : parsed;
  }, [mileageAtFillup]);

  const litersNumber = useMemo(() => {
    const parsed = Number(liters);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [liters]);

  const costNumber = useMemo(() => {
    const parsed = Number(cost);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [cost]);

  const costPerLiter = useMemo(() => {
    if (litersNumber <= 0) return null;
    return Math.round((costNumber / litersNumber) * 100) / 100;
  }, [costNumber, litersNumber]);

  const estimatedConsumptionForThisTank = useMemo(() => {
    // Estimate consumption using the most recent FULL tank before the entered odometer.
    if (!fuelLogs.length) return null;
    const mileage = vehicleMileageNumber;
    if (mileage <= 0) return null;

    const prevFull = [...fuelLogs]
      .sort((a, b) => a.mileage_at_fillup - b.mileage_at_fillup)
      .filter((l) => l.full_tank && l.mileage_at_fillup < mileage)
      .slice(-1)[0];

    if (!prevFull || !fullTank) return null;
    const distance = mileage - prevFull.mileage_at_fillup;
    if (distance <= 0 || litersNumber <= 0) return null;

    const consumption = (litersNumber / distance) * 100; // L/100km
    return Math.round(consumption * 10) / 10;
  }, [fullTank, fuelLogs, litersNumber, vehicleMileageNumber]);

  const handleSave = async () => {
    if (!resolvedVehicle?.id) return;

    const mileageParsed = vehicleMileageNumber;
    if (mileageParsed <= 0) {
      Alert.alert('Invalid Odometer', 'Please enter a valid odometer reading.');
      return;
    }
    if (mileageParsed < (resolvedVehicle.mileage ?? 0)) {
      Alert.alert(
        'Mileage too low',
        "Odometer must be greater than or equal to the vehicle's current mileage."
      );
      return;
    }
    if (litersNumber <= 0) {
      Alert.alert('Invalid Liters', 'Please enter how many liters you filled.');
      return;
    }
    if (costNumber <= 0) {
      Alert.alert('Invalid Cost', 'Please enter the total cost for this fill-up.');
      return;
    }

    setSaving(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      const user = authError ? null : authData?.user;
      if (!user) {
        Alert.alert('Not signed in', 'Please sign in again and try logging fuel.');
        return;
      }

      const logDateIso = date.toISOString();

      const created = await addFuelLog({
        user_id: user.id,
        vehicle_id: resolvedVehicle.id,
        date: logDateIso,
        mileage_at_fillup: mileageParsed,
        liters: litersNumber,
        cost: costNumber,
        fuel_type: fuelType,
        full_tank: fullTank,
        station_name: stationName.trim() || null,
        notes: notes.trim() || null,
      });

      if (!created) {
        Alert.alert('Upload Failed', 'Could not save this fuel log. Please try again.');
        return;
      }

      // Keep mileage in sync if user entered a higher odometer reading.
      if (mileageParsed > (resolvedVehicle.mileage ?? 0)) {
        await supabase
          .from('vehicles')
          .update({ current_mileage: mileageParsed })
          .eq('id', resolvedVehicle.id)
          .eq('user_id', user.id);
        await fetchVehicles();
      }

      const updatedLogs = await getFuelLogs(resolvedVehicle.id);
      setFuelLogs(updatedLogs);

      const anomaly = checkFuelAnomaly(updatedLogs);
      if (anomaly) {
        Alert.alert('Fuel anomaly detected', anomaly, [
          {
            text: 'Ask Wrenchy',
            onPress: () => {
              router.push({
                pathname: '/(tabs)/chatbot',
                params: { initialMessage: `Is my fuel consumption normal? ${anomaly}` },
              });
            },
          },
          { text: 'OK', style: 'cancel' },
        ]);
      }

      // Award XP
      await earnXP('LOG_FUEL');

      router.back();
    } catch (e: any) {
      console.error('[AddFuel] Error:', e);
      Alert.alert('Error', e?.message || 'Could not save fuel log.');
    } finally {
      setSaving(false);
    }
  };

  if (!resolvedVehicle) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.emptyCenter}>
          <Text style={[TYPE.h2, { color: c.text }]}>No vehicle selected</Text>
          <Text style={[TYPE.bodySM, { color: c.textSecondary, marginTop: SPACING.sm }]}>
            Go to Garage to pick an active vehicle.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.background, paddingTop: 0 }]}>
      <StatusBar barStyle="dark-content" backgroundColor={c.background} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={26} color={COLORS.blue} />
          </TouchableOpacity>
          <Text style={[TYPE.displayMD, { color: c.text }]}>Log fill-up</Text>
          <View style={styles.headerRightSpacer} />
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={COLORS.blue} />
            <Text style={[TYPE.bodySM, { color: c.textSecondary, marginTop: SPACING.sm }]}>
              Loading fuel history...
            </Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <ChunkyCard style={styles.card}>
              <View style={styles.rowBetween}>
                <View style={{ flex: 1 }}>
                  <Text style={[TYPE.labelSM, { color: c.textSecondary }]}>Vehicle</Text>
                  <Text style={[TYPE.h2, { color: c.text, marginTop: SPACING.xs }]}>
                    {[resolvedVehicle.year, resolvedVehicle.make?.trim?.(), resolvedVehicle.model?.trim?.()]
                      .filter(Boolean)
                      .join(' ')}
                  </Text>
                </View>
              </View>

              <View style={styles.grid}>
                <TouchableOpacity
                  style={styles.field}
                  onPress={() => setShowDatePicker(true)}
                  activeOpacity={0.8}
                >
                  <Text style={[TYPE.labelSM, { color: c.textSecondary }]}>Date</Text>
                  <Text style={[TYPE.h3, { color: c.text, marginTop: 6 }]}>
                    {date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </Text>
                </TouchableOpacity>

                <View style={styles.field}>
                  <Text style={[TYPE.labelSM, { color: c.textSecondary }]}>Odometer</Text>
                  <TextInput
                    value={mileageAtFillup}
                    onChangeText={setMileageAtFillup}
                    keyboardType="number-pad"
                    style={[styles.input, { color: c.text }]}
                  />
                  <Text style={[TYPE.bodySM, { color: c.textSecondary, marginTop: 6, textAlign: 'center' }]}>
                    km
                  </Text>
                </View>

                <View style={styles.field}>
                  <Text style={[TYPE.labelSM, { color: c.textSecondary }]}>Liters</Text>
                  <TextInput
                    value={liters}
                    onChangeText={setLiters}
                    keyboardType="decimal-pad"
                    style={[styles.input, { color: c.text }]}
                  />
                  <Text style={[TYPE.bodySM, { color: c.textSecondary, marginTop: 6, textAlign: 'center' }]}>
                    L
                  </Text>
                </View>

                <View style={styles.field}>
                  <Text style={[TYPE.labelSM, { color: c.textSecondary }]}>Total Cost</Text>
                  <TextInput
                    value={cost}
                    onChangeText={setCost}
                    keyboardType="decimal-pad"
                    style={[styles.input, { color: c.text }]}
                  />
                  <Text style={[TYPE.bodySM, { color: c.textSecondary, marginTop: 6, textAlign: 'center' }]}>
                    $
                  </Text>
                </View>
              </View>

              {showDatePicker && (
                <DateTimePicker
                  value={date}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event: DateTimePickerEvent, selected?: Date) => {
                    setShowDatePicker(false);
                    if (selected) setDate(selected);
                  }}
                />
              )}

              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[TYPE.labelSM, { color: c.textSecondary }]}>Full Tank</Text>
                  <Text style={[TYPE.bodySM, { color: c.textMuted, marginTop: 4 }]}>
                    For accurate consumption tracking, fill up completely
                  </Text>
                </View>
                <Switch value={fullTank} onValueChange={setFullTank} />
              </View>

              <View style={styles.fuelTypeRow}>
                <Text style={[TYPE.labelSM, { color: c.textSecondary }]}>Fuel Type</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {FUEL_TYPES.map((t) => {
                    const active = fuelType === t;
                    return (
                      <TouchableOpacity
                        key={t}
                        style={[
                          styles.typePill,
                          {
                            backgroundColor: active ? COLORS.blue : c.surface,
                            borderColor: active ? COLORS.blue : c.border,
                          },
                        ]}
                        onPress={() => setFuelType(t)}
                        activeOpacity={0.8}
                      >
                        <Text style={{ color: active ? '#000' : c.text, fontFamily: 'Outfit_600SemiBold' }}>
                          {t}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              <View style={styles.metaRow}>
                <View style={styles.fieldWide}>
                  <Text style={[TYPE.labelSM, { color: c.textSecondary }]}>Station Name (optional)</Text>
                  <TextInput
                    value={stationName}
                    onChangeText={setStationName}
                    placeholder="e.g. Shell Main St"
                    placeholderTextColor={c.textMuted}
                    style={[styles.input, { color: c.text, textAlign: 'left' }]}
                  />
                </View>
              </View>

              <View style={styles.metaRow}>
                <View style={styles.fieldWide}>
                  <Text style={[TYPE.labelSM, { color: c.textSecondary }]}>Notes (optional)</Text>
                  <TextInput
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Any details (optional)"
                    placeholderTextColor={c.textMuted}
                    style={[styles.input, { color: c.text, textAlign: 'left', minHeight: 80 }]}
                    multiline
                  />
                </View>
              </View>

              <View style={styles.autoCalc}>
                <Text style={[TYPE.bodySM, { color: c.textSecondary }]}>
                  Cost/L: {costPerLiter != null ? `$${costPerLiter}` : '—'}
                </Text>
                <Text style={[TYPE.bodySM, { color: c.textSecondary }]}>
                  Estimated consumption:{' '}
                  {estimatedConsumptionForThisTank != null ? `${estimatedConsumptionForThisTank} L/100km` : '—'}
                </Text>
              </View>
            </ChunkyCard>

            <View style={styles.actionRow}>
              <ChunkyButton
                title="Cancel"
                variant="ghost"
                onPress={() => router.back()}
                style={{ flex: 1 }}
              />
              <ChunkyButton
                title={saving ? 'Saving...' : 'Save fill-up'}
                onPress={handleSave}
                disabled={saving}
                style={{ flex: 1, backgroundColor: COLORS.blue }}
              />
            </View>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </View>
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
  },
  backBtn: { width: 40, alignItems: 'flex-start' },
  headerRightSpacer: { width: 40 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.lg, paddingBottom: 120 },
  card: { marginBottom: SPACING.xl },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  grid: { gap: 12, marginTop: SPACING.md },
  field: {
    backgroundColor: 'rgba(0,0,0,0)',
  },
  fieldWide: { marginTop: SPACING.sm },
  input: {
    borderWidth: 2,
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#00000010',
    marginTop: 10,
    textAlign: 'center',
    fontFamily: 'Outfit_700Bold',
    fontSize: 24,
  },
  switchRow: {
    marginTop: SPACING.md,
    paddingHorizontal: 4,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  fuelTypeRow: { marginTop: SPACING.md },
  typePill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 10,
    marginTop: 10,
  },
  metaRow: { marginTop: SPACING.md },
  autoCalc: {
    marginTop: SPACING.lg,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.blue + '20',
    gap: 6,
  },
  actionRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xxxl,
  },
  emptyCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.xl },
});

