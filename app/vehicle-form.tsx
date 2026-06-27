import { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Platform,
  View, Text, StatusBar, KeyboardAvoidingView, Image, ActivityIndicator,
  Modal, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useActiveCar } from '@/contexts/ActiveCarContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { validateMileageUpdate, validateVehicleData } from '@/utils/vehicle-validation';
import { supabase } from '@/lib/supabase';
import { pickAndUploadVehiclePhoto } from '@/lib/vehiclePhoto';
import { COLORS } from '@/constants/DesignSystem';

const BLUE = COLORS.blue;

type FieldDef = {
  key: string;
  label: string;
  required: boolean;
  placeholder: string;
  keyboard?: 'default' | 'number-pad';
  autoCapitalize?: 'none' | 'words';
  hint?: string;
};

interface SelectModalProps {
  visible: boolean;
  title: string;
  options: string[];
  onSelect: (value: string) => void;
  onClose: () => void;
  searchable?: boolean;
}

function SelectModal({ visible, title, options, onSelect, onClose, searchable = true }: SelectModalProps) {
  const [search, setSearch] = useState('');

  const filtered = searchable
    ? options.filter((o) => o.toLowerCase().includes(search.toLowerCase()))
    : options;

  const handleSelect = (item: string) => {
    onSelect(item);
    setSearch('');
    onClose();
  };

  const handleClose = () => {
    setSearch('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={modalStyles.backdrop}>
        <View style={[modalStyles.sheet, { backgroundColor: COLORS.white }]}>
          <View style={modalStyles.header}>
            <Text style={[modalStyles.headerTitle, { color: COLORS.text }]}>
              {title}
            </Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          {searchable && (
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search..."
              placeholderTextColor={COLORS.textMuted}
              style={[modalStyles.searchInput, {
                backgroundColor: COLORS.surface,
                color: COLORS.text,
              }]}
              autoFocus
            />
          )}

          <FlatList
            data={filtered}
            keyExtractor={(item, idx) => `${item}-${idx}`}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => handleSelect(item)}
                style={[modalStyles.option, { borderBottomColor: COLORS.border }]}
              >
                <Text style={[modalStyles.optionText, { color: COLORS.text }]}>
                  {item}
                </Text>
              </TouchableOpacity>
            )}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />
        </View>
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '75%',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Outfit_700Bold',
  },
  searchInput: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    fontSize: 15,
  },
  option: {
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  optionText: {
    fontSize: 16,
  },
});

const YEARS = Array.from(
  { length: new Date().getFullYear() - 1979 },
  (_, i) => String(new Date().getFullYear() - i)
);

const POPULAR_MAKES = [
  'Abarth', 'Acura', 'Alfa Romeo', 'Alpine', 'AMC',
  'Aston Martin', 'Audi',
  'Bentley', 'BMW', 'Bugatti', 'Buick', 'BYD',
  'Cadillac', 'Caterham', 'Chery', 'Chevrolet',
  'Chrysler', 'Citroën',
  'Dacia', 'Daewoo', 'Daihatsu', 'Dodge',
  'Ferrari', 'Fiat', 'Fisker', 'Ford',
  'GAC', 'Geely', 'Genesis', 'GMC', 'Great Wall',
  'Haval', 'Honda', 'Hummer', 'Hyundai',
  'Infiniti', 'Isuzu',
  'JAC', 'Jaguar', 'Jeep',
  'Kia', 'Koenigsegg',
  'Lamborghini', 'Lancia', 'Land Rover', 'Lexus',
  'Lincoln', 'Lotus', 'Lucid', 'Lynk & Co',
  'Maserati', 'Maxus', 'Maybach', 'Mazda',
  'McLaren', 'Mercedes-Benz', 'Mercury', 'MG',
  'Mini', 'Mitsubishi', 'Morgan',
  'NIO', 'Nissan',
  'Oldsmobile', 'Opel',
  'Pagani', 'Peugeot', 'Plymouth', 'Polestar',
  'Pontiac', 'Porsche', 'Proton',
  'Ram', 'Renault', 'Rimac', 'Rivian',
  'Rolls-Royce',
  'Saab', 'Saturn', 'Scion', 'SEAT', 'Skoda',
  'Smart', 'SsangYong', 'Subaru', 'Suzuki',
  'Tata', 'Tesla', 'Toyota', 'TVR',
  'Vauxhall', 'Volkswagen', 'Volvo',
  'Wuling', 'XPeng', 'Zenvo',
].sort();

