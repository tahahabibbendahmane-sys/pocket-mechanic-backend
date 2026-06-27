import { useRef, useCallback, useState, useEffect, useMemo } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, Alert, View, Text, StatusBar, Image, ActivityIndicator, Modal, TextInput, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

import { useActiveCar } from '@/contexts/ActiveCarContext';
import { Vehicle } from '@/types/vehicle';
import { formatMileage, getUnitLabel } from '@/utils/formatting';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUnits } from '@/contexts/UnitsContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { pickAndUploadVehiclePhoto } from '@/lib/vehiclePhoto';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { scheduleWrenchyMileageAlerts } from '@/lib/notifications';
import { COLORS, Colors, SPACING, RADIUS, TYPE, getColors, CARD_SHADOW } from '@/constants/DesignSystem';
import { ChunkyButton } from '@/components/ui/ChunkyButton';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { calculateHealthScore } from '@/lib/healthScore';
import { getUserAchievements, BADGES, getEligibleBadgeIds } from '@/lib/achievements';
import { isElectricVehicle } from '@/lib/evDetection';

export default function GarageScreen() {
  const { vehicles, activeVehicleId, activeCar, isLoading, deleteVehicle, setActiveVehicle, refreshActiveCar, fetchVehicles } = useActiveCar();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { unitSystem } = useUnits();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const c = getColors();

  const [forceReady, setForceReady] = useState(false);
  useEffect(() => {
    const timeout = setTimeout(() => setForceReady(true), 5000);
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

  const sortedVehicles = useMemo(() => {
    const list = [...vehicles];
    list.sort((a, b) => {
      if (a.id === activeVehicleId) return -1;
      if (b.id === activeVehicleId) return 1;
      return (b.year ?? 0) - (a.year ?? 0);
    });
    return list;
  }, [vehicles, activeVehicleId]);

  const eligibleBadgeIds = useMemo(
    () => getEligibleBadgeIds(displayActiveCar?.make, displayActiveCar?.model),
    [displayActiveCar?.make, displayActiveCar?.model]
  );

  useFocusEffect(useCallback(() => { refreshActiveCar(); }, [refreshActiveCar]));

  useEffect(() => {
    if (user?.id) getUserAchievements(user.id).then(setEarnedBadges).catch(() => {});
  }, [user?.id]);

  useEffect(() => {
    const carId = displayActiveCar?.id;
    if (!carId) {
      setGarageLogs([]);
      setGarageReminders([]);
      return;
    }
    let cancelled = false;
    const timeout = setTimeout(() => {
      if (!cancelled) {
        setGarageLogs([]);
        setGarageReminders([]);
      }
    }, 5000);
    (async () => {
      try {
        const [{ data: logs, error: e1 }, { data: rem, error: e2 }] = await Promise.all([
          supabase.from('maintenance_logs').select('*').eq('vehicle_id', carId).order('created_at', { ascending: false }),
          supabase.from('maintenance_reminders').select('*').eq('vehicle_id', carId).eq('is_completed', false),
        ]);
        if (e1) throw e1;
        if (e2) throw e2;
        if (!cancelled) {
          setGarageLogs(logs ?? []);
          setGarageReminders(rem ?? []);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setGarageLogs([]);
          setGarageReminders([]);
        }
      } finally {
        clearTimeout(timeout);
      }
    })();
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
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
    const isEV = isElectricVehicle(editingVehicle.make ?? '', editingVehicle.model ?? '');
    let lastOil: number;
    if (!isEV) {
      lastOil = logs?.find((l: any) => l.service_name?.toLowerCase().includes('oil'))?.mileage_at_service ?? 0;
    } else {
      lastOil = parsed;
    }
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

  if (isLoading && !forceReady) {
    return (
      <View style={[styles.container, { backgroundColor: Colors.background, paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={Colors.primary} size="large" />
        <Text style={[TYPE.body, { color: COLORS.textMuted, marginTop: SPACING.md }]}>{t.garage.loading || 'Loading your garage...'}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: Colors.background, paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Garage</Text>
      </View>

      {vehicles.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="car-sport-outline" size={64} color={Colors.primary} />
          <Text style={[TYPE.h2, { color: c.text, marginTop: SPACING.xl }]}>{t.garage.empty}</Text>
          <Text style={[TYPE.body, { color: c.textSecondary, marginTop: SPACING.sm, textAlign: 'center', maxWidth: 260 }]}>
            {t.garage.emptySubtext}
          </Text>
          <TouchableOpacity style={styles.addVehicleBtn} onPress={handleAddVehicle} activeOpacity={0.85}>
            <Text style={styles.addVehicleBtnText}>+ Add Vehicle</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.list} contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + SPACING.xxl }]} showsVerticalScrollIndicator={false}>
          {sortedVehicles.map((vehicle) => {
            const isActive = vehicle.id === activeVehicleId;
            const logs = isActive ? garageLogs : [];
            const reminders = isActive ? garageReminders : [];
            const score = calculateHealthScore(vehicle, logs, reminders).score;

            return (
              <View key={vehicle.id} style={styles.vehicleCard}>
                <TouchableOpacity
                  activeOpacity={0.92}
                  onPress={() => router.push({ pathname: '/vehicle-detail', params: { vehicleId: vehicle.id } })}
                >
                  <View style={styles.vehicleTop}>
                    <Pressable
                      onPress={(e) => { e.stopPropagation?.(); handleVehiclePhotoPress(vehicle); }}
                      style={styles.thumbWrap}
                    >
                      {localPhotoUrls[vehicle.id] || vehicle.photo_url ? (
                        <Image
                          source={{ uri: localPhotoUrls[vehicle.id] || (vehicle.photo_url + '?t=' + photoRefreshKey) }}
                          style={styles.thumb}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.thumbPlaceholder}>
                          <Ionicons name="car-sport-outline" size={28} color={Colors.textMuted} />
                        </View>
                      )}
                      {uploadingVehicleId === vehicle.id && (
                        <View style={styles.uploadOverlay}>
                          <ActivityIndicator color={Colors.primary} />
                        </View>
                      )}
                    </Pressable>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.vehicleName}>
                        {[vehicle.make?.trim(), vehicle.model?.trim()].filter(Boolean).join(' ') || t.garage.unknown}
                      </Text>
                      <Text style={styles.vehicleYearMileage}>
                        {vehicle.year} · {formatMileage(vehicle.mileage ?? 0, unitSystem)} {getUnitLabel(unitSystem)}
                      </Text>
                      <View style={styles.pillRow}>
                        {isActive && (
                          <View style={styles.activeBadge}>
                            <Text style={styles.activeBadgeText}>Active</Text>
                          </View>
                        )}
                      </View>
                      <TouchableOpacity onPress={(e) => { e.stopPropagation?.(); openMileageEditor(vehicle); }} style={styles.mileageRow}>
                        <Ionicons name="speedometer-outline" size={16} color={Colors.textMuted} />
                        <Text style={styles.mileageText}>
                          {formatMileage(vehicle.mileage ?? 0, unitSystem)} {getUnitLabel(unitSystem)}
                        </Text>
                        <Ionicons name="pencil-outline" size={14} color={Colors.textMuted} />
                      </TouchableOpacity>
                    </View>

                    <ProgressRing score={score} size={44} strokeWidth={4} />
                  </View>
                </TouchableOpacity>

                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={{
                      backgroundColor: 'transparent',
                      borderWidth: 0.5,
                      borderColor: '#E2E6EA',
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                    }}
                    onPress={() =>
                      router.push({
                        pathname: '/recalls',
                        params: { make: vehicle.make, model: vehicle.model, year: String(vehicle.year ?? '') },
                      })
                    }
                  >
                    <Text style={{ color: '#6B7280', fontFamily: 'Outfit_500Medium', fontSize: 13 }}>Recalls</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{
                      backgroundColor: 'transparent',
                      borderWidth: 0.5,
                      borderColor: '#E2E6EA',
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                    }}
                    onPress={() => handleEditVehicle(vehicle)}
                  >
                    <Text style={{ color: '#1A6FBF', fontFamily: 'Outfit_500Medium', fontSize: 13 }}>Edit</Text>
                  </TouchableOpacity>
                  {!isActive && (
                    <TouchableOpacity
                      style={{
                        backgroundColor: '#EBF3FC',
                        borderWidth: 0,
                        borderRadius: 8,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                      }}
                      onPress={() => handleSetActive(vehicle.id)}
                    >
                      <Text style={{ color: '#1A6FBF', fontFamily: 'Outfit_500Medium', fontSize: 13 }}>Set active</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={() => handleDeleteVehicle(vehicle)}
                    style={{ justifyContent: 'center', alignItems: 'center', padding: 8 }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="trash-outline" size={20} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

          {earnedBadges.length > 0 && (
            <>
              <Text style={[TYPE.h2, { color: c.text, marginTop: SPACING.xl, marginBottom: SPACING.md }]}>Achievements</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.badgesScroll} contentContainerStyle={styles.badgesRow}>
                {eligibleBadgeIds.map((id) => {
                  const badge = BADGES[id];
                  const earned = earnedBadges.includes(id);
                  return (
                    <View key={id} style={[styles.badgeCircle, !earned && styles.badgeLocked]}>
                      <Ionicons name={earned ? 'ribbon-outline' : 'lock-closed-outline'} size={26} color={earned ? Colors.primary : Colors.textMuted} />
                      <Text style={[TYPE.labelSM, { color: earned ? c.text : c.textMuted, marginTop: 4, textAlign: 'center' }]} numberOfLines={1}>
                        {badge.title}
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>
            </>
          )}

          <TouchableOpacity style={styles.addVehicleBtn} onPress={handleAddVehicle} activeOpacity={0.85}>
            <Text style={styles.addVehicleBtnText}>+ Add Vehicle</Text>
          </TouchableOpacity>

          <View style={{ height: SPACING.md }} />
        </ScrollView>
      )}

      <Modal visible={mileageModalVisible} transparent animationType="fade" onRequestClose={() => setMileageModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={[TYPE.h2, { color: COLORS.text, marginBottom: 4 }]}>Update Mileage</Text>
            <Text style={[TYPE.bodySM, { color: COLORS.textMuted, marginBottom: SPACING.xl }]}>
              {editingVehicle?.year} {editingVehicle?.make?.trim()} {editingVehicle?.model?.trim()}
            </Text>
            <TextInput
              value={newMileage}
              onChangeText={setNewMileage}
              keyboardType="numeric"
              placeholder="Enter current mileage"
              placeholderTextColor={COLORS.textLight}
              style={styles.mileageInput}
            />
            <Text style={[TYPE.bodySM, { color: COLORS.textMuted, textAlign: 'center', marginBottom: SPACING.xl }]}>
              Current: {editingVehicle ? editingVehicle.mileage.toLocaleString() : '—'} {getUnitLabel(unitSystem)}
            </Text>
            <ChunkyButton title={savingMileage ? 'Saving...' : 'Save Mileage'} onPress={saveMileage} disabled={savingMileage} />
            <TouchableOpacity onPress={() => setMileageModalVisible(false)} style={{ alignItems: 'center', padding: SPACING.md, marginTop: SPACING.sm }}>
              <Text style={[TYPE.body, { color: COLORS.textMuted }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.lg, paddingBottom: SPACING.md },
  headerTitle: { fontFamily: 'Outfit_700Bold', fontSize: 26, color: Colors.textPrimary },
  list: { flex: 1 },
  listContent: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.sm },
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: SPACING.xl },

  vehicleCard: {
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: Colors.border,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    backgroundColor: Colors.surface,
    ...CARD_SHADOW,
  },
  vehicleTop: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md },
  thumbWrap: { width: 70, height: 70, borderRadius: 10, overflow: 'hidden', backgroundColor: Colors.surfaceSecondary },
  thumb: { width: '100%', height: '100%' },
  thumbPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surfaceSecondary },
  uploadOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.85)', justifyContent: 'center', alignItems: 'center' },
  vehicleName: { fontFamily: 'Outfit_600SemiBold', fontSize: 16, color: Colors.textPrimary },
  vehicleYearMileage: { fontFamily: 'Outfit_400Regular', fontSize: 13, color: Colors.textMuted, marginTop: 4 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.sm },
  activeBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  activeBadgeText: { fontFamily: 'Outfit_600SemiBold', fontSize: 12, color: Colors.primary },
  mileageRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginTop: SPACING.sm },
  mileageText: { fontFamily: 'Outfit_400Regular', fontSize: 13, color: Colors.textMuted },
  cardActions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.md },

  badgesScroll: { marginLeft: -SPACING.xl },
  badgesRow: { paddingHorizontal: SPACING.xl, gap: SPACING.md },
  badgeCircle: { width: 64, alignItems: 'center' },
  badgeLocked: { opacity: 0.5 },

  addVehicleBtn: {
    marginTop: SPACING.lg,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    width: '100%',
  },
  addVehicleBtnText: { fontFamily: 'Outfit_600SemiBold', fontSize: 15, color: Colors.surface },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: SPACING.xxl,
    paddingBottom: SPACING.xxxl,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderBottomWidth: 0,
  },
  modalHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border, marginBottom: SPACING.lg },
  mileageInput: {
    borderWidth: 2,
    borderRadius: RADIUS.sm,
    borderColor: COLORS.border,
    padding: SPACING.md,
    fontSize: 20,
    fontFamily: 'Outfit_700Bold',
    marginBottom: SPACING.sm,
    textAlign: 'center',
    color: COLORS.text,
    backgroundColor: COLORS.surface,
  },
});
