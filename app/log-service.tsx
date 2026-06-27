import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { addMaintenanceLog, getServiceTypes, ServiceType } from '@/lib/maintenance';
import { scheduleReminderNotification } from '@/lib/notifications';
import { useActiveCar } from '@/contexts/ActiveCarContext';
import { COLORS } from '@/constants/DesignSystem';

const BLUE = COLORS.blue;

type Params = {
  vehicleId?: string;
  currentMileage?: string;
};

export default function LogServiceScreen() {
  const router = useRouter();
  const { vehicleId, currentMileage } = useLocalSearchParams<Params>();
  const { activeCar, vehicles } = useActiveCar();

  const initialMileage = useMemo(() => {
    const raw = typeof currentMileage === 'string' ? currentMileage : Array.isArray(currentMileage) ? currentMileage[0] : '';
    const parsed = parseInt(raw || '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }, [currentMileage]);

  const resolvedVehicleId = useMemo(
    () =>
      typeof vehicleId === 'string'
        ? vehicleId
        : Array.isArray(vehicleId)
        ? vehicleId[0]
        : undefined,
    [vehicleId]
  );

  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);

  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [isCustom, setIsCustom] = useState(false);
  const [serviceName, setServiceName] = useState('');

  const [date, setDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [mileageText, setMileageText] = useState(initialMileage ? String(initialMileage) : '');
  const [costText, setCostText] = useState('');
  const [shopName, setShopName] = useState('');
  const [notes, setNotes] = useState('');

  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [nextMilesText, setNextMilesText] = useState('');
  const [nextDate, setNextDate] = useState<Date | null>(null);
  const [showNextDatePicker, setShowNextDatePicker] = useState(false);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!resolvedVehicleId) {
      Alert.alert('Error', 'Missing vehicle information.');
      router.back();
      return;
    }
  }, [resolvedVehicleId, router]);

  useEffect(() => {
    const loadServiceTypes = async () => {
      try {
        const types = await getServiceTypes();
        setServiceTypes(types);
      } catch (e: any) {
        console.error('Failed to load service types', e);
        Alert.alert('Error', e?.message || 'Failed to load service types.');
      } finally {
        setLoadingTypes(false);
      }
    };

    loadServiceTypes();
  }, []);

  const mileageValue = useMemo(() => {
    const parsed = parseInt(mileageText || '', 10);
    return Number.isFinite(parsed) ? parsed : NaN;
  }, [mileageText]);

  const isServiceNameValid = serviceName.trim().length > 0;
  const isMileageValid = Number.isFinite(mileageValue) && mileageValue > 0;
  const isFormValid = isServiceNameValid && isMileageValid && !!resolvedVehicleId && !saving;

  const selectedType = useMemo(
    () => serviceTypes.find((t) => t.id === selectedTypeId) || null,
    [serviceTypes, selectedTypeId]
  );

  const handleSelectType = (type: ServiceType | null) => {
    if (type) {
      setIsCustom(false);
      setSelectedTypeId(type.id);
      setServiceName(type.name);

      if (!Number.isNaN(mileageValue) && type.default_interval_miles) {
        const nextMiles = mileageValue + type.default_interval_miles;
        setNextMilesText(String(nextMiles));
      }
    } else {
      setIsCustom(true);
      setSelectedTypeId(null);
      if (!serviceName) {
        setServiceName('');
      }
    }
  };

  const handleDateChange = (_event: DateTimePickerEvent, selected?: Date) => {
    setShowDatePicker(false);
    if (selected) {
      setDate(selected);
    }
  };

  const handleNextDateChange = (_event: DateTimePickerEvent, selected?: Date) => {
    setShowNextDatePicker(false);
    if (selected) {
      setNextDate(selected);
    }
  };

  const handleSave = async () => {
    if (!isFormValid || !resolvedVehicleId) return;

    try {
      setSaving(true);

      const cost =
        costText.trim().length > 0
          ? Number.isNaN(parseFloat(costText))
            ? null
            : parseFloat(costText)
          : null;

      const nextMiles =
        reminderEnabled && nextMilesText.trim().length > 0
          ? (() => {
              const val = parseInt(nextMilesText, 10);
              return Number.isNaN(val) ? null : val;
            })()
          : null;

      const dateString = date.toISOString().split('T')[0];
      const nextDateString =
        reminderEnabled && nextDate ? nextDate.toISOString().split('T')[0] : null;

      const savedLog = await addMaintenanceLog({
        vehicle_id: resolvedVehicleId,
        service_type_id: selectedType ? selectedType.id : null,
        service_name: serviceName.trim(),
        date: dateString,
        mileage_at_service: mileageValue,
        cost,
        notes: notes.trim().length > 0 ? notes.trim() : null,
        shop_name: shopName.trim().length > 0 ? shopName.trim() : null,
        next_service_miles: nextMiles,
        next_service_date: nextDateString,
        reminder_enabled: reminderEnabled,
      });

      if (reminderEnabled && savedLog) {
        const vehicle =
          activeCar?.id === resolvedVehicleId ? activeCar : vehicles.find((v) => v.id === resolvedVehicleId);
        const vehicleName = vehicle
          ? [vehicle.year, vehicle.make?.trim(), vehicle.model?.trim()].filter(Boolean).join(' ')
          : 'your vehicle';
        await scheduleReminderNotification({
          id: savedLog.id,
          serviceName: serviceName.trim(),
          dueMiles: nextMiles ?? undefined,
          dueDate: nextDateString ?? undefined,
          vehicleName,
        });
      }

      router.back();
    } catch (e: any) {
      console.error('Failed to save maintenance log', e);
      Alert.alert('Error', e?.message || 'Failed to save service log.');
    } finally {
      setSaving(false);
    }
  };

  const formattedDate = useMemo(
    () => date.toLocaleDateString(),
    [date]
  );

  const formattedNextDate = useMemo(
    () => (nextDate ? nextDate.toLocaleDateString() : 'Select date'),
    [nextDate]
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.headerCancel}>Cancel</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Log Service</Text>

        <TouchableOpacity
          onPress={handleSave}
          disabled={!isFormValid}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {saving ? (
            <ActivityIndicator size="small" color={BLUE} />
          ) : (
            <Text
              style={[
                styles.headerSave,
                { color: isFormValid ? BLUE : COLORS.textMuted },
              ]}
            >
              Save
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Service Type */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Service Type</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillsRow}
          >
            {loadingTypes ? (
              <ActivityIndicator color={BLUE} />
            ) : (
              <>
                {serviceTypes.map((type) => {
                  const active = selectedTypeId === type.id && !isCustom;
                  return (
                    <TouchableOpacity
                      key={type.id}
                      style={[
                        styles.pill,
                        active
                          ? styles.pillActive
                          : styles.pillInactive,
                      ]}
                      onPress={() => handleSelectType(type)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.pillText,
                          active ? styles.pillTextActive : styles.pillTextInactive,
                        ]}
                      >
                        {type.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}

                <TouchableOpacity
                  style={[
                    styles.pill,
                    isCustom ? styles.pillActive : styles.pillInactive,
                  ]}
                  onPress={() => handleSelectType(null)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.pillText,
                      isCustom ? styles.pillTextActive : styles.pillTextInactive,
                    ]}
                  >
                    + Custom
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>

          {isCustom && (
            <TextInput
              style={styles.input}
              placeholder="Enter service name"
              placeholderTextColor={COLORS.textLight}
              value={serviceName}
              onChangeText={setServiceName}
            />
          )}
        </View>

        {/* Date */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Date</Text>
          <TouchableOpacity
            style={styles.input}
            activeOpacity={0.8}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.inputValue}>{formattedDate}</Text>
          </TouchableOpacity>
        </View>

        {/* Mileage */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Mileage at Service *</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            placeholder={initialMileage ? String(initialMileage) : 'e.g. 125000'}
            placeholderTextColor={COLORS.textLight}
            value={mileageText}
            onChangeText={setMileageText}
          />
        </View>

        {/* Cost */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Cost (Optional)</Text>
          <View style={styles.costRow}>
            <Text style={styles.costPrefix}>$</Text>
            <TextInput
              style={[styles.input, styles.costInput]}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={COLORS.textLight}
              value={costText}
              onChangeText={setCostText}
            />
          </View>
        </View>

        {/* Shop name */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Shop / Location (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Jiffy Lube, DIY"
            placeholderTextColor={COLORS.textLight}
            value={shopName}
            onChangeText={setShopName}
          />
        </View>

        {/* Notes */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Notes (Optional)</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            placeholder="Add any details about this service"
            placeholderTextColor={COLORS.textLight}
            value={notes}
            onChangeText={setNotes}
            multiline
            textAlignVertical="top"
          />
        </View>

        {/* Reminder card */}
        <View style={styles.reminderCard}>
          <View style={styles.reminderHeader}>
            <Text style={styles.reminderTitle}>Set Reminder</Text>
            <Switch
              value={reminderEnabled}
              onValueChange={setReminderEnabled}
              trackColor={{ false: COLORS.border, true: BLUE + '60' }}
              thumbColor={reminderEnabled ? BLUE : '#F4F3F4'}
            />
          </View>

          {reminderEnabled && (
            <>
              <View style={styles.fieldGroupInner}>
                <Text style={styles.fieldLabel}>Next service at (miles)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="e.g. 133000"
                  placeholderTextColor={COLORS.textLight}
                  value={nextMilesText}
                  onChangeText={setNextMilesText}
                />
              </View>

              <View style={styles.fieldGroupInner}>
                <Text style={styles.fieldLabel}>Next service date</Text>
                <TouchableOpacity
                  style={styles.input}
                  activeOpacity={0.8}
                  onPress={() => setShowNextDatePicker(true)}
                >
                  <Text style={styles.inputValue}>{formattedNextDate}</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {showDatePicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
        />
      )}

      {showNextDatePicker && (
        <DateTimePicker
          value={nextDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleNextDateChange}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerCancel: {
    color: COLORS.textMuted,
    fontSize: 15,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '700',
  },
  headerSave: {
    fontSize: 15,
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
  },
  fieldGroup: {
    marginBottom: 20,
  },
  fieldGroupInner: {
    marginTop: 16,
  },
  fieldLabel: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginBottom: 8,
  },
  pillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 8,
    paddingVertical: 4,
  },
  pill: {
    height: 34,
    borderRadius: 18,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginRight: 8,
  },
  pillActive: {
    backgroundColor: BLUE,
    borderColor: BLUE,
  },
  pillInactive: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '500',
  },
  pillTextActive: {
    color: COLORS.white,
  },
  pillTextInactive: {
    color: COLORS.text,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 16,
    color: COLORS.text,
    fontSize: 15,
    justifyContent: 'center',
  },
  inputValue: {
    color: COLORS.text,
    fontSize: 15,
  },
  costRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  costPrefix: {
    color: COLORS.textMuted,
    fontSize: 16,
    marginRight: 8,
  },
  costInput: {
    flex: 1,
  },
  notesInput: {
    height: 80,
    paddingTop: 12,
    paddingBottom: 12,
  },
  reminderCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 16,
    marginTop: 4,
  },
  reminderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  reminderTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
  },
});

