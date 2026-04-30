import { useRef, useCallback, useState, useEffect } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, Alert, View, Text, StatusBar, Image, ActivityIndicator, Modal, TextInput, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

import { useActiveCar } from '@/contexts/ActiveCarContext';
import { Vehicle } from '@/types/vehicle';
import { hasOverdueServices, hasDueSoonServices } from '@/utils/maintenance-status';
import { formatMileage, getUnitLabel } from '@/utils/formatting';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUnits } from '@/contexts/UnitsContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { pickAndUploadVehiclePhoto } from '@/lib/vehiclePhoto';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { scheduleWrenchyMileageAlerts } from '@/lib/notifications';
import { COLORS, SPACING, RADIUS, TYPE, getColors, SHADOWS } from '@/constants/DesignSystem';
import { ChunkyCard } from '@/components/ui/ChunkyCard';
import { ChunkyButton } from '@/components/ui/ChunkyButton';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { calculateHealthScore } from '@/lib/healthScore';
import { getUserAchievements, BADGES, ALL_BADGE_IDS } from '@/lib/achievements';

export default function GarageScreen() {
  const { vehicles, activeVehicleId, activeCar, isLoading, deleteVehicle, setActiveVehicle, refreshActiveCar, updateVehicle, fetchVehicles } = useActiveCar();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { unitSystem } = useUnits();
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const c = getColors(isDark);

  const [forceReady, setForceReady] = useState(false);
  useEffect(() => {
    const timeout = setTimeout(() => setForceReady(true), 6000);
    return () => clearTimeout(timeout);
  }, []);

  const [uploadingVehicleId, setUploadingVehicleId] = useState<string | null>(null);
  const [photoRefreshKey, setPhotoRefreshKey] = useState(0);
  const [localPhotoUrls, setLocalPhotoUrls] = useState<Record<string, string>>({});
  const [mileageModalVisible, setMileageModalVisible] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [newMileage, setNewMileage] = useState('');
  const [savingMileage, setSavingMileage] = useState(false);
  const [earnedBadges, setEarnedBadges] = useState<string[]>([]);
  const [garageLogs, setGarageLogs] = useState<any[]>([]);
  const [garageReminders, setGarageReminders] = useState<any[]>([]);

  const isNavigatingRef = useRef(false);
  const displayActiveCar = activeCar || vehicles.find((v) => v.id === activeVehicleId) || null;

  useFocusEffect(useCallback(() => { refreshActiveCar(); }, [refreshActiveCar]));

  useEffect(() => {
    if (user?.id) getUserAchievements(user.id).then(setEarnedBadges).catch(() => {});
  }, [user?.id]);

  useEffect(() => {
    const carId = displayActiveCar?.id;
    if (!carId) { setGarageLogs([]); setGarageReminders([]); return; }
    Promise.all([
      supabase.from('maintenance_logs').select('*').eq('vehicle_id', carId).order('created_at', { ascending: false }),
      supabase.from('maintenance_reminders').select('*').eq('vehicle_id', carId).eq('is_completed', false),
    ]).then(([{ data: logs }, { data: rem }]) => {
      setGarageLogs(logs ?? []);
      setGarageReminders(rem ?? []);
    }).catch(() => { setGarageLogs([]); setGarageReminders([]); });
  }, [displayActiveCar?.id]);

  const handleAddVehicle = useCallback(() => {
    if (isNavigatingRef.current || isLoading) return;
    isNavigatingRef.current = true;
    router.push('/vehicle-form');
    setTimeout(() => { isNavigatingRef.current = false; }, 1000);
  }, [router, isLoading]);

  const openMileageEditor = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setNewMileage(vehicle.mileage.toString());
    setMileageModalVisible(true);
  };

  const saveMileage = useCallback(async () => {
    if (!editingVehicle) return;
    const parsed = parseInt(newMileage.replace(/[^0-9]/g, ''), 10);
    if (isNaN(parsed) || parsed < editingVehicle.mileage) {
      Alert.alert('Invalid Mileage', parsed < editingVehicle.mileage ? "New mileage can't be lower than current mileage." : 'Please enter a valid number.');
      return;
    }
    setSavingMileage(true);
    const { error } = await supabase.from('vehicles').update({ current_mileage: parsed }).eq('id', editingVehicle.id);
    if (error) { Alert.alert('Error', error.message || 'Could not update mileage.'); setSavingMileage(false); return; }
    const { data: logs } = await supabase.from('maintenance_logs').select('service_name, mileage_at_service').eq('vehicle_id', editingVehicle.id).order('created_at', { ascending: false });
    const lastOil = logs?.find((l: any) => l.service_name?.toLowerCase().includes('oil'))?.mileage_at_service ?? 0;
    const lastTire = logs?.find((l: any) => l.service_name?.toLowerCase().includes('tire') || l.service_name?.toLowerCase().includes('tyre'))?.mileage_at_service ?? 0;
    const lastBrake = logs?.find((l: any) => l.service_name?.toLowerCase().includes('brake'))?.mileage_at_service ?? 0;
    await scheduleWrenchyMileageAlerts({ ...editingVehicle, mileage: parsed }, { oil: lastOil, tire: lastTire, brake: lastBrake });
    await fetchVehicles();
    setMileageModalVisible(false);
    setSavingMileage(false);
  }, [editingVehicle, newMileage, fetchVehicles]);

  const handleEditVehicle = useCallback((vehicle: Vehicle) => {
    if (isNavigatingRef.current || isLoading) return;
    isNavigatingRef.current = true;
    router.push({ pathname: '/vehicle-form', params: { id: vehicle.id, make: vehicle.make, model: vehicle.model, year: vehicle.year.toString(), engine: vehicle.engine || '', mileage: vehicle.mileage.toString() } });
    setTimeout(() => { isNavigatingRef.current = false; }, 1000);
  }, [router, isLoading]);

  const handleDeleteVehicle = (vehicle: Vehicle) => {
    const vehicleName = [vehicle.make?.trim(), vehicle.model?.trim()].filter(Boolean).join(' ');
    Alert.alert(t.garage.deleteVehicle, `${t.garage.deleteConfirm} ${vehicleName}?`, [
      { text: t.garage.cancel, style: 'cancel' },
      { text: t.garage.delete, style: 'destructive', onPress: async () => { try { await deleteVehicle(vehicle.id); } catch (e) { Alert.alert(t.garage.error, e instanceof Error ? e.message : t.garage.errorDeleteVehicle); } } },
    ]);
  };

  const handleSetActive = async (vehicleId: string) => {
    try { await setActiveVehicle(vehicleId); await refreshActiveCar(); }
    catch (e) { Alert.alert(t.garage.error, e instanceof Error ? e.message : t.garage.errorUpdateActive); }
  };

  const handleVehiclePhotoPress = useCallback(async (vehicle: Vehicle) => {
    if (!user?.id) return;
    setUploadingVehicleId(vehicle.id);
    const url = await pickAndUploadVehiclePhoto(vehicle.id, user.id);
    if (url) {
      const urlWithBuster = `${url}?t=${Date.now()}`;
      setLocalPhotoUrls((prev) => ({ ...prev, [vehicle.id]: urlWithBuster }));
      await supabase.from('vehicles').update({ photo_url: urlWithBuster }).eq('id', vehicle.id).eq('user_id', user.id);
      await fetchVehicles();
      setPhotoRefreshKey(Date.now());
    }
    setUploadingVehicleId(null);
  }, [user?.id, fetchVehicles]);

  const otherVehicles = vehicles.filter((v) => v.id !== activeVehicleId);

  if (isLoading && !forceReady) {
    return (
      <View style={[styles.container, { backgroundColor: c.background, paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={COLORS.blue} size="large" />
        <Text style={[TYPE.body, { color: c.textMuted, marginTop: SPACING.md }]}>{t.garage.loading || 'Loading your garage...'}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.background, paddingTop: insets.top }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={c.background} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={[TYPE.displayMD, { color: c.text }]}>My Garage</Text>
        <TouchableOpacity
          onPress={handleAddVehicle}
          style={[styles.addBtn, { backgroundColor: COLORS.blue }]}
          disabled={isLoading || isNavigatingRef.current}
        >
          <Ionicons name="add" size={22} color="#000" />
        </TouchableOpacity>
      </View>

      {vehicles.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={{ fontSize: 64 }}>🚗</Text>
          <Text style={[TYPE.h2, { color: c.text, marginTop: SPACING.xl }]}>{t.garage.empty}</Text>
          <Text style={[TYPE.body, { color: c.textSecondary, marginTop: SPACING.sm, textAlign: 'center', maxWidth: 260 }]}>
            {t.garage.emptySubtext}
          </Text>
          <ChunkyButton title={t.garage.addVehicle} onPress={handleAddVehicle} style={{ marginTop: SPACING.xxl, width: '100%' }} />
        </View>
      ) : (
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          {/* Active Vehicle Hero */}
          {displayActiveCar && (
            <ChunkyCard
              noPadding
              style={styles.heroCard}
              onPress={() => router.push({ pathname: '/vehicle-detail', params: { vehicleId: displayActiveCar.id } })}
            >
              {/* Photo */}
              <Pressable onPress={(e) => { e.stopPropagation?.(); handleVehiclePhotoPress(displayActiveCar); }}>
                {localPhotoUrls[displayActiveCar.id] || displayActiveCar.photo_url ? (
                  <Image
                    source={{ uri: localPhotoUrls[displayActiveCar.id] || (displayActiveCar.photo_url + '?t=' + photoRefreshKey) }}
                    style={styles.heroPhoto}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.heroPhotoPlaceholder, { backgroundColor: isDark ? '#1C1C1C' : '#F0EDE6' }]}>
                    <Ionicons name="camera-outline" size={36} color={c.textMuted} />
                    <Text style={[TYPE.bodySM, { color: c.textMuted, marginTop: 4 }]}>Add Photo</Text>
                  </View>
                )}
                {displayActiveCar.photo_url && (
                  <View style={styles.cameraBtn}>
                    <Ionicons name="camera" size={16} color="#FFF" />
                  </View>
                )}
                {uploadingVehicleId === displayActiveCar.id && (
                  <View style={styles.uploadOverlay}>
                    <ActivityIndicator size="large" color={COLORS.blue} />
                    <Text style={[TYPE.bodySM, { color: '#FFF', marginTop: 8 }]}>Uploading...</Text>
                  </View>
                )}
              </Pressable>

              {/* Content */}
              <View style={styles.heroContent}>
                <View style={styles.heroHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[TYPE.h1, { color: c.text }]}>
                      {[displayActiveCar.make?.trim(), displayActiveCar.model?.trim()].filter(Boolean).join(' ') || t.garage.unknown}
                    </Text>
                    <Text style={[TYPE.body, { color: c.textSecondary, marginTop: 2 }]}>
                      {displayActiveCar.make} · {displayActiveCar.year}
                    </Text>
                  </View>
                  <View style={styles.activePill}>
                    <View style={styles.activePillDot} />
                    <Text style={styles.activePillText}>Active</Text>
                  </View>
                </View>

                {/* Mileage */}
                <TouchableOpacity onPress={() => openMileageEditor(displayActiveCar)} style={styles.mileageRow}>
                  <Ionicons name="speedometer-outline" size={16} color={COLORS.blue} />
                  <Text style={[TYPE.body, { color: c.textSecondary }]}>
                    {formatMileage(displayActiveCar.mileage ?? 0, unitSystem)} {getUnitLabel(unitSystem)}
                  </Text>
                  <Ionicons name="pencil-outline" size={14} color={c.textMuted} />
                </TouchableOpacity>

                {/* Stats grid */}
                <View style={styles.statsGrid}>
                  <View style={styles.gridItem}>
                    <Text style={[TYPE.labelSM, { color: c.textMuted }]}>HEALTH</Text>
                    <ProgressRing score={calculateHealthScore(displayActiveCar, garageLogs, garageReminders).score} size={50} strokeWidth={4} />
                  </View>
                  <View style={styles.gridItem}>
                    <Text style={[TYPE.labelSM, { color: c.textMuted }]}>SERVICES</Text>
                    <Text style={[TYPE.statSM, { color: c.text }]}>—</Text>
                  </View>
                </View>

                {/* Action buttons */}
                <View style={styles.actionRow}>
                  <ChunkyButton title="Check Recalls" variant="ghost" small
                    icon={<Ionicons name="warning-outline" size={14} color={COLORS.blue} />}
                    onPress={() => router.push({ pathname: '/recalls', params: { make: displayActiveCar.make, model: displayActiveCar.model, year: String(displayActiveCar.year ?? '') } })}
                  />
                  <ChunkyButton title="Edit" variant="ghost" small
                    icon={<Ionicons name="pencil-outline" size={14} color={COLORS.blue} />}
                    onPress={() => handleEditVehicle(displayActiveCar)}
                  />
                </View>
              </View>
            </ChunkyCard>
          )}

          {/* Achievements Showcase */}
          {earnedBadges.length > 0 && (
            <>
              <Text style={[TYPE.h2, { color: c.text, marginTop: SPACING.xl, marginBottom: SPACING.md }]}>Achievements</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.badgesScroll} contentContainerStyle={styles.badgesRow}>
                {ALL_BADGE_IDS.map((id) => {
                  const badge = BADGES[id];
                  const earned = earnedBadges.includes(id);
                  return (
                    <View key={id} style={[styles.badgeCircle, !earned && styles.badgeLocked]}>
                      <Text style={[styles.badgeEmoji, !earned && { opacity: 0.3 }]}>{badge.emoji}</Text>
                      <Text style={[TYPE.labelSM, { color: earned ? c.text : c.textMuted, marginTop: 4, textAlign: 'center' }]} numberOfLines={1}>
                        {badge.title}
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>
            </>
          )}

          {/* Other Vehicles */}
          {otherVehicles.length > 0 && (
            <>
              <Text style={[TYPE.h2, { color: c.text, marginTop: SPACING.xl, marginBottom: SPACING.md }]}>Other Vehicles</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.otherScroll} contentContainerStyle={styles.otherScrollContent}>
                {otherVehicles.map((vehicle) => (
                  <ChunkyCard
                    key={vehicle.id}
                    noPadding
                    style={styles.otherCard}
                    onPress={() => router.push({ pathname: '/vehicle-detail', params: { vehicleId: vehicle.id } })}
                  >
                    {localPhotoUrls[vehicle.id] || vehicle.photo_url ? (
                      <Image source={{ uri: localPhotoUrls[vehicle.id] || vehicle.photo_url || '' }} style={styles.otherPhoto} resizeMode="cover" />
                    ) : (
                      <View style={[styles.otherPhotoPlaceholder, { backgroundColor: isDark ? '#1C1C1C' : '#F0EDE6' }]}>
                        <Text style={{ fontSize: 32 }}>🚗</Text>
                      </View>
                    )}
                    <View style={styles.otherContent}>
                      <Text style={[TYPE.h3, { color: c.text }]} numberOfLines={1}>
                        {[vehicle.make?.trim(), vehicle.model?.trim()].filter(Boolean).join(' ')}
                      </Text>
                      <Text style={[TYPE.bodySM, { color: c.textSecondary }]}>{vehicle.year}</Text>
                      <View style={styles.otherActions}>
                        <TouchableOpacity onPress={() => handleSetActive(vehicle.id)} style={[styles.miniBtn, { backgroundColor: COLORS.blue + '20' }]}>
                          <Ionicons name="star-outline" size={14} color={COLORS.blue} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDeleteVehicle(vehicle)} style={[styles.miniBtn, { backgroundColor: COLORS.heartRed + '20' }]}>
                          <Ionicons name="trash-outline" size={14} color={COLORS.heartRed} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </ChunkyCard>
                ))}
                {/* Add new vehicle card */}
                <ChunkyCard style={styles.addNewCard} variant="blue" onPress={handleAddVehicle}>
                  <Ionicons name="add" size={32} color="#000" />
                  <Text style={[TYPE.label, { color: '#000', marginTop: 4 }]}>Add Vehicle</Text>
                </ChunkyCard>
              </ScrollView>
            </>
          )}

          <View style={{ height: SPACING.xxxl }} />
        </ScrollView>
      )}

      {/* Mileage Modal */}
      <Modal visible={mileageModalVisible} transparent animationType="fade" onRequestClose={() => setMileageModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[TYPE.h2, { color: c.text, marginBottom: 4 }]}>Update Mileage</Text>
            <Text style={[TYPE.bodySM, { color: c.textSecondary, marginBottom: SPACING.xl }]}>
              {editingVehicle?.year} {editingVehicle?.make?.trim()} {editingVehicle?.model?.trim()}
            </Text>
            <TextInput
              value={newMileage}
              onChangeText={setNewMileage}
              keyboardType="numeric"
              placeholder="Enter current mileage"
              placeholderTextColor={c.textMuted}
              style={[styles.mileageInput, { backgroundColor: c.background, borderColor: COLORS.blue, color: c.text }]}
            />
            <Text style={[TYPE.bodySM, { color: c.textMuted, textAlign: 'center', marginBottom: SPACING.xl }]}>
              Current: {editingVehicle ? editingVehicle.mileage.toLocaleString() : '—'} {getUnitLabel(unitSystem)}
            </Text>
            <ChunkyButton title={savingMileage ? 'Saving...' : 'Save Mileage'} onPress={saveMileage} disabled={savingMileage} />
            <TouchableOpacity onPress={() => setMileageModalVisible(false)} style={{ alignItems: 'center', padding: SPACING.md, marginTop: SPACING.sm }}>
              <Text style={[TYPE.body, { color: c.textMuted }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.xl, paddingTop: SPACING.lg, paddingBottom: SPACING.md },
  addBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', borderWidth: 2.5, borderBottomWidth: 4, borderColor: COLORS.blueDark },
  list: { flex: 1 },
  listContent: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.sm, paddingBottom: SPACING.xxl },

  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: SPACING.xl },

  heroCard: { marginBottom: SPACING.md },
  heroPhoto: { width: '100%', height: 200, borderTopLeftRadius: RADIUS.lg - 2, borderTopRightRadius: RADIUS.lg - 2 },
  heroPhotoPlaceholder: { width: '100%', height: 160, borderTopLeftRadius: RADIUS.lg - 2, borderTopRightRadius: RADIUS.lg - 2, alignItems: 'center', justifyContent: 'center' },
  cameraBtn: { position: 'absolute', top: SPACING.sm, right: SPACING.sm, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  uploadOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', borderTopLeftRadius: RADIUS.lg - 2, borderTopRightRadius: RADIUS.lg - 2 },
  heroContent: { padding: SPACING.xl, gap: SPACING.md },
  heroHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  activePill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.xpGreen, borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 4 },
  activePillDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFF' },
  activePillText: { ...TYPE.labelSM, color: '#FFF' },
  mileageRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },

  statsGrid: { flexDirection: 'row', gap: SPACING.md },
  gridItem: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: SPACING.sm, borderRadius: RADIUS.sm },

  actionRow: { flexDirection: 'row', gap: SPACING.sm },

  badgesScroll: { marginLeft: -SPACING.xl },
  badgesRow: { paddingHorizontal: SPACING.xl, gap: SPACING.md },
  badgeCircle: { width: 64, alignItems: 'center' },
  badgeLocked: { opacity: 0.5 },
  badgeEmoji: { fontSize: 28 },

  otherScroll: { marginLeft: -SPACING.xl },
  otherScrollContent: { paddingHorizontal: SPACING.xl, gap: SPACING.md },
  otherCard: { width: 160 },
  otherPhoto: { width: '100%', height: 100, borderTopLeftRadius: RADIUS.lg - 2, borderTopRightRadius: RADIUS.lg - 2 },
  otherPhotoPlaceholder: { width: '100%', height: 100, borderTopLeftRadius: RADIUS.lg - 2, borderTopRightRadius: RADIUS.lg - 2, alignItems: 'center', justifyContent: 'center' },
  otherContent: { padding: SPACING.md, gap: 2 },
  otherActions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm },
  miniBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  addNewCard: { width: 120, alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.xxxl },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: SPACING.xxl },
  modalContent: { borderRadius: RADIUS.lg, borderWidth: 2.5, borderBottomWidth: 5, padding: SPACING.xxl, width: '100%' },
  mileageInput: { borderWidth: 2, borderRadius: RADIUS.sm, padding: SPACING.md, fontSize: 20, fontFamily: 'Outfit_700Bold', marginBottom: SPACING.sm, textAlign: 'center' },
});
