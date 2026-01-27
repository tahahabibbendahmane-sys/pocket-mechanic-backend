import { useState, useRef, useCallback } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, Alert, Animated, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

import { ThemedText } from '@/components/themed-text';
import { Text } from 'react-native';
import { ThemedView } from '@/components/themed-view';
import { useActiveCar } from '@/contexts/ActiveCarContext';
import { Vehicle } from '@/types/vehicle';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { hasOverdueServices, hasDueSoonServices } from '@/utils/maintenance-status';
import { formatMileage, getUnitLabel } from '@/utils/formatting';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUnits } from '@/contexts/UnitsContext';
import { MaintenanceReminderBanner } from '@/components/MaintenanceReminderBanner';
import { DesignSystem } from '@/constants/design-system';
import { Shadows, ThemeColors, BorderRadius, Typography, Spacing } from '@/constants/theme-enhanced';
import { useTheme } from '@/contexts/ThemeContext';
import { AnimatedButton } from '@/components/AnimatedButton';
import { AnimatedCard } from '@/components/AnimatedCard';
import { LoadingState } from '@/components/LoadingState';
import { AppHeader } from '@/components/AppHeader';
import { LinearGradient } from 'expo-linear-gradient';
import { getNextService } from '@/utils/vehicle-helpers';
import { ProgressRing } from '@/components/ProgressRing';
import { ProgressBar } from '@/components/ProgressBar';
import { StatusBadge } from '@/components/StatusBadge';
import { supabase } from '@/lib/supabase';

