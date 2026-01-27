import { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useActiveCar } from '@/contexts/ActiveCarContext';
import { useThemeColor } from '@/hooks/use-theme-color';
import { validateMileageUpdate, validateVehicleData } from '@/utils/vehicle-validation';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';

const ONBOARDING_COMPLETE_KEY = '@pocket_mechanic:onboarding_complete';

export default function VehicleFormScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { vehicles, addVehicle, updateVehicle } = useActiveCar();
  const { theme } = useTheme();
  const tintColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');
  const placeholderColor = useThemeColor({}, 'textTertiary');
  const textInverse = useThemeColor({}, 'textInverse');
  const primaryDark = useThemeColor({}, 'primaryDark');

  const isEditing = !!params.id;
  const existingVehicle = isEditing ? vehicles.find((v) => v.id === params.id) : null;

  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [engine, setEngine] = useState('');
  const [mileage, setMileage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isEditing) {
      setMake(params.make as string || '');
      setModel(params.model as string || '');
      setYear(params.year as string || '');
      setEngine(params.engine as string || '');
      setMileage(params.mileage as string || '');
    }
  }, [isEditing, params]);

  const validateForm = (): boolean => {
    if (!make.trim()) {
      Alert.alert('Validation Error', 'Please enter a make');
      return false;
    }
    if (!model.trim()) {
      Alert.alert('Validation Error', 'Please enter a model');
      return false;
    }
    const yearNum = parseInt(year, 10);
    if (!year || isNaN(yearNum) || yearNum < 1900 || yearNum > new Date().getFullYear() + 1) {
      Alert.alert('Validation Error', 'Please enter a valid year');
      return false;
    }
    const mileageNum = parseFloat(mileage);
    if (!mileage || isNaN(mileageNum)) {
      Alert.alert('Validation Error', 'Please enter a valid mileage');
      return false;
    }

    // Validate mileage rules
    const mileageError = validateMileageUpdate(mileageNum, existingVehicle || null);
    if (mileageError) {
      Alert.alert('Validation Error', mileageError.message);
      return false;
    }

    // Validate complete vehicle data
    const vehicleError = validateVehicleData({ mileage: mileageNum });
    if (vehicleError) {
      Alert.alert('Validation Error', vehicleError.message);
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    // Optional: keep existing client-side validation
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Get current session
      let {
        data: { session },
      } = await supabase.auth.getSession();
      // 2. If NO session exists at all, create an anonymous one right now
      if (!session) {
        const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously();
        if (anonError) {
          Alert.alert('Error', 'Could not create guest session.');
          return;
        }
        session = anonData.session;
      }
      // 3. Proceed with adding the car using `session.user.id`
      const userId = session.user.id;

      // 2. Try to save to Supabase
      const { error: dbError } = await supabase.from('vehicles').insert({
        user_id: userId,
        make: make,
        model: model,
        year: parseInt(year, 10) || 0, // Safety check to ensure it's a number
        engine_code: engine,
        current_mileage: parseInt(mileage, 10) || 0,
      });

      // 3. Did it fail? Show the REAL error.
      if (dbError) {
        Alert.alert('Database Error', dbError.message);
        console.log('Supabase Error:', dbError);
        return; // STOP HERE.
      }

      // (Optional) Save locally here if you still want that feature
      // addVehicle(...);

      router.back();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save vehicle. Please try again.';
      Alert.alert('Error', errorMessage);
      console.error('Error saving vehicle:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.cancelButton}>
          <ThemedText style={[styles.cancelButtonText, { color: primaryDark }]}>Cancel</ThemedText>
        </TouchableOpacity>
        <ThemedText type="title" style={styles.title}>
          {isEditing ? 'Edit Vehicle' : 'Add Vehicle'}
        </ThemedText>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isSubmitting}
          style={[styles.saveButton, { backgroundColor: tintColor }, isSubmitting && styles.saveButtonDisabled]}>
          <ThemedText style={[styles.saveButtonText, { color: textInverse }]}>{isSubmitting ? 'Saving...' : params.id ? 'Save Changes' : 'Add Vehicle'}</ThemedText>
        </TouchableOpacity>
      </ThemedView>

      <ScrollView style={styles.form} contentContainerStyle={styles.formContent}>
        <ThemedView style={styles.field}>
          <ThemedText type="defaultSemiBold" style={styles.label}>
            Make *
          </ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor, color: textColor, borderColor }]}
            value={make}
            onChangeText={setMake}
            placeholder="e.g., Toyota"
            placeholderTextColor={placeholderColor}
            autoCapitalize="words"
            editable={!isSubmitting}
          />
        </ThemedView>

        <ThemedView style={styles.field}>
          <ThemedText type="defaultSemiBold" style={styles.label}>
            Model *
          </ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor, color: textColor, borderColor }]}
            value={model}
            onChangeText={setModel}
            placeholder="e.g., Camry"
            placeholderTextColor={placeholderColor}
            autoCapitalize="words"
            editable={!isSubmitting}
          />
        </ThemedView>

        <ThemedView style={styles.field}>
          <ThemedText type="defaultSemiBold" style={styles.label}>
            Year *
          </ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor, color: textColor, borderColor }]}
            value={year}
            onChangeText={setYear}
            placeholder="e.g., 2020"
            placeholderTextColor={placeholderColor}
            keyboardType="number-pad"
            editable={!isSubmitting}
          />
        </ThemedView>

        <ThemedView style={styles.field}>
          <ThemedText type="defaultSemiBold" style={styles.label}>
            Engine (Optional)
          </ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor, color: textColor, borderColor }]}
            value={engine}
            onChangeText={setEngine}
            placeholder="e.g., 2.5L I4"
            placeholderTextColor={placeholderColor}
            autoCapitalize="words"
            editable={!isSubmitting}
          />
        </ThemedView>

        <ThemedView style={styles.field}>
          <ThemedText type="defaultSemiBold" style={styles.label}>
            Current Mileage *
          </ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor, color: textColor, borderColor }]}
            value={mileage}
            onChangeText={setMileage}
            placeholder="e.g., 50000"
            placeholderTextColor={placeholderColor}
            keyboardType="number-pad"
            editable={!isSubmitting}
          />
          <ThemedText style={styles.hint}>
            Enter the current odometer reading in miles
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
    marginTop: 4,
  },
});
