import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Platform, View, Text, Image } from 'react-native';
import { useRouter, useFocusEffect, useNavigation } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useActiveCar } from '@/contexts/ActiveCarContext';
import { useThemeColor } from '@/hooks/use-theme-color';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { formatDate, formatDateForInput, formatMileage, getUnitLabel } from '@/utils/formatting';
import { useTheme } from '@/contexts/ThemeContext';
import { BorderRadius, Spacing, Typography, ThemeColors, Shadows } from '@/constants/theme-enhanced';
import { useLanguage } from '@/contexts/LanguageContext';
import { AnimatedButton } from '@/components/AnimatedButton';
import { supabase } from '@/lib/supabase';
import { Vehicle } from '@/types/vehicle';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useUnits } from '@/contexts/UnitsContext';

const uriToBlob = async (uri: string) => {
  const response = await fetch(uri);
  const blob = await response.blob();
  return blob;
};

export default function InsuranceScreen() {
  const { activeCar, isLoading, updateVehicle } = useActiveCar();
  const { theme, isDark } = useTheme();
  const { t } = useLanguage();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { unitSystem } = useUnits();
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
  const [isUploading, setIsUploading] = useState(false);
  const [fetchedCar, setFetchedCar] = useState<Vehicle | null>(null);
  const [documentImage, setDocumentImage] = useState<string | null>(null);
  const isBusy = isSaving || isUploading;

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
      if (documentImage) {
        setIsUploading(true);
        const userId = user?.id || (await supabase.auth.getUser()).data.user?.id;
        if (!userId) {
          throw new Error('User not logged in');
        }

        const blob = await uriToBlob(documentImage);
        const fileName = `${userId}/${Date.now()}.jpg`;

        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(fileName, blob);

        if (uploadError) {
          throw uploadError;
        }

        const { data: publicData } = supabase.storage
          .from('documents')
          .getPublicUrl(fileName);

        const publicUrl = publicData?.publicUrl;
        if (publicUrl) {
          const { error: insertError } = await supabase
            .from('documents')
            .insert({ image_url: publicUrl });

          if (insertError) {
            throw insertError;
          }
        }
      }

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
      setIsUploading(false);
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
    setDocumentImage(null);
    setIsEditing(false);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      setDocumentImage(result.assets[0].uri);
    }
  };

  const hasInsuranceData = displayCar?.insurance?.provider || displayCar?.insurance?.policyNumber || displayCar?.insurance?.expiryDate;
  const hasRegistrationData = displayCar?.registration?.expiryDate;

  if (isLoading) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: isDark ? '#000000' : '#F2F2F7' }]}>
        <ThemedView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={tintColor} />
        </ThemedView>
      </ThemedView>
    );
  }

  if (!displayCar) {
    return (
      <ThemedView style={styles.container}>
        <ThemedView style={[styles.header, { paddingTop: insets.top }]}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
              style={styles.headerIconButton}
            >
              <Ionicons name="menu-outline" size={24} color="#333" />
            </TouchableOpacity>
            <ThemedText type="title" style={styles.headerTitle}>
              {t.insurance.title}
            </ThemedText>
            <TouchableOpacity style={styles.headerIconButton} disabled>
              <Ionicons name="add" size={30} color={colors.primary || '#2962FF'} />
            </TouchableOpacity>
          </View>
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
              onPress={() => router.push('/(tabs)/garage')}>
              <ThemedView style={[
                styles.emptyCTAContent,
                { backgroundColor: colors.primaryDark || '#4F46E5' }
              ]}>
                <IconSymbol name="car.fill" size={18} color="#FFFFFF" />
                <ThemedText style={[styles.emptyCTAText, { color: '#FFFFFF', fontWeight: '700' }]}>
                  <Text>Select a Vehicle</Text>
                </ThemedText>
              </ThemedView>
            </AnimatedButton>
          </ThemedView>
        </ThemedView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: isDark ? '#000000' : '#F2F2F7' }]}>
      <ThemedView style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
            style={styles.headerIconButton}
          >
            <Ionicons name="menu-outline" size={24} color="#333" />
          </TouchableOpacity>
          <ThemedText type="title" style={styles.headerTitle}>
            {t.insurance.title}
          </ThemedText>
          <TouchableOpacity
            onPress={() => setIsEditing(true)}
            style={styles.headerIconButton}>
            <Ionicons name="add" size={30} color={colors.primary || '#2962FF'} />
          </TouchableOpacity>
        </View>
        <ThemedView style={styles.carInfo}>
          <View style={[styles.carCapsule, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}>
            <Text style={[styles.carCapsuleText, { color: isDark ? '#FFFFFF' : '#555' }]}>
              {displayCar.make} {displayCar.model} • {displayCar.year} • {formatMileage(displayCar.mileage, unitSystem)} {getUnitLabel(unitSystem)}
            </Text>
          </View>
        </ThemedView>
        {isEditing && (
          <ThemedView style={styles.editActions}>
            <TouchableOpacity
              style={styles.uploadBox}
              onPress={pickImage}
              activeOpacity={0.8}
            >
              {!documentImage ? (
                <View style={styles.uploadPlaceholder}>
                  <Ionicons name="camera" size={28} color="#999" />
                  <Text style={styles.uploadText}>Tap to upload photo</Text>
                </View>
              ) : (
                <View>
                  <Image source={{ uri: documentImage }} style={styles.uploadImage} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => setDocumentImage(null)}
                  >
                    <Ionicons name="close" size={16} color="#FFF" />
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.editActionRow}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancel}
              disabled={isBusy}>
                <ThemedText style={[styles.cancelButtonText, { color: primaryDark }]}>{t.common.cancel}</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: tintColor }, isBusy && styles.saveButtonDisabled]}
                onPress={handleSave}
              disabled={isBusy}>
              {isBusy ? (
                  <ActivityIndicator size="small" color={textInverse} />
                ) : (
                  <ThemedText style={[styles.saveButtonText, { color: textInverse }]}>{t.common.save}</ThemedText>
                )}
              </TouchableOpacity>
            </View>
          </ThemedView>
        )}
      </ThemedView>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Insurance Section */}
        <ThemedView style={[styles.section, styles.sectionCard, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            {t.insurance.title}
          </ThemedText>

          {!hasInsuranceData && !isEditing ? (
            <ThemedView style={[styles.emptySection, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }, Shadows.sm]}>
              <ThemedView style={styles.iconBubble}>
                <IconSymbol name="doc.text.fill" size={32} color={colors.primary || '#2962FF'} />
              </ThemedView>
              <ThemedText style={[styles.emptySectionText, { fontWeight: '700', color: isDark ? '#A1A1A1' : '#666666' }]}>
                {t.insurance.noInsuranceInfo}
              </ThemedText>
              <ThemedText style={[styles.emptySectionSubtext, { color: isDark ? '#A1A1A1' : '#666666' }]}>
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
                    {displayCar?.insurance?.provider || t.insurance.notSet}
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
                    {displayCar?.insurance?.policyNumber || t.insurance.notSet}
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
                      <Text>Format: YYYY-MM-DD (e.g., 2026-12-31)</Text>
                    </ThemedText>
                  </>
                ) : (
                  <ThemedText style={styles.value}>
                    {displayCar?.insurance?.expiryDate ? formatDate(displayCar.insurance.expiryDate) : t.insurance.notSet}
                  </ThemedText>
                )}
              </ThemedView>
            </ThemedView>
          )}
        </ThemedView>

        {/* Registration Section */}
        <ThemedView style={[styles.section, styles.sectionCard, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            {t.insurance.registration}
          </ThemedText>

          {!hasRegistrationData && !isEditing ? (
            <ThemedView style={[styles.emptySection, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }, Shadows.sm]}>
              <ThemedView style={styles.iconBubble}>
                <IconSymbol name="calendar" size={32} color={colors.primary || '#2962FF'} />
              </ThemedView>
              <ThemedText style={[styles.emptySectionText, { fontWeight: '700', color: isDark ? '#A1A1A1' : '#666666' }]}>
                {t.insurance.noRegistrationInfo}
              </ThemedText>
              <ThemedText style={[styles.emptySectionSubtext, { color: isDark ? '#A1A1A1' : '#666666' }]}>
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
                    {displayCar?.registration?.expiryDate ? formatDate(displayCar.registration.expiryDate) : t.insurance.notSet}
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
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '800',
    color: '#333',
    flex: 1,
  },
  headerIconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  carInfo: {
    marginBottom: 16,
  },
  carCapsule: {
    backgroundColor: '#E5E5EA',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  carCapsuleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
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
  editActionRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  uploadBox: {
    width: '100%',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 12,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  uploadPlaceholder: {
    alignItems: 'center',
    gap: 8,
  },
  uploadText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  uploadImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
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
  iconBubble: {
    backgroundColor: '#F4F2FF',
    padding: 16,
    borderRadius: 40,
    alignSelf: 'center',
    marginBottom: 12,
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
  sectionCard: {
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    marginBottom: 4,
  },
  emptySection: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 20,
    backgroundColor: '#FFF',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
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
