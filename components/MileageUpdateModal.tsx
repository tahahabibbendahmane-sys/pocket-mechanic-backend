import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useActiveCar } from '@/contexts/ActiveCarContext';
import { supabase } from '@/lib/supabase';
import { scheduleWrenchyMileageAlerts } from '@/lib/notifications';
import { useTheme } from '@/contexts/ThemeContext';
import { COLORS, RADIUS, SPACING, TYPE, getColors } from '@/constants/DesignSystem';
import { ChunkyCard } from '@/components/ui/ChunkyCard';
import { ChunkyButton } from '@/components/ui/ChunkyButton';

type Step = 'pick' | 'mileage';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function MileageUpdateModal({ visible, onClose }: Props) {
  const { isDark } = useTheme();
  const c = getColors(isDark);
  const { vehicles, fetchVehicles } = useActiveCar();

  const [step, setStep] = useState<Step>('pick');
  const [selectedVehicle, setSelectedVehicle] = useState<any | null>(null);
  const [mileageInput, setMileageInput] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    // Reset wizard state when modal opens
    setStep('pick');
    setSelectedVehicle(null);
    setMileageInput('');
    setSaving(false);
  }, [visible]);

  const vehicleRows = useMemo(() => {
    if (!vehicles?.length) return [];
    return vehicles;
  }, [vehicles]);

  const currentMileage = selectedVehicle
    ? Number(selectedVehicle.current_mileage ?? selectedVehicle.mileage ?? 0)
    : 0;

  const handleSelectVehicle = (vehicle: any) => {
    setSelectedVehicle(vehicle);
    const km = Number(vehicle.current_mileage ?? vehicle.mileage ?? 0);
    setMileageInput(String(km));
    setStep('mileage');
  };

  const handleUpdate = async () => {
    if (!selectedVehicle) return;
    const parsed = parseInt(mileageInput.replace(/[^0-9]/g, ''), 10);
    if (Number.isNaN(parsed)) return;

    const km = currentMileage ?? 0;
    if (parsed < km) {
      Alert.alert(
        'Invalid Mileage',
        "New mileage can't be lower than the vehicle's current mileage."
      );
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('vehicles')
        .update({ current_mileage: parsed })
        .eq('id', selectedVehicle.id);

      if (error) throw error;

      const { data: logs } = await supabase
        .from('maintenance_logs')
        .select('service_name, mileage_at_service')
        .eq('vehicle_id', selectedVehicle.id)
        .order('created_at', { ascending: false });

      const lastOil =
        logs?.find((l: any) => l.service_name?.toLowerCase().includes('oil'))
          ?.mileage_at_service ?? 0;

      const lastTire =
        logs?.find(
          (l: any) =>
            l.service_name?.toLowerCase().includes('tire') ||
            l.service_name?.toLowerCase().includes('tyre')
        )?.mileage_at_service ?? 0;

      const lastBrake =
        logs?.find((l: any) => l.service_name?.toLowerCase().includes('brake'))
          ?.mileage_at_service ?? 0;

      await scheduleWrenchyMileageAlerts(
        {
          id: selectedVehicle.id,
          make: selectedVehicle.make,
          model: selectedVehicle.model,
          year: selectedVehicle.year,
          mileage: parsed,
        },
        { oil: lastOil, tire: lastTire, brake: lastBrake }
      );

      await fetchVehicles();
      setStep('pick');
      setSelectedVehicle(null);
      setMileageInput('');
      onClose();
    } catch (e) {
      console.error('[MileageUpdateModal] Error:', e);
      Alert.alert('Update Failed', 'Could not update mileage. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const listEmpty = !vehicleRows.length;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, justifyContent: 'flex-end' }}
      >
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: c.background,
              borderTopLeftRadius: RADIUS.xl,
              borderTopRightRadius: RADIUS.xl,
            },
          ]}
        >
          {step === 'pick' ? (
            <>
              <Text style={[TYPE.h1, { color: c.text, textAlign: 'center', marginBottom: SPACING.xl }]}>
                Which vehicle did you drive?
              </Text>

              {vehicleRows.length === 0 ? (
                <View style={styles.loadingState}>
                  <ActivityIndicator size="large" color={COLORS.blue} />
                  <Text style={[TYPE.bodySM, { color: c.textSecondary, marginTop: SPACING.sm }]}>
                    Loading your vehicles...
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={vehicleRows}
                  keyExtractor={(v) => v.id}
                  contentContainerStyle={{ paddingBottom: SPACING.xl }}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => {
                    const km = Number(item.mileage ?? 0);
                    return (
                      <ChunkyCard
                        key={item.id}
                        style={styles.vehicleCard}
                        onPress={() => handleSelectVehicle(item)}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={{ fontSize: 28, marginRight: SPACING.md }}>🚗</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={[TYPE.h3, { color: c.text }]}>
                              {[item.year, item.make?.trim(), item.model?.trim()]
                                .filter(Boolean)
                                .join(' ')}
                            </Text>
                            <Text style={[TYPE.bodySM, { color: c.textSecondary }]}>
                              {km.toLocaleString()} km
                            </Text>
                          </View>
                        </View>
                      </ChunkyCard>
                    );
                  }}
                />
              )}

              <TouchableOpacity
                onPress={onClose}
                style={{ alignSelf: 'center', marginTop: SPACING.lg }}
                activeOpacity={0.7}
              >
                <Text style={[TYPE.body, { color: c.textSecondary }]}>Skip</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={[TYPE.h1, { color: c.text, textAlign: 'center', marginBottom: SPACING.sm }]}>
                Update mileage
              </Text>
              <Text style={[TYPE.body, { color: c.textSecondary, textAlign: 'center', marginBottom: SPACING.xl }]}>
                {selectedVehicle
                  ? `${selectedVehicle.year} ${selectedVehicle.make?.trim()} ${selectedVehicle.model?.trim()}`
                      .replace(/\s+/g, ' ')
                      .trim()
                  : ''}
              </Text>
              <Text style={[TYPE.bodySM, { color: c.textMuted, textAlign: 'center', marginBottom: SPACING.sm }]}>
                Current: {currentMileage.toLocaleString()} km
              </Text>

              <View style={{ alignItems: 'center', marginBottom: SPACING.xl }}>
                <TextInput
                  style={[
                    styles.mileageInput,
                    {
                      borderColor: COLORS.blue,
                      backgroundColor: c.surface,
                      color: c.text,
                    },
                  ]}
                  keyboardType="number-pad"
                  value={mileageInput}
                  onChangeText={setMileageInput}
                  autoFocus
                  selectTextOnFocus
                />
                <Text style={[TYPE.bodySM, { color: c.textMuted, marginTop: SPACING.xs }]}>km</Text>
              </View>

              <View style={{ flexDirection: 'row', gap: SPACING.md }}>
                <View style={{ flex: 1 }}>
                  <ChunkyButton
                    title="Cancel"
                    variant="ghost"
                    onPress={() => {
                      setStep('pick');
                      setSelectedVehicle(null);
                      setMileageInput('');
                    }}
                    disabled={saving}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <ChunkyButton
                    title={saving ? 'Saving...' : 'Update ✓'}
                    variant="primary"
                    onPress={handleUpdate}
                    disabled={saving || !mileageInput.trim()}
                  />
                </View>
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  vehicleCard: {
    marginBottom: SPACING.md,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: SPACING.xl,
  },
  mileageInput: {
    width: '100%',
    borderWidth: 2,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    fontSize: 28,
    fontFamily: 'Outfit_700Bold',
    textAlign: 'center',
  },
});

