import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Platform, View, Text } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useActiveCar } from '@/contexts/ActiveCarContext';
import { useThemeColor } from '@/hooks/use-theme-color';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { formatDate, formatDateForInput, formatMileage } from '@/utils/formatting';
import { useTheme } from '@/contexts/ThemeContext';
import { AppHeader } from '@/components/AppHeader';
import { BorderRadius, Spacing, Typography, ThemeColors, Shadows } from '@/constants/theme-enhanced';
import { useLanguage } from '@/contexts/LanguageContext';
import { AnimatedButton } from '@/components/AnimatedButton';
import { supabase } from '@/lib/supabase';
import { Vehicle } from '@/types/vehicle';

export default function InsuranceScreen() {
  const { activeCar, isLoading, updateVehicle } = useActiveCar();
  const { theme, isDark } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();
  const colors = ThemeColors[theme];
  const tintColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const borderColor = useThemeColor({}, 'border');
  const placeholderColor = useThemeColor({}, 'textTertiary');
  const iconColor = useThemeColor({}, 'icon');
  const textInverse = useThemeColor({}, 'textInverse');
  const primaryDark = useThemeColor({}, 'primaryDark');

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [fetchedCar, setFetchedCar] = useState<Vehicle | null>(null);

  const displayCar = fetchedCar || activeCar;

  useFocusEffect(
    useCallback(() => {
      const fetchLatestCar = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setFetchedCar(null);
          return;
        }

        const { data, error } = await supabase
          .from('vehicles')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('is_active', true)
          .maybeSingle();

        if (error) {
          console.warn('[Insurance] Error fetching active car:', error.message);
          if (error.message.toLowerCase().includes('is_active')) {
            setFetchedCar(null);
            return;
          }
          setFetchedCar(null);
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
            insurance: data.insurance_provider || data.insurance_policy_number || data.insurance_expiry_date
              ? {
                  provider: data.insurance_provider || '',
                  policyNumber: data.insurance_policy_number || '',
                  expiryDate: data.insurance_expiry_date || '',
                }
              : undefined,
            registration: data.registration_expiry_date
              ? {
                  expiryDate: data.registration_expiry_date,
                }
              : undefined,
          };
          setFetchedCar(mapped);
        } else {
          setFetchedCar(null);
        }
      };

      fetchLatestCar();
    }, [])
  );

  // Insurance fields
  const [insuranceProvider, setInsuranceProvider] = useState('');
  const [insurancePolicyNumber, setInsurancePolicyNumber] = useState('');
  const [insuranceExpiryDate, setInsuranceExpiryDate] = useState('');

  // Registration fields
  const [registrationExpiryDate, setRegistrationExpiryDate] = useState('');

  // Load data when activeCar changes
  useEffect(() => {
    if (displayCar) {
      setInsuranceProvider(displayCar.insurance?.provider || '');
      setInsurancePolicyNumber(displayCar.insurance?.policyNumber || '');
      setInsuranceExpiryDate(displayCar.insurance?.expiryDate ? formatDateForInput(displayCar.insurance.expiryDate) : '');
      setRegistrationExpiryDate(displayCar.registration?.expiryDate ? formatDateForInput(displayCar.registration.expiryDate) : '');
    }
  }, [displayCar]);

  const handleSave = async () => {
    if (!displayCar) return;

    setIsSaving(true);
    try {
      const insurance = insuranceProvider.trim() || insurancePolicyNumber.trim() || insuranceExpiryDate.trim()
        ? {
            provider: insuranceProvider.trim() || '',
            policyNumber: insurancePolicyNumber.trim() || '',
            expiryDate: insuranceExpiryDate.trim() ? new Date(insuranceExpiryDate).toISOString() : '',
          }
        : undefined;

      const registration = registrationExpiryDate.trim()
        ? {
            expiryDate: new Date(registrationExpiryDate).toISOString(),
          }
        : undefined;

      await updateVehicle(displayCar.id, {
        insurance,
        registration,
      });

      setIsEditing(false);
    } catch (error) {
      console.error('Error saving insurance/registration:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset to original values
    if (displayCar) {
      setInsuranceProvider(displayCar.insurance?.provider || '');
      setInsurancePolicyNumber(displayCar.insurance?.policyNumber || '');
      setInsuranceExpiryDate(displayCar.insurance?.expiryDate ? formatDateForInput(displayCar.insurance.expiryDate) : '');
      setRegistrationExpiryDate(displayCar.registration?.expiryDate ? formatDateForInput(displayCar.registration.expiryDate) : '');
    }
    setIsEditing(false);
  };

  const hasInsuranceData = displayCar?.insurance?.provider || displayCar?.insurance?.policyNumber || displayCar?.insurance?.expiryDate;
  const hasRegistrationData = displayCar?.registration?.expiryDate;

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <ThemedView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={tintColor} />
        </ThemedView>
      </ThemedView>
    );
  }

  if (!displayCar) {
    return (
      <ThemedView style={styles.container}>
        <ThemedView style={styles.header}>
          <AppHeader title={t.insurance.title} />
        </ThemedView>
        <ThemedView style={styles.emptyContainer}>
          <ThemedView style={[
            styles.emptyCard,
            {
              backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
              borderWidth: 1,
              borderColor: isDark ? '#334155' : '#E2E8F0',
            },
            Shadows.sm
          ]}>
            <View style={styles.emptyEmojiContainer}>
              <IconSymbol 
                name="doc.text.fill" 
                size={48} 
                color={isDark ? '#94A3B8' : '#64748B'} 
              />
            </View>
            <Text 
              style={[
                styles.emptyText,
                {
                  color: isDark ? '#FFFFFF' : '#0F172A',
                  fontWeight: '700',
                }
              ]}>
              {t.insurance.noActiveCar}
            </Text>
            <Text 
              style={[
                styles.emptySubtext,
                {
                  color: isDark ? '#94A3B8' : '#64748B',
                }
              ]}>
              {t.insurance.noActiveCarMessage}
            </Text>
            <AnimatedButton
              style={[
                styles.emptyCTA,
                { backgroundColor: colors.primaryDark || '#4F46E5' },
                Shadows.md
              ]}
              activeOpacity={1}
              onPress={() => router.push('/garage')}>
              <ThemedView style={[
                styles.emptyCTAContent,
                { backgroundColor: colors.primaryDark || '#4F46E5' }
              ]}>
                <IconSymbol name="car.fill" size={18} color="#FFFFFF" />
                <ThemedText style={[styles.emptyCTAText, { color: '#FFFFFF', fontWeight: '700' }]}>
                  Select a Vehicle
                </ThemedText>
              </ThemedView>
            </AnimatedButton>
          </ThemedView>
        </ThemedView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <AppHeader title={t.insurance.title} />
        <ThemedView style={styles.carInfo}>
          <ThemedText type="title">{displayCar.make} {displayCar.model}</ThemedText>
          <ThemedText style={styles.carDetails}>
            {`${displayCar.year} • ${formatMileage(displayCar.mileage)} miles`}
          </ThemedText>
        </ThemedView>
        {!isEditing ? (
          <TouchableOpacity
            style={[styles.editButton, { backgroundColor: tintColor }]}
            onPress={() => setIsEditing(true)}>
            <IconSymbol name="pencil" size={16} color={textInverse} />
            <ThemedText style={[styles.editButtonText, { color: textInverse }]}>{t.common.edit}</ThemedText>
          </TouchableOpacity>
        ) : (
          <ThemedView style={styles.editActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancel}
              disabled={isSaving}>
              <ThemedText style={[styles.cancelButtonText, { color: primaryDark }]}>{t.common.cancel}</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: tintColor }, isSaving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={isSaving}>
              {isSaving ? (
                <ActivityIndicator size="small" color={textInverse} />
              ) : (
                <ThemedText style={[styles.saveButtonText, { color: textInverse }]}>{t.common.save}</ThemedText>
              )}
            </TouchableOpacity>
          </ThemedView>
        )}
      </ThemedView>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Insurance Section */}
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            {t.insurance.title}
          </ThemedText>

          {!hasInsuranceData && !isEditing ? (
            <ThemedView style={[styles.emptySection, { borderColor: tintColor + '30', backgroundColor: colors.backgroundSecondary }]}>
              <ThemedView style={[styles.emptyIconContainer, { backgroundColor: tintColor + '20' }]}>
                <IconSymbol name="doc.text.fill" size={32} color={tintColor} />
              </ThemedView>
              <ThemedText style={[styles.emptySectionText, { fontWeight: '700', color: textColor }]}>
                {t.insurance.noInsuranceInfo}
              </ThemedText>
              <ThemedText style={[styles.emptySectionSubtext, { color: textSecondary }]}>
                {t.insurance.noInsuranceMessage}
              </ThemedText>
            </ThemedView>
          ) : (
            <ThemedView style={styles.fieldsContainer}>
              <ThemedView style={styles.field}>
                <ThemedText type="defaultSemiBold" style={styles.label}>
                  {t.insurance.provider}
                </ThemedText>
                {isEditing ? (
                  <TextInput
                    style={[styles.input, { backgroundColor, color: textColor, borderColor }]}
                    value={insuranceProvider}
                    onChangeText={setInsuranceProvider}
                    placeholder="e.g., State Farm"
                    placeholderTextColor={placeholderColor}
                    editable={!isSaving}
                  />
                ) : (
                  <ThemedText style={styles.value}>
                    {activeCar.insurance?.provider || t.insurance.notSet}
                  </ThemedText>
                )}
              </ThemedView>

              <ThemedView style={styles.field}>
                <ThemedText type="defaultSemiBold" style={styles.label}>
                  {t.insurance.policyNumber}
                </ThemedText>
                {isEditing ? (
                  <TextInput
                    style={[styles.input, { backgroundColor, color: textColor, borderColor }]}
                    value={insurancePolicyNumber}
                    onChangeText={setInsurancePolicyNumber}
                    placeholder="e.g., ABC123456"
                    placeholderTextColor={placeholderColor}
                    editable={!isSaving}
                  />
                ) : (
                  <ThemedText style={styles.value}>
                    {activeCar.insurance?.policyNumber || t.insurance.notSet}
                  </ThemedText>
                )}
              </ThemedView>

              <ThemedView style={styles.field}>
                <ThemedText type="defaultSemiBold" style={styles.label}>
                  {t.insurance.expiryDate}
                </ThemedText>
                {isEditing ? (
                  <>
                    <TextInput
                      style={[styles.input, { backgroundColor, color: textColor, borderColor }]}
                      value={insuranceExpiryDate}
                      onChangeText={setInsuranceExpiryDate}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={placeholderColor}
                      editable={!isSaving}
                    />
                    <ThemedText style={styles.hint}>
                      Format: YYYY-MM-DD (e.g., 2026-12-31)
                    </ThemedText>
                  </>
                ) : (
                  <ThemedText style={styles.value}>
                    {activeCar.insurance?.expiryDate ? formatDate(activeCar.insurance.expiryDate) : t.insurance.notSet}
                  </ThemedText>
                )}
              </ThemedView>
            </ThemedView>
          )}
        </ThemedView>

        {/* Registration Section */}
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            {t.insurance.registration}
          </ThemedText>

          {!hasRegistrationData && !isEditing ? (
            <ThemedView style={[styles.emptySection, { borderColor: tintColor + '30', backgroundColor: colors.backgroundSecondary }]}>
              <ThemedView style={[styles.emptyIconContainer, { backgroundColor: tintColor + '20' }]}>
                <IconSymbol name="doc.text.fill" size={32} color={tintColor} />
              </ThemedView>
              <ThemedText style={[styles.emptySectionText, { fontWeight: '700', color: textColor }]}>
                {t.insurance.noRegistrationInfo}
              </ThemedText>
              <ThemedText style={[styles.emptySectionSubtext, { color: textSecondary }]}>
                {t.insurance.noRegistrationMessage}
              </ThemedText>
            </ThemedView>
          ) : (
            <ThemedView style={styles.fieldsContainer}>
              <ThemedView style={styles.field}>
                <ThemedText type="defaultSemiBold" style={styles.label}>
                  {t.insurance.registrationExpiryDate}
                </ThemedText>
                {isEditing ? (
                  <>
                    <TextInput
                      style={[styles.input, { backgroundColor, color: textColor, borderColor }]}
                      value={registrationExpiryDate}
                      onChangeText={setRegistrationExpiryDate}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={placeholderColor}
                      editable={!isSaving}
                    />
                    <ThemedText style={styles.hint}>
                      {t.insurance.dateFormat}
                    </ThemedText>
                  </>
                ) : (
                  <ThemedText style={styles.value}>
                    {activeCar.registration?.expiryDate ? formatDate(activeCar.registration.expiryDate) : t.insurance.notSet}
                  </ThemedText>
                )}
              </ThemedView>
            </ThemedView>
          )}
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  carInfo: {
    marginBottom: 16,
  },
  carDetails: {
    marginTop: 4,
    fontSize: 14,
    opacity: 0.7,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
  },
  emptyCard: {
    width: '100%',
    maxWidth: 320,
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyEmojiContainer: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: Typography.fontSize.lg,
    lineHeight: Typography.fontSize.lg * 1.3,
    marginTop: Spacing.xs,
  },
  emptySubtext: {
    textAlign: 'center',
    fontSize: Typography.fontSize.sm,
    lineHeight: Typography.fontSize.sm * 1.4,
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  emptyCTA: {
    marginTop: Spacing.md,
    borderRadius: BorderRadius.xl,
    width: '100%',
    overflow: 'hidden',
  },
  emptyCTAContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.xs,
    minHeight: 44,
  },
  emptyCTAText: {
    fontSize: Typography.fontSize.base,
    fontWeight: '600',
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    gap: 24,
  },
  section: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 20,
    marginBottom: 4,
  },
  emptySection: {
    alignItems: 'center',
    padding: Spacing.xl,
    borderRadius: BorderRadius['2xl'],
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  emptySectionText: {
    marginTop: Spacing.md,
    fontSize: Typography.fontSize.base,
    textAlign: 'center',
  },
  emptySectionSubtext: {
    marginTop: Spacing.sm,
    fontSize: Typography.fontSize.sm,
    opacity: 0.7,
    textAlign: 'center',
    maxWidth: 280,
  },
  fieldsContainer: {
    gap: 20,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 14,
  },
  value: {
    fontSize: 16,
    paddingVertical: 8,
    opacity: 0.9,
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