export default function VehicleFormScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { vehicles, addVehicle, updateVehicle, refreshActiveCar } = useActiveCar();
  const { user } = useAuth();
  const { t } = useLanguage();

  const bg = COLORS.background;
  const surface = COLORS.card;
  const border = COLORS.border;
  const textPrimary = COLORS.text;
  const textMuted = COLORS.textMuted;
  const placeholder = COLORS.textLight;
  const headerBorder = COLORS.border;
  const saveBtnText = COLORS.white;

  const TEXT_FIELDS: FieldDef[] = [
    { key: 'engine', label: t.addVehicle.engine, required: false, placeholder: t.addVehicle.enginePlaceholder, autoCapitalize: 'words' },
    { key: 'mileage', label: t.addVehicle.mileage, required: true, placeholder: t.addVehicle.mileagePlaceholder, keyboard: 'number-pad', hint: t.addVehicle.mileageHelper },
  ];

  const isEditing = !!params.id;
  const existingVehicle = isEditing ? vehicles.find((v) => v.id === params.id) : null;

  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [engine, setEngine] = useState('');
  const [mileage, setMileage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);

  const [vin, setVin] = useState('');
  const [decodingVin, setDecodingVin] = useState(false);
  const [vinDecoded, setVinDecoded] = useState(false);
  const [vinError, setVinError] = useState('');

  const [makes] = useState<string[]>(POPULAR_MAKES);
  const [models, setModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [showYearModal, setShowYearModal] = useState(false);
  const [showMakeModal, setShowMakeModal] = useState(false);
  const [showModelModal, setShowModelModal] = useState(false);

  const skipModelResetRef = useRef(false);

  useEffect(() => {
    if (!make) { setModels([]); return; }
    if (skipModelResetRef.current) {
      skipModelResetRef.current = false;
    } else {
      setModel('');
    }
    setLoadingModels(true);
    fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMake/${encodeURIComponent(make)}?format=json`)
      .then((r) => r.json())
      .then((data) => {
        const names: string[] = (data.Results ?? []).map((m: any) => m.Model_Name as string);
        names.sort((a, b) => a.localeCompare(b));
        setModels(names);
      })
      .catch(() => {})
      .finally(() => setLoadingModels(false));
  }, [make]);

  const fieldMap: Record<string, { value: string; setter: (v: string) => void }> = {
    engine: { value: engine, setter: setEngine },
    mileage: { value: mileage, setter: setMileage },
  };

  useEffect(() => {
    if (isEditing) {
      setYear(params.year as string || '');
      setEngine(params.engine as string || '');
      setMileage(params.mileage as string || '');
      skipModelResetRef.current = true;
      setMake(params.make as string || '');
      setModel(params.model as string || '');
    }
  }, [isEditing, params]);

  const validateForm = (): boolean => {
    if (!make.trim()) { Alert.alert(t.addVehicle.validationError, t.addVehicle.enterMake); return false; }
    if (!model.trim()) { Alert.alert(t.addVehicle.validationError, t.addVehicle.enterModel); return false; }
    const yearNum = parseInt(year, 10);
    if (!year || isNaN(yearNum) || yearNum < 1900 || yearNum > new Date().getFullYear() + 1) {
      Alert.alert(t.addVehicle.validationError, t.addVehicle.enterYear); return false;
    }
    const mileageNum = parseFloat(mileage);
    if (!mileage || isNaN(mileageNum)) { Alert.alert(t.addVehicle.validationError, t.addVehicle.enterMileage); return false; }
    const mileageError = validateMileageUpdate(mileageNum, existingVehicle || null);
    if (mileageError) { Alert.alert(t.addVehicle.validationError, mileageError.message); return false; }
    const vehicleError = validateVehicleData({ mileage: mileageNum });
    if (vehicleError) { Alert.alert(t.addVehicle.validationError, vehicleError.message); return false; }
    return true;
  };

  const handlePhotoPress = useCallback(async () => {
    if (!isEditing || !existingVehicle?.id || !user?.id) return;
    setPhotoUploading(true);
    const url = await pickAndUploadVehiclePhoto(existingVehicle.id, user.id);
    if (url) {
      await updateVehicle(existingVehicle.id, { photo_url: url });
      await refreshActiveCar();
    }
    setPhotoUploading(false);
  }, [isEditing, existingVehicle?.id, user?.id, updateVehicle, refreshActiveCar]);

  const decodeVinString = async (vinToDecode: string) => {
    setDecodingVin(true);
    setVinError('');
    try {
      const res = await fetch(
        `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/${vinToDecode}?format=json`
      );
      const data = await res.json();
      const getValue = (variable: string) =>
        data.Results?.find((r: any) => r.Variable === variable)?.Value;

      const decodedYear = getValue('Model Year');
      const decodedMake = getValue('Make');
      const decodedModel = getValue('Model');
      const decodedEngineL = getValue('Displacement (L)');

      if (!decodedMake || decodedMake === 'null') {
        setVinError('VIN not recognized. Please fill in details manually.');
        return;
      }

      const capitalize = (s: string) =>
        s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

      if (decodedYear) setYear(decodedYear);
      if (decodedMake) {
        skipModelResetRef.current = true;
        setMake(capitalize(decodedMake));
      }
      if (decodedModel) setModel(decodedModel);
      if (decodedEngineL) setEngine(`${decodedEngineL}L`);

      setVinDecoded(true);
    } catch {
      setVinError('Could not decode VIN. Check your connection.');
    } finally {
      setDecodingVin(false);
    }
  };

  const decodeVin = () => decodeVinString(vin);

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      let { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously();
        if (anonError) { Alert.alert(t.addVehicle.error, t.addVehicle.errorGuestSession); return; }
        session = anonData.session;
      }
      const userId = session!.user.id;
      const { error: dbError } = await supabase.from('vehicles').insert({
        user_id: userId,
        make,
        model,
        year: parseInt(year, 10) || 0,
        engine_code: engine,
        current_mileage: parseInt(mileage, 10) || 0,
        vin: vin || null,
      });
      if (dbError) { Alert.alert(t.addVehicle.databaseError, dbError.message); return; }
      await refreshActiveCar();
      router.back();
    } catch (error) {
      Alert.alert(t.addVehicle.error, error instanceof Error ? error.message : t.addVehicle.errorSave);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <StatusBar barStyle="dark-content" backgroundColor={bg} />

      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: bg, borderBottomColor: headerBorder, paddingTop: Platform.OS === 'ios' ? insets.top + 8 : 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.cancelBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={[styles.cancelText, { color: textMuted }]}>{t.addVehicle.cancel}</Text>
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: textPrimary }]}>
          {isEditing ? t.addVehicle.editTitle : t.addVehicle.title}
        </Text>

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isSubmitting}
          style={[styles.saveBtn, isSubmitting && styles.saveBtnDisabled]}
          activeOpacity={0.8}
        >
          <Text style={[styles.saveBtnText, { color: saveBtnText }]}>
            {isSubmitting ? t.addVehicle.saving : isEditing ? t.addVehicle.save : t.addVehicle.add}
          </Text>
        </TouchableOpacity>
      </View>

      {/* FORM */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {isEditing && existingVehicle && (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={handlePhotoPress}
              style={[styles.photoSection, { backgroundColor: surface, borderColor: border }]}
            >
              {existingVehicle.photo_url ? (
                <Image
                  source={{ uri: existingVehicle.photo_url }}
                  style={styles.formVehiclePhoto}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.formPhotoPlaceholder}>
                  <Ionicons name="camera-outline" size={32} color="#444444" />
                  <Text style={styles.formPhotoPlaceholderText}>Add Photo</Text>
                </View>
              )}
              {existingVehicle.photo_url && (
                <View style={styles.formPhotoEditBtn}>
                  <Ionicons name="camera" size={16} color="#FFFFFF" />
                </View>
              )}
              {photoUploading && (
                <View style={styles.formPhotoUploadOverlay}>
                  <ActivityIndicator size="large" color={BLUE} />
                  <Text style={styles.formPhotoUploadText}>Uploading...</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
          <View style={[styles.formCard, { backgroundColor: surface, borderColor: border }]}>
            {/* VIN section */}
            <View style={[styles.fieldWrap, { marginBottom: 20 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={[styles.label, { color: textMuted, marginBottom: 0 }]}>
                  VIN (optional)
                </Text>
                <Text style={{ color: vin.length === 17 ? '#2ECC71' : textMuted, fontSize: 12 }}>
                  {vin.length}/17
                </Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 6 }}>
                <TextInput
                  value={vin}
                  onChangeText={(t) => {
                    setVin(t.toUpperCase());
                    setVinDecoded(false);
                    setVinError('');
                  }}
                  placeholder="e.g. 1HGBH41JXMN109186"
                  placeholderTextColor={placeholder}
                  maxLength={17}
                  autoCapitalize="characters"
                  editable={!isSubmitting}
                  style={[styles.inputText, {
                    flex: 1,
                    backgroundColor: bg,
                    borderWidth: 1,
                    borderColor: border,
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    color: textPrimary,
                  }]}
                />

                <TouchableOpacity
                  onPress={decodeVin}
                  disabled={vin.length !== 17 || decodingVin}
                  style={{
                    backgroundColor: vin.length === 17 ? BLUE : bg,
                    borderRadius: 10,
                    paddingHorizontal: 14,
                    height: 52,
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: vin.length === 17 ? BLUE : border,
                  }}
                >
                  {decodingVin ? (
                    <ActivityIndicator size="small" color={vin.length === 17 ? '#000000' : '#666666'} />
                  ) : (
                    <Text style={{
                      color: vin.length === 17 ? '#000000' : '#666666',
                      fontWeight: '600',
                      fontSize: 14,
                    }}>
                      Decode
                    </Text>
                  )}
                </TouchableOpacity>
              </View>

              {vinError ? (
                <Text style={{ color: '#FF4444', fontSize: 13, marginTop: -2 }}>
                  {vinError}
                </Text>
              ) : vinDecoded ? (
                <Text style={{ color: '#2ECC71', fontSize: 13, marginTop: -2 }}>
                  Vehicle details filled automatically
                </Text>
              ) : (
                <Text style={{ color: textMuted, fontSize: 12, marginTop: -2 }}>
                  Scan or enter VIN to auto-fill year, make and model
                </Text>
              )}
            </View>

            {/* Year selector */}
            <View style={[styles.fieldWrap, { marginBottom: 20 }]}>
              <Text style={[styles.label, { color: textMuted }]}>
                {t.addVehicle.year}
                <Text style={styles.asterisk}> *</Text>
              </Text>
              <TouchableOpacity
                onPress={() => setShowYearModal(true)}
                style={[styles.selectorRow, { backgroundColor: bg, borderColor: border }]}
              >
                <Text style={{ color: year ? textPrimary : placeholder, fontSize: 15 }}>
                  {year || t.addVehicle.yearPlaceholder}
                </Text>
                <Ionicons name="chevron-down" size={18} color={textMuted} />
              </TouchableOpacity>
            </View>

            {/* Make selector */}
            <View style={[styles.fieldWrap, { marginBottom: 20 }]}>
              <Text style={[styles.label, { color: textMuted }]}>
                {t.addVehicle.make}
                <Text style={styles.asterisk}> *</Text>
              </Text>
              <TouchableOpacity
                onPress={() => setShowMakeModal(true)}
                style={[styles.selectorRow, { backgroundColor: bg, borderColor: border }]}
              >
                <Text style={{ color: make ? textPrimary : placeholder, fontSize: 15 }}>
                  {make || t.addVehicle.makePlaceholder}
                </Text>
                <Ionicons name="chevron-down" size={18} color={textMuted} />
              </TouchableOpacity>
            </View>

            {/* Model selector */}
            <View style={[styles.fieldWrap, { marginBottom: 20 }]}>
              <Text style={[styles.label, { color: textMuted }]}>
                {t.addVehicle.model}
                <Text style={styles.asterisk}> *</Text>
              </Text>
              <TouchableOpacity
                onPress={() => { if (make && !loadingModels) setShowModelModal(true); }}
                style={[styles.selectorRow, { backgroundColor: bg, borderColor: border, opacity: make ? 1 : 0.4 }]}
              >
                {loadingModels ? (
                  <ActivityIndicator size="small" color={BLUE} />
                ) : (
                  <Text style={{ color: model ? textPrimary : placeholder, fontSize: 15 }}>
                    {model || t.addVehicle.modelPlaceholder}
                  </Text>
                )}
                <Ionicons name="chevron-down" size={18} color={textMuted} />
              </TouchableOpacity>
            </View>

            {/* Remaining text fields (engine, mileage) */}
            {TEXT_FIELDS.map((field, idx) => {
              const { value, setter } = fieldMap[field.key];
              const isFocused = focusedField === field.key;
              const isLast = idx === TEXT_FIELDS.length - 1;
              return (
                <View key={field.key} style={[styles.fieldWrap, !isLast && { marginBottom: 20 }]}>
                  <Text style={[styles.label, { color: textMuted }]}>
                    {field.label}
                    {field.required && <Text style={styles.asterisk}> *</Text>}
                  </Text>
                  <View
                    style={[
                      styles.inputWrap,
                      { backgroundColor: bg, borderColor: isFocused ? BLUE : border },
                    ]}
                  >
                    <TextInput
                      style={[styles.inputText, { color: textPrimary }]}
                      value={value}
                      onChangeText={setter}
                      placeholder={field.placeholder}
                      placeholderTextColor={placeholder}
                      keyboardType={field.keyboard || 'default'}
                      autoCapitalize={field.autoCapitalize || 'none'}
                      editable={!isSubmitting}
                      onFocus={() => setFocusedField(field.key)}
                      onBlur={() => setFocusedField(null)}
                    />
                  </View>
                  {field.hint && (
                    <Text style={[styles.hint, { color: textMuted }]}>{field.hint}</Text>
                  )}
                </View>
              );
            })}
          </View>

          {/* Selector modals */}
          <SelectModal
            visible={showYearModal}
            title="Select Year"
            options={YEARS}
            onSelect={setYear}
            onClose={() => setShowYearModal(false)}
            searchable={false}
          />
          <SelectModal
            visible={showMakeModal}
            title="Select Make"
            options={makes}
            onSelect={(val) => { setMake(val); setModel(''); }}
            onClose={() => setShowMakeModal(false)}
            searchable
          />
          <SelectModal
            visible={showModelModal}
            title="Select Model"
            options={models}
            onSelect={setModel}
            onClose={() => setShowModelModal(false)}
            searchable
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  cancelBtn: { paddingVertical: 8, paddingHorizontal: 4, minWidth: 60 },
  cancelText: { fontSize: 16, fontWeight: '500' },
  headerTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center', flex: 1 },
  saveBtn: {
    backgroundColor: COLORS.amber,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { fontSize: 15, fontWeight: '600' },

  // Form
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 24, paddingHorizontal: 24, paddingBottom: 40 },
  photoSection: {
    width: '100%',
    marginBottom: 20,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  formVehiclePhoto: {
    width: '100%',
    height: 160,
    borderRadius: 16,
  },
  formPhotoPlaceholder: {
    width: '100%',
    height: 120,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formPhotoPlaceholderText: {
    color: '#444444',
    fontSize: 13,
    marginTop: 6,
  },
  formPhotoEditBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  formPhotoUploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  formPhotoUploadText: {
    color: '#FFFFFF',
    fontSize: 13,
    marginTop: 8,
  },
  formCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
  },

  // Fields
  fieldWrap: {},
  label: { fontSize: 13, fontWeight: '500', marginBottom: 6 },
  asterisk: { color: BLUE },
  inputWrap: {
    borderWidth: 1,
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  selectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 16,
  },
  inputText: { fontSize: 15, height: 52 },
  hint: { fontSize: 12, marginTop: 6 },
});
