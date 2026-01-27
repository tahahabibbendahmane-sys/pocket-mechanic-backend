import { useState, useCallback } from 'react';
import { StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Platform } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useActiveCar } from '@/contexts/ActiveCarContext';
import { useThemeColor } from '@/hooks/use-theme-color';
import { ServiceType, Vehicle } from '@/types/vehicle';
import { validateServiceRecord } from '@/utils/vehicle-validation';
import { formatMileage } from '@/utils/formatting';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';

export default function AddServiceScreen() {
  const router = useRouter();
  const { addService } = useActiveCar();
  const { theme } = useTheme();
  const tintColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');
  const placeholderColor = useThemeColor({}, 'textTertiary');
  const textInverse = useThemeColor({}, 'textInverse');
  const primaryDark = useThemeColor({}, 'primaryDark');

  const [serviceType, setServiceType] = useState<ServiceType>('oil');
  const [mileageDone, setMileageDone] = useState('');
  const [intervalMiles, setIntervalMiles] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeVehicle, setActiveVehicle] = useState<Vehicle | null>(null);
  const [isFetchingVehicle, setIsFetchingVehicle] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const fetchActiveVehicle = async () => {
        setIsFetchingVehicle(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setActiveVehicle(null);
          setIsFetchingVehicle(false);
          return;
        }

        const { data, error } = await supabase
          .from('vehicles')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('is_active', true)
          .maybeSingle();

        if (error) {
          console.warn('[AddService] Error fetching active vehicle:', error.message);
          setActiveVehicle(null);
          setIsFetchingVehicle(false);
          return;
        }

        if (data) {
          const mapped: Vehicle = {
            id: data.id?.toString(),
            make: data.make,
            model: data.model,
            year: data.year,
            engine: data.engine_code || '',
            mileage: data.current_mileage ?? 0,
            services: [],
          };
          setActiveVehicle(mapped);
        } else {
          setActiveVehicle(null);
        }
        setIsFetchingVehicle(false);
      };

      fetchActiveVehicle();
    }, [])
  );

  if (isFetchingVehicle) {
    return (
      <ThemedView style={styles.container}>
        <ThemedView style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.cancelButton}>
            <ThemedText style={[styles.cancelButtonText, { color: primaryDark }]}>Cancel</ThemedText>
          </TouchableOpacity>
          <ThemedText type="title" style={styles.title}>
            Add Service
          </ThemedText>
          <TouchableOpacity onPress={() => router.back()} style={styles.cancelButton}>
            <ThemedText style={[styles.cancelButtonText, { color: primaryDark }]}>Done</ThemedText>
          </TouchableOpacity>
        </ThemedView>
        <ThemedView style={styles.content}>
          <ThemedText>Loading vehicle...</ThemedText>
        </ThemedView>
      </ThemedView>
    );
  }

  if (!activeVehicle) {
    return (
      <ThemedView style={styles.container}>
        <ThemedView style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.cancelButton}>
            <ThemedText style={[styles.cancelButtonText, { color: primaryDark }]}>Cancel</ThemedText>
          </TouchableOpacity>
          <ThemedText type="title" style={styles.title}>
            Add Service
          </ThemedText>
          <TouchableOpacity onPress={() => router.back()} style={styles.cancelButton}>
            <ThemedText style={[styles.cancelButtonText, { color: primaryDark }]}>Done</ThemedText>
          </TouchableOpacity>
        </ThemedView>
        <ThemedView style={styles.content}>
          <ThemedText>No active car selected</ThemedText>
        </ThemedView>
      </ThemedView>
    );
  }

  const validateForm = (): boolean => {
    if (!mileageDone.trim()) {
      Alert.alert('Validation Error', 'Please enter mileage done');
      return false;
    }
    if (!intervalMiles.trim()) {
      Alert.alert('Validation Error', 'Please enter interval miles');
      return false;
    }

    const mileageDoneNum = parseFloat(mileageDone);
    const intervalMilesNum = parseFloat(intervalMiles);

    // Use validation utility
    const serviceError = validateServiceRecord(
      {
        type: serviceType,
        mileageDone: mileageDoneNum,
        intervalMiles: intervalMilesNum,
      },
      activeVehicle.mileage
    );

    if (serviceError) {
      Alert.alert('Validation Error', serviceError.message);
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await addService(activeVehicle.id, {
        type: serviceType,
        mileageDone: parseFloat(mileageDone),
        date: new Date().toISOString(),
        intervalMiles: parseFloat(intervalMiles),
      });

      router.back();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save service. Please try again.';
      Alert.alert('Error', errorMessage);
      console.error('Error saving service:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.cancelButton}>
          <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
        </TouchableOpacity>
        <ThemedText type="title" style={styles.title}>
          Add Service
        </ThemedText>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isSubmitting}
          style={[styles.saveButton, { backgroundColor: tintColor }, isSubmitting && styles.saveButtonDisabled]}>
          <ThemedText style={[styles.saveButtonText, { color: textInverse }]}>{isSubmitting ? 'Saving...' : 'Save Service'}</ThemedText>
        </TouchableOpacity>
      </ThemedView>

      <ScrollView style={styles.form} contentContainerStyle={styles.formContent}>
        <ThemedView style={styles.field}>
          <ThemedText type="defaultSemiBold" style={styles.label}>
            Service Type *
          </ThemedText>
          <ThemedView style={styles.typeButtons}>
            {(['oil', 'brakes', 'custom'] as ServiceType[]).map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.typeButton,
                  { borderColor },
                  serviceType === type && { backgroundColor: tintColor, borderColor: tintColor },
                ]}
                onPress={() => setServiceType(type)}>
                <ThemedText
                  style={[
                    styles.typeButtonText,
                    serviceType === type && styles.typeButtonTextActive,
                  ]}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </ThemedView>
        </ThemedView>

        <ThemedView style={styles.field}>
          <ThemedText type="defaultSemiBold" style={styles.label}>
            Mileage When Service Was Done *
          </ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor, color: textColor, borderColor }]}
            value={mileageDone}
            onChangeText={setMileageDone}
            placeholder={`e.g., ${formatMileage(activeVehicle.mileage)}`}
            placeholderTextColor={placeholderColor}
            keyboardType="number-pad"
            editable={!isSubmitting}
          />
          <ThemedText style={styles.hint}>
            Current mileage: {formatMileage(activeVehicle.mileage)} miles. Enter the odometer reading when this service was completed.
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.field}>
          <ThemedText type="defaultSemiBold" style={styles.label}>
            Service Interval *
          </ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor, color: textColor, borderColor }]}
            value={intervalMiles}
            onChangeText={setIntervalMiles}
            placeholder="e.g., 5000"
            placeholderTextColor={placeholderColor}
            keyboardType="number-pad"
            editable={!isSubmitting}
          />
          <ThemedText style={styles.hint}>
            How many miles until this service should be done again (e.g., 5,000 miles for oil changes)
          </ThemedText>
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  cancelButtonText: {
    fontSize: 16,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
  },
  saveButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  form: {
    flex: 1,
  },
  formContent: {
    padding: 16,
    gap: 20,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 44,
  },
  hint: {
    fontSize: 12,
    opacity: 0.6,
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  typeButton: {
    flex: 1,
    minWidth: 100,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  typeButtonText: {
    fontSize: 16,
  },
  typeButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
});