export default function GarageScreen() {
  const { vehicles, activeVehicleId, activeCar, isLoading, deleteVehicle, setActiveVehicle, refreshActiveCar } = useActiveCar();
  const { t } = useLanguage();
  const { unitSystem } = useUnits();
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const colors = ThemeColors[theme];
  const tintColor = useThemeColor({}, 'tint');
  const iconColor = useThemeColor({}, 'icon');
  const textInverse = useThemeColor({}, 'textInverse');
  const errorColor = useThemeColor({}, 'error');

  const isNavigatingRef = useRef(false);
  const [remoteVehicles, setRemoteVehicles] = useState<Vehicle[]>([]);
  const [remoteLoading, setRemoteLoading] = useState(false);

  const displayedVehicles = remoteVehicles.length > 0 ? remoteVehicles : vehicles;
  const displayActiveCar =
    activeCar || displayedVehicles.find((v) => v.id === activeVehicleId) || null;
  const hasOverdue = hasOverdueServices(displayActiveCar);
  const hasDueSoon = hasDueSoonServices(displayActiveCar);

  const fetchVehicles = useCallback(async () => {
    setRemoteLoading(true);
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        console.warn('[Garage] User not logged in, skipping Supabase vehicle fetch');
        setRemoteVehicles([]);
        return;
      }

      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[Garage] Error fetching vehicles from Supabase:', error);
        return;
      }

      if (data) {
        const mapped: Vehicle[] = data.map((row: any) => ({
          id: row.id?.toString(),
          make: row.make,
          model: row.model,
          year: row.year,
          engine: row.engine_code || '',
          mileage: row.current_mileage ?? 0,
          services: [], // Supabase vehicles table currently does not include services
        }));
        setRemoteVehicles(mapped);
      }
    } catch (err) {
      console.error('[Garage] Unexpected error fetching vehicles from Supabase:', err);
    } finally {
      setRemoteLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchVehicles();
    }, [fetchVehicles])
  );
  
  const handleAddVehicle = useCallback(() => {
    if (isNavigatingRef.current || isLoading) return;
    isNavigatingRef.current = true;
    router.push('/vehicle-form');
    setTimeout(() => {
      isNavigatingRef.current = false;
    }, 1000);
  }, [router, isLoading]);

  const handleEditVehicle = useCallback((vehicle: Vehicle) => {
    if (isNavigatingRef.current || isLoading) return;
    isNavigatingRef.current = true;
    router.push({
      pathname: '/vehicle-form',
      params: {
        id: vehicle.id,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year.toString(),
        engine: vehicle.engine || '',
        mileage: vehicle.mileage.toString(),
      },
    });
    setTimeout(() => {
      isNavigatingRef.current = false;
    }, 1000);
  }, [router, isLoading]);

  const handleDeleteVehicle = (vehicle: Vehicle) => {
    Alert.alert(
      t.garage.deleteVehicle,
      `${t.garage.deleteConfirm} ${vehicle.make} ${vehicle.model}?`,
      [
        { text: t.garage.cancel, style: 'cancel' },
        {
          text: t.garage.delete,
          style: 'destructive',
          onPress: async () => {
            try {
              // Try to delete from Supabase if we have a session
              const { data: { session } } = await supabase.auth.getSession();
              if (session) {
                const { error } = await supabase
                  .from('vehicles')
                  .delete()
                  .eq('id', vehicle.id)
                  .eq('user_id', session.user.id);

                if (error) {
                  Alert.alert('Error', error.message);
                  return;
                }
              }

              // Update local state regardless (works for guests too)
              setRemoteVehicles((current) => current.filter((v) => v.id !== vehicle.id));
              await deleteVehicle(vehicle.id);
            } catch (error) {
              const message = error instanceof Error ? error.message : 'Failed to delete vehicle.';
              Alert.alert('Error', message);
            }
          },
        },
      ]
    );
  };

  const handleSetActive = async (vehicleId: string) => {
    setRemoteVehicles((currentVehicles) =>
      currentVehicles.map((v) => ({
        ...v,
        is_active: v.id === vehicleId,
      }))
    );
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        Alert.alert('Error', 'You need to be signed in to set an active vehicle.');
        return;
      }

      // Try to persist active flag in Supabase
      const { error: clearError } = await supabase
        .from('vehicles')
        .update({ is_active: false })
        .eq('user_id', session.user.id);

      if (clearError) {
        const message = clearError.message || '';
        // If column doesn't exist yet, fall back to local state
        if (message.toLowerCase().includes('is_active')) {
          await setActiveVehicle(vehicleId);
          await refreshActiveCar();
          return;
        }
        Alert.alert('Error', clearError.message);
        return;
      }

      const { error: setError } = await supabase
        .from('vehicles')
        .update({ is_active: true })
        .eq('user_id', session.user.id)
        .eq('id', vehicleId);

      if (setError) {
        const message = setError.message || '';
        if (message.toLowerCase().includes('is_active')) {
          await setActiveVehicle(vehicleId);
          await refreshActiveCar();
          return;
        }
        Alert.alert('Error', setError.message);
        return;
      }

      await setActiveVehicle(vehicleId);
      await refreshActiveCar();
      Alert.alert('Success', 'Active car updated');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update active vehicle.';
      Alert.alert('Error', message);
    }
  };

  if (isLoading || remoteLoading) {
    return (
      <LoadingState 
        message={t.garage.loading || "Loading your garage..."}
        subMessage={t.garage.loadingSub || "Getting your vehicles ready"}
      />
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <AppHeader title={t.garage.title} />
        <MaintenanceReminderBanner activeCar={displayActiveCar} />
        <AnimatedButton
          style={[
            styles.addButton, 
            { 
              backgroundColor: colors.primaryDark || '#4F46E5',
            }, 
            Shadows.md
          ]}
          activeOpacity={1}
          onPress={handleAddVehicle}
          disabled={isLoading || isNavigatingRef.current}>
          <ThemedView style={[styles.addButtonContent, { backgroundColor: colors.primaryDark || '#4F46E5' }]}>
            <IconSymbol name="plus" size={22} color="#FFFFFF" />
            <ThemedText style={[styles.addButtonText, { color: '#FFFFFF', fontWeight: '700' }]}>
              {t.garage.addVehicle}
            </ThemedText>
          </ThemedView>
        </AnimatedButton>
      </ThemedView>

      {displayedVehicles.length === 0 ? (
        <ThemedView style={styles.emptyContainer}>
          <ThemedText style={styles.emptyEmoji}>🚗</ThemedText>
          <ThemedText 
            type="subtitle" 
            style={[
              styles.emptyText,
              { color: colors.text, fontWeight: '800' }
            ]}>
            {t.garage.noVehicles}
          </ThemedText>
          <ThemedText 
            style={[
              styles.emptySubtext,
              { color: colors.textSecondary }
            ]}>
            {t.garage.emptyMessage}
          </ThemedText>
          <AnimatedButton
            style={[
              styles.emptyCTA,
              { backgroundColor: colors.primaryDark || '#4F46E5' },
              Shadows.md
            ]}
            activeOpacity={1}
            onPress={handleAddVehicle}>
            <ThemedView style={{ backgroundColor: colors.primaryDark || '#4F46E5' }}>
              <ThemedText style={[styles.emptyCTAText, { color: '#FFFFFF', fontWeight: '700' }]}>
                {t.garage.addVehicle}
              </ThemedText>
            </ThemedView>
          </AnimatedButton>
        </ThemedView>
      ) : (
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {/* Bento Grid Layout */}
          {displayActiveCar && (
            <>
              {/* Hero Card - Active Vehicle - Single Layer Structure */}
              <TouchableOpacity
                onPress={() => router.push('/maintenance')}
                activeOpacity={1}
                  style={[
                  styles.heroCardFlat,
                  {
                    backgroundColor: isDark ? '#0F172A' : colors.backgroundSecondary, // slate-900 in dark mode, white in light mode
                    borderWidth: 2,
                    borderColor: colors.primary, // Indigo border for active
                    shadowColor: colors.primary,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 12,
                    elevation: 8,
                    padding: Spacing.xl, // p-6 equivalent (32px)
                    paddingTop: Spacing.xl + Spacing.sm, // Add headroom (pt-4 equivalent)
                  },
                ]}>
                <View style={styles.heroContent}>
                  <View style={styles.heroHeader}>
                    <Text 
                      style={[
                        styles.heroModel,
                        {
                          // Explicit colors for maximum visibility - using Text component directly to avoid ThemedText color override
                          color: isDark ? '#FFFFFF' : '#000000', // Pure white in dark mode, pure black in light mode
                          fontWeight: '800', // Extra bold (extrabold)
                          lineHeight: Typography.fontSize['4xl'] * Typography.lineHeight.normal, // Explicit line height calculation
                        }
                      ]}
                      numberOfLines={2}
                      ellipsizeMode="tail">
                      {displayActiveCar.model || 'Unknown'}
                    </Text>
                    <View style={{ marginLeft: Spacing.sm, flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
                      <View style={{
                        backgroundColor: '#10B981',
                        borderRadius: BorderRadius.full,
                        paddingHorizontal: Spacing.md,
                        paddingVertical: Spacing.xs,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: Spacing.xs,
                      }}>
                        <IconSymbol name="star.fill" size={14} color="#FFFFFF" />
                        <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>
                          {t.garage.active}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <ThemedText style={[
                    styles.heroMake,
                    {
                      color: isDark ? '#94A3B8' : '#64748B', // slate-400 in dark mode, slate-500 in light mode
                    }
                  ]}>
                    {displayActiveCar.make} <ThemedText style={{ opacity: 0.9 }}>{'\u2022'}</ThemedText> {displayActiveCar.year}
                  </ThemedText>
                  <View style={styles.heroStats}>
                    <View style={styles.heroStat}>
                      <IconSymbol name="speedometer" size={20} color={isDark ? '#94A3B8' : '#64748B'} />
                      <ThemedText style={[styles.heroStatText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                        {displayActiveCar.mileage != null && typeof displayActiveCar.mileage === 'number' && displayActiveCar.mileage >= 0
                          ? `${formatMileage(displayActiveCar.mileage, unitSystem)} ${getUnitLabel(unitSystem)}`
                          : 'Mileage not set'}
                      </ThemedText>
                    </View>
                    {(() => {
                      const nextService = getNextService(displayActiveCar);
                      if (nextService) {
                        return (
                          <View style={styles.heroStat}>
                            <IconSymbol name="wrench.and.screwdriver.fill" size={20} color={isDark ? '#94A3B8' : '#64748B'} />
                            <ThemedText style={[styles.heroStatText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                              {nextService.service.type.charAt(0).toUpperCase() + nextService.service.type.slice(1)} <ThemedText style={{ opacity: 0.9 }}>{t.garage.in}</ThemedText> {formatMileage(Math.abs(nextService.milesRemaining), unitSystem)} {getUnitLabel(unitSystem)}
                            </ThemedText>
                          </View>
                        );
                      }
                      return null;
                    })()}
                  </View>
                </View>
              </TouchableOpacity>

              {/* Quick Stats Cards */}
              <ThemedView style={styles.statsRow}>
                {(() => {
                  const nextService = getNextService(displayActiveCar);
                  if (nextService) {
                    const progress = Math.max(0, Math.min(1, nextService.progress));
                    return (
                      <AnimatedCard
                        style={[styles.statCard, Shadows.md]}
                        onPress={() => router.push('/maintenance')}>
                        <ThemedView style={[styles.statIconContainer, { backgroundColor: colors.primaryLight }]}>
                          <IconSymbol name="calendar" size={24} color={tintColor} />
                        </ThemedView>
                        <ThemedText style={[styles.statLabel, { color: colors.textSecondary }]}>
                          {t.garage.nextService}
                        </ThemedText>
                        <ThemedText style={[styles.statValue, { color: colors.text }]}>
                          {nextService.service.type.charAt(0).toUpperCase() + nextService.service.type.slice(1)}
                        </ThemedText>
                        <ProgressBar progress={progress} height={6} showLabel={false} />
                      </AnimatedCard>
                    );
                  }
                  return null;
                })()}
                
                <AnimatedCard
                  style={[styles.statCard, Shadows.md]}
                  onPress={() => router.push('/maintenance')}>
                  <ThemedView style={[styles.statIconContainer, { backgroundColor: colors.primaryLight }]}>
                    <IconSymbol name="exclamationmark.triangle.fill" size={24} color={hasOverdue ? errorColor : (hasDueSoon ? '#F59E0B' : tintColor)} />
                  </ThemedView>
                  <ThemedText style={[styles.statLabel, { color: colors.textSecondary }]}>
                    {t.garage.status}
                  </ThemedText>
                  <ThemedText style={[styles.statValue, { color: colors.text }]}>
                    {hasOverdue ? t.maintenance.overdue : (hasDueSoon ? t.maintenance.dueSoon : t.garage.allGood)}
                  </ThemedText>
                </AnimatedCard>
              </ThemedView>
            </>
          )}

          {/* Other Vehicles */}
          {displayedVehicles.filter(v => v.id !== activeVehicleId).length > 0 && (
            <ThemedView style={styles.otherVehiclesSection}>
              <ThemedText style={[styles.sectionTitle, { color: colors.text, fontWeight: '800' }]}>
                {t.garage.otherVehicles}
              </ThemedText>
              <ThemedView style={styles.otherVehiclesGrid}>
                {displayedVehicles.filter(v => v.id !== activeVehicleId).map((vehicle) => (
                  <AnimatedCard
                    key={vehicle.id}
                    style={[
                      styles.otherVehicleCard,
                      {
                        backgroundColor: isDark ? '#1E293B' : '#FFFFFF', // slate-800 in dark, white in light
                        borderWidth: 1,
                        borderColor: isDark ? '#334155' : '#E2E8F0', // subtle border
                      },
                      Shadows.sm
                    ]}>
                    <ThemedView style={styles.otherVehicleContent}>
                      <ThemedView style={[
                        styles.otherVehicleIcon,
                        {
                          backgroundColor: isDark ? colors.primary + '20' : colors.primaryLight, // More subtle in dark mode
                        }
                      ]}>
                        <IconSymbol name="car.fill" size={24} color={tintColor} />
                      </ThemedView>
                      <ThemedView style={styles.otherVehicleTextContainer}>
                        <Text 
                          style={[
                            styles.otherVehicleName,
                            {
                              // Explicit high-contrast colors for maximum visibility
                              color: isDark ? '#FFFFFF' : '#0F172A', // Pure white in dark mode, slate-900 in light mode
                              fontWeight: '800', // Extra bold
                            }
                          ]}
                          numberOfLines={1}
                          ellipsizeMode="tail">
                          {vehicle.model}
                        </Text>
                        <Text 
                          style={[
                            styles.otherVehicleMake,
                            {
                              // Explicit colors for secondary text
                              color: isDark ? '#94A3B8' : '#64748B', // slate-400 in dark mode, slate-500 in light mode
                            }
                          ]}
                          numberOfLines={1}
                          ellipsizeMode="tail">
                          {vehicle.make}
                        </Text>
                      </ThemedView>
                      <ThemedView style={styles.otherVehicleActions}>
                        <AnimatedButton
                          style={[
                            styles.otherVehicleActionBtn,
                            {
                              backgroundColor: isDark ? '#334155' : '#F1F5F9', // slate-700 in dark, slate-100 in light
                            }
                          ]}
                          onPress={() => handleSetActive(vehicle.id)}>
                          <IconSymbol 
                            name="star" 
                            size={18} 
                            color={isDark ? '#818CF8' : colors.primary} 
                          />
                        </AnimatedButton>
                        <AnimatedButton
                          style={[
                            styles.otherVehicleActionBtn,
                            {
                              backgroundColor: isDark ? '#334155' : '#F1F5F9', // slate-700 in dark, slate-100 in light
                            }
                          ]}
                          onPress={() => handleEditVehicle(vehicle)}>
                          <IconSymbol name="pencil" size={18} color={isDark ? '#60A5FA' : colors.primary} />
                        </AnimatedButton>
                        <AnimatedButton
                          style={[
                            styles.otherVehicleActionBtn,
                            {
                              backgroundColor: isDark ? '#334155' : '#F1F5F9', // slate-700 in dark, slate-100 in light
                            }
                          ]}
                          onPress={() => handleDeleteVehicle(vehicle)}>
                          <IconSymbol name="trash.fill" size={18} color={errorColor} />
                        </AnimatedButton>
                      </ThemedView>
                    </ThemedView>
                  </AnimatedCard>
                ))}
              </ThemedView>
            </ThemedView>
          )}
        </ScrollView>
      )}
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
    padding: DesignSystem.spacing.lg,
    paddingBottom: DesignSystem.spacing.md,
  },
  addButton: {
    marginTop: DesignSystem.spacing.md,
    borderRadius: BorderRadius['2xl'], // Bubble feel
  },
  addButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: DesignSystem.spacing.md,
    paddingHorizontal: DesignSystem.spacing.lg,
    gap: DesignSystem.spacing.sm,
  },
  addButtonText: {
    fontSize: DesignSystem.fontSize.body,
    fontWeight: '700', // Bold
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xxl,
  },
  emptyEmoji: {
    fontSize: 60, // Reduced from 80
    marginBottom: Spacing.md,
  },
  emptyText: {
    marginTop: Spacing.md,
    textAlign: 'center',
    fontSize: Typography.fontSize.xl, // Reduced from 2xl
  },
  emptySubtext: {
    marginTop: Spacing.md,
    textAlign: 'center',
    fontSize: Typography.fontSize.base,
    maxWidth: 300,
    lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.base,
  },
  emptyCTA: {
    marginTop: Spacing.xl,
    borderRadius: BorderRadius['2xl'],
    minWidth: 200,
  },
  emptyCTAText: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  // Bento Grid Styles
  heroCard: {
    borderRadius: BorderRadius['3xl'],
    marginBottom: Spacing.md,
    minHeight: 180,
  },
  heroCardFlat: {
    borderRadius: BorderRadius['3xl'],
    marginBottom: Spacing.md,
    minHeight: 180,
  },
  heroContent: {
    gap: Spacing.md,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs, // Add spacing below header
    width: '100%', // Ensure full width
  },
  heroModel: {
    fontSize: Typography.fontSize['4xl'], // text-4xl (36px)
    fontWeight: '800', // Extra bold (extrabold)
    letterSpacing: -0.5,
    flex: 1,
    flexShrink: 1, // Allow text to shrink if needed
    lineHeight: Typography.lineHeight.normal, // Normal line-height to prevent clipping ascenders
    marginRight: Spacing.sm, // Add margin to prevent overlap with badge
    minWidth: 0, // Allow flex item to shrink below content size
  },
  heroMake: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '600',
    marginTop: Spacing.xs,
  },
  heroStats: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginTop: Spacing.md,
  },
  heroStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  heroStatText: {
    fontSize: Typography.fontSize.base,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  statLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
  },
  statValue: {
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  otherVehiclesSection: {
    marginTop: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.xl,
    marginBottom: Spacing.md,
  },
  otherVehiclesGrid: {
    gap: Spacing.md,
  },
  otherVehicleCard: {
    width: '100%', // Full width for horizontal layout
    borderRadius: BorderRadius['3xl'], // More rounded for modern look
    padding: Spacing.lg, // Increased padding
    minHeight: 100, // Reduced height for horizontal layout
  },
  otherVehicleContent: {
    flexDirection: 'row', // Horizontal layout
    alignItems: 'center',
    gap: Spacing.md,
  },
  otherVehicleIcon: {
    width: 56, // Icon container
    height: 56,
    borderRadius: BorderRadius.xl, // More rounded
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0, // Prevent icon from shrinking
  },
  otherVehicleTextContainer: {
    flex: 1, // Take up remaining space
    gap: Spacing.xs,
  },
  otherVehicleName: {
    fontSize: Typography.fontSize.xl, // Larger for better visibility
    fontWeight: '800', // Extra bold
    lineHeight: Typography.fontSize.xl * Typography.lineHeight.tight,
  },
  otherVehicleMake: {
    fontSize: Typography.fontSize.base, // Increased from sm
    lineHeight: Typography.fontSize.base * Typography.lineHeight.normal,
  },
  otherVehicleActions: {
    flexDirection: 'row',
    gap: Spacing.sm, // Gap between buttons
    flexShrink: 0, // Prevent buttons from shrinking
  },
  otherVehicleActionBtn: {
    width: 40, // Larger tap target (44px minimum)
    height: 40,
    borderRadius: BorderRadius.xl, // More rounded
    justifyContent: 'center',
    alignItems: 'center',
  },
});
