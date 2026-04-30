import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useActiveCar } from '@/contexts/ActiveCarContext';
import { supabase } from '@/lib/supabase';
import { calculateHealthScore } from '@/lib/healthScore';
import { useTheme } from '@/contexts/ThemeContext';
import { useUnits } from '@/contexts/UnitsContext';
import { COLORS, getColors } from '@/constants/DesignSystem';

export default function VehicleDetailScreen() {
  const { vehicleId } = useLocalSearchParams<{ vehicleId: string }>();
  const { vehicles } = useActiveCar();
  const router = useRouter();
  const { isDark } = useTheme();
  const { unitSystem } = useUnits();
  const _c = getColors(isDark);

  const background = _c.background;
  const surface = _c.surface;
  const border = _c.border;
  const textPrimary = _c.text;
  const textSecondary = _c.textSecondary;

  const vehicle = vehicles.find((v) => v.id === vehicleId);

  const [reminders, setReminders] = useState<any[]>([]);
  const [serviceLogs, setServiceLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!vehicleId) return;
    const timeout = setTimeout(() => setLoading(false), 6000);
    const load = async () => {
      try {
        const [{ data: rem }, { data: logs }] = await Promise.all([
          supabase
            .from('maintenance_reminders')
            .select('*')
            .eq('vehicle_id', vehicleId)
            .eq('is_completed', false)
            .order('due_date', { ascending: true }),
          supabase
            .from('maintenance_logs')
            .select('*')
            .eq('vehicle_id', vehicleId)
            .order('created_at', { ascending: false }),
        ]);
        setReminders(rem ?? []);
        setServiceLogs(logs ?? []);
      } catch {
        setReminders([]);
        setServiceLogs([]);
      } finally {
        clearTimeout(timeout);
        setLoading(false);
      }
    };
    load();
    return () => clearTimeout(timeout);
  }, [vehicleId]);

  if (!vehicle) return null;
  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: background,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator color="#0567A6" />
      </View>
    );
  }

  const healthResult = calculateHealthScore(vehicle, serviceLogs, reminders);

  const mileageAlerts: { icon: string; text: string; color: string }[] = [];
  const lastOil =
    serviceLogs.find((l) =>
      l.service_name?.toLowerCase().includes('oil')
    )?.mileage_at_service ?? 0;
  const lastTire =
    serviceLogs.find((l) =>
      l.service_name?.toLowerCase().includes('tire') ||
      l.service_name?.toLowerCase().includes('tyre')
    )?.mileage_at_service ?? 0;
  const lastBrake =
    serviceLogs.find((l) =>
      l.service_name?.toLowerCase().includes('brake')
    )?.mileage_at_service ?? 0;

  const kmSinceOil = vehicle.mileage - lastOil;
  const kmSinceTire = vehicle.mileage - lastTire;
  const kmSinceBrake = vehicle.mileage - lastBrake;

  if (kmSinceOil >= 8000)
    mileageAlerts.push({
      icon: 'warning',
      text: 'Oil change overdue',
      color: '#FF4444',
    });
  else if (kmSinceOil >= 6000)
    mileageAlerts.push({
      icon: 'alert-circle',
      text: 'Oil change due soon',
      color: '#0567A6',
    });

  if (kmSinceTire >= 12000)
    mileageAlerts.push({
      icon: 'warning',
      text: 'Tire rotation overdue',
      color: '#FF4444',
    });
  else if (kmSinceTire >= 10000)
    mileageAlerts.push({
      icon: 'alert-circle',
      text: 'Tire rotation due soon',
      color: '#0567A6',
    });

  if (kmSinceBrake >= 50000)
    mileageAlerts.push({
      icon: 'warning',
      text: 'Brake inspection overdue',
      color: '#FF4444',
    });

  const vehicleName = [vehicle.year, vehicle.make?.trim(), vehicle.model?.trim()]
    .filter(Boolean)
    .join(' ');

  const distanceUnit = unitSystem === 'imperial' ? 'mi' : 'km';
  const displayMileage = (
    unitSystem === 'imperial'
      ? Math.round(vehicle.mileage * 0.621371)
      : vehicle.mileage
  ).toLocaleString();

  const specs = [
    { label: 'Mileage', value: `${displayMileage} ${distanceUnit}`, icon: 'speedometer-outline' },
    { label: 'Engine', value: vehicle.engine || 'Not set', icon: 'settings-outline' },
    { label: 'Transmission', value: (vehicle as any).transmission || 'Not set', icon: 'git-branch-outline' },
    { label: 'VIN', value: (vehicle as any).vin || 'Not set', icon: 'barcode-outline' },
    { label: 'Nickname', value: vehicle.nickname || 'None', icon: 'bookmark-outline' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: background }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Ionicons name="chevron-back" size={28} color={textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textPrimary }]}>{vehicleName}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero Photo */}
        {vehicle.photo_url ? (
          <Image
            source={{ uri: vehicle.photo_url }}
            style={{ width: '100%', height: 220 }}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.photoPlaceholder, { backgroundColor: surface }]}>
            <Ionicons name="car-outline" size={64} color="#333333" />
          </View>
        )}

        {/* Health Score Banner */}
        <View style={[styles.healthCard, { backgroundColor: surface, borderColor: border }]}>
          <View>
            <Text style={[styles.healthLabel, { color: textSecondary }]}>VEHICLE HEALTH</Text>
            <Text style={[styles.healthScore, { color: healthResult.color }]}>
              {healthResult.score}
              <Text style={styles.healthPercent}>%</Text>
            </Text>
            <Text style={[styles.healthStatus, { color: healthResult.color }]}>
              {healthResult.label}
            </Text>
          </View>
          <View
            style={[
              styles.healthIconWrap,
              { backgroundColor: healthResult.color + '20' },
            ]}
          >
            <Ionicons
              name={
                healthResult.status === 'great'
                  ? 'checkmark-circle'
                  : healthResult.status === 'attention'
                  ? 'alert-circle'
                  : 'warning'
              }
              size={36}
              color={healthResult.color}
            />
          </View>
        </View>

        {/* Specs */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: textSecondary }]}>SPECS</Text>
          <View style={[styles.sectionCard, { backgroundColor: surface, borderColor: border }]}>
            {specs.map((spec, index, arr) => (
              <View
                key={spec.label}
                style={[
                  styles.specRow,
                  index < arr.length - 1 && [styles.specRowBorder, { borderBottomColor: border }],
                ]}
              >
                <View style={styles.specIconWrap}>
                  <Ionicons name={spec.icon as any} size={16} color="#0567A6" />
                </View>
                <Text style={[styles.specLabel, { color: textSecondary }]}>{spec.label}</Text>
                <Text style={[styles.specValue, { color: textPrimary }]}>{spec.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Wrenchy Alerts */}
        {mileageAlerts.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: textSecondary }]}>WRENCHY ALERTS</Text>
            <View style={[styles.sectionCard, { backgroundColor: surface, borderColor: border }]}>
              {mileageAlerts.map((alert, i) => (
                <View
                  key={i}
                  style={[
                    styles.alertRow,
                    i < mileageAlerts.length - 1 && styles.specRowBorder,
                  ]}
                >
                  <Ionicons
                    name={alert.icon as any}
                    size={20}
                    color={alert.color}
                  />
                  <Text style={[styles.alertText, { color: alert.color }]}>
                    {alert.text}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Upcoming Reminders */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: textSecondary }]}>UPCOMING REMINDERS</Text>
          {reminders.length === 0 ? (
            <View style={[styles.noRemindersCard, { backgroundColor: surface, borderColor: border }]}>
              <Ionicons
                name="checkmark-circle-outline"
                size={28}
                color="#2ECC71"
              />
              <Text style={[styles.noRemindersText, { color: textSecondary }]}>No upcoming reminders</Text>
            </View>
          ) : (
            <View style={[styles.sectionCard, { backgroundColor: surface, borderColor: border }]}>
              {reminders.map((reminder, i) => {
                const due = reminder.due_date ? new Date(reminder.due_date) : null;
                const isOverdue = due && due < new Date();
                return (
                  <View
                    key={reminder.id}
                    style={[
                      styles.reminderRow,
                      i < reminders.length - 1 && styles.specRowBorder,
                    ]}
                  >
                    <View
                      style={[
                        styles.reminderDot,
                        {
                          backgroundColor: isOverdue ? '#FF4444' : '#0567A6',
                        },
                      ]}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.reminderTitle, { color: textPrimary }]}>
                        {reminder.service_name || reminder.title}
                      </Text>
                      {due && (
                        <Text
                          style={[
                            styles.reminderSub,
                            { color: isOverdue ? '#FF4444' : textSecondary },
                          ]}
                        >
                          {isOverdue ? 'Overdue · ' : 'Due · '}
                          {due.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontFamily: 'Outfit_700Bold',
    flex: 1,
  },
  photoPlaceholder: {
    width: '100%',
    height: 220,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  healthCard: {
    margin: 20,
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  healthLabel: {
    color: '#888888',
    fontSize: 12,
    marginBottom: 4,
  },
  healthScore: {
    fontSize: 42,
    fontFamily: 'Outfit_700Bold',
    lineHeight: 48,
  },
  healthPercent: {
    fontSize: 20,
  },
  healthStatus: {
    fontSize: 13,
    marginTop: 2,
  },
  healthIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionLabel: {
    color: '#888888',
    fontSize: 11,
    fontFamily: 'Outfit_600SemiBold',
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  sectionCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    overflow: 'hidden',
  },
  specRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  specRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  specIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#0567A615',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  specLabel: {
    color: '#888888',
    fontSize: 14,
    flex: 1,
  },
  specValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
    maxWidth: 180,
    textAlign: 'right',
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  alertText: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
  },
  noRemindersCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 20,
    alignItems: 'center',
  },
  noRemindersText: {
    color: '#888888',
    fontSize: 14,
    marginTop: 8,
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  reminderDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  reminderTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
  },
  reminderSub: {
    fontSize: 12,
    marginTop: 2,
  },
});

