import { useState, useRef, useCallback, useEffect } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, Alert, Text, View, Animated } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useActiveCar } from '@/contexts/ActiveCarContext';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { calculateServiceStatus } from '@/utils/maintenance-status';
import { formatDate, formatMileage, getUnitLabel } from '@/utils/formatting';
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
import { StatusBadge } from '@/components/StatusBadge';
import { ProgressBar } from '@/components/ProgressBar';
import { LinearGradient } from 'expo-linear-gradient';
import { SERVICE_TEMPLATES, getServiceInterval, formatServiceInterval, ServiceTemplate } from '@/utils/service-templates';
import { supabase } from '@/lib/supabase';
import { Vehicle, ServiceRecord } from '@/types/vehicle';

export default function MaintenanceScreen() {
  const { isLoading, addService, deleteService } = useActiveCar();
  const { t } = useLanguage();
  const { unitSystem } = useUnits();
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const colors = ThemeColors[theme];
  const tintColor = useThemeColor({}, 'tint');
  const iconColor = useThemeColor({}, 'icon');
  const textInverse = useThemeColor({}, 'textInverse');
  const errorColor = useThemeColor({}, 'error');
  const warningColor = useThemeColor({}, 'warning');
  const successColor = useThemeColor({}, 'success');

  const isNavigatingRef = useRef(false);
  const [quickAddSuccess, setQuickAddSuccess] = useState<string | null>(null);
  const successAnimation = useRef(new Animated.Value(0)).current;
  const [activeVehicle, setActiveVehicle] = useState<Vehicle | null>(null);
  const [services, setServices] = useState<ServiceRecord[]>([]);

  const displayCar = activeVehicle;

  useFocusEffect(
    useCallback(() => {
      const fetchLatestCar = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setActiveVehicle(null);
          return;
        }

        const { data, error } = await supabase
          .from('vehicles')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('is_active', true)
          .maybeSingle();

        if (error) {
          console.warn('[Maintenance] Error fetching active car:', error.message);
          if (error.message.toLowerCase().includes('is_active')) {
            setActiveVehicle(null);
            return;
          }
          setActiveVehicle(null);
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
      };

      fetchLatestCar();
    }, [])
  );

  const fetchServices = useCallback(async () => {
    if (!activeVehicle?.id) {
      setServices([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('maintenance_services')
        .select('*')
        .eq('vehicle_id', activeVehicle.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[Maintenance] Error fetching services:', error.message);
        return;
      }

      console.log('Fetching services for:', activeVehicle.id, 'Found:', data?.length);

      const mapped = (data || []).map((row: any): ServiceRecord => ({
        id: row.id?.toString(),
        type: row.type || row.service_type || 'custom',
        mileageDone: row.mileage_done ?? row.mileageDone ?? 0,
        date: row.service_date || row.date || row.created_at || new Date().toISOString(),
        intervalMiles: row.interval_miles ?? row.intervalMiles ?? 0,
      }));

      setServices(mapped);
    } catch (err) {
      console.warn('[Maintenance] Unexpected error fetching services:', err);
    }
  }, [activeVehicle?.id]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices, activeVehicle?.id]);
  
  const handleAddService = useCallback(() => {
    if (!displayCar || isLoading || isNavigatingRef.current) return;
    isNavigatingRef.current = true;
    router.push({
      pathname: '/add-service',
      params: {
        vehicleId: displayCar.id,
        make: displayCar.make,
        model: displayCar.model,
        year: displayCar.year?.toString(),
        mileage: displayCar.mileage?.toString(),
      },
    });
    setTimeout(() => {
      isNavigatingRef.current = false;
    }, 1000);
  }, [router, displayCar, isLoading]);

  const handleDeleteService = (serviceId: string, serviceType: string) => {
    if (!displayCar) return;

    Alert.alert(
      t.maintenance.deleteServiceRecord,
      `${t.maintenance.deleteServiceConfirm} ${serviceType} ${t.maintenance.serviceRecord}`,
      [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: t.common.delete,
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteService(displayCar.id, serviceId);
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : t.maintenance.failedToDelete;
              Alert.alert(t.common.error, errorMessage);
              console.error('Error deleting service:', error);
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <LoadingState 
        message={t.maintenance.loading || "Loading maintenance records..."}
        subMessage={t.maintenance.loadingSub || "Checking your service history"}
      />
    );
  }

  // Safety check: ensure mileage is valid
  const currentMileage = (displayCar?.mileage != null && typeof displayCar.mileage === 'number' && displayCar.mileage >= 0)
    ? displayCar.mileage
    : 0;

  const handleQuickAdd = useCallback(async (template: ServiceTemplate) => {
    if (!displayCar || isLoading || isNavigatingRef.current) return;

    // Check for duplicate service of same type
    // For oil/brakes: check by type only (one record per type)
    // For custom: allow multiple but warn if exact duplicate
    const existingServices = services;
    const hasDuplicate = existingServices.some(
      service => {
        if (template.type === 'oil' || template.type === 'brakes') {
          // For oil/brakes, only one record per type
          return service.type === template.type;
        } else {
          // For custom services, check if same type and similar mileage
          return service.type === 'custom' && 
                 Math.abs(service.mileageDone - currentMileage) < 100;
        }
      }
    );

    if (hasDuplicate) {
      Alert.alert(
        t.maintenance.service || 'Service',
        `You already have a ${template.name} service record. Please edit the existing record instead.`,
        [{ text: t.common.ok || 'OK' }]
      );
      return;
    }

    try {
      const intervalMiles = getServiceInterval(template, unitSystem);
      
      await addService(displayCar.id, {
        type: template.type,
        mileageDone: currentMileage,
        date: new Date().toISOString(),
        intervalMiles,
      });
      console.log('Quick Add complete, refreshing list...');
      await fetchServices();
      await fetchServices();

      // Show success feedback
      setQuickAddSuccess(template.name);
      Animated.sequence([
        Animated.timing(successAnimation, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.delay(1500),
        Animated.timing(successAnimation, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setQuickAddSuccess(null);
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add service. Please try again.';
      Alert.alert(t.common.error || 'Error', errorMessage);
      console.error('Error adding quick service:', error);
    }
  }, [displayCar, isLoading, currentMileage, unitSystem, addService, fetchServices, t, successAnimation]);

  if (!displayCar) {
    return (
      <ThemedView style={styles.container}>
        <ThemedView style={styles.header}>
          <AppHeader title={t.maintenance.title} />
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
                name="car.fill" 
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
              {t.maintenance.noActiveCar}
            </Text>
            <Text 
              style={[
                styles.emptySubtext,
                {
                  color: isDark ? '#94A3B8' : '#64748B',
                }
              ]}>
              {t.maintenance.noActiveCarMessage}
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
        <AppHeader title={t.maintenance.title} />
        <ThemedView style={styles.carInfo}>
          <Text 
            style={[
              styles.carTitle,
              {
                color: isDark ? '#FFFFFF' : '#000000',
                fontWeight: '700',
              }
            ]}
            numberOfLines={1}
            ellipsizeMode="tail">
            {displayCar.make} {displayCar.model} • {displayCar.year} • {formatMileage(currentMileage, unitSystem)} {getUnitLabel(unitSystem)}
          </Text>
        </ThemedView>
        <MaintenanceReminderBanner activeCar={displayCar} />
        
        {/* Quick Add Section */}
        <ThemedView style={styles.quickAddSection}>
          <ThemedText style={[styles.quickAddTitle, { color: colors.text, fontWeight: '700' }]}>
            {t.maintenance.quickAdd || 'Quick Add'}
          </ThemedText>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickAddScrollContent}
            style={styles.quickAddScrollView}>
            {SERVICE_TEMPLATES.map((template) => (
              <AnimatedButton
                key={template.name}
                style={[
                  styles.quickAddCard,
                  {
                    opacity: displayCar ? 1 : 0.5,
                  }
                ]}
                onPress={() => handleQuickAdd(template)}
                disabled={!displayCar || isLoading}>
                <ThemedText 
                  style={[styles.quickAddName, { color: colors.text }]}
                  numberOfLines={1}
                  ellipsizeMode="tail">
                  {template.name}
                </ThemedText>
                <ThemedText style={[styles.quickAddInterval, { color: colors.textSecondary }]}>
                  {formatServiceInterval(template, unitSystem)}
                </ThemedText>
              </AnimatedButton>
            ))}
          </ScrollView>
        </ThemedView>

        {/* Success Toast */}
        {quickAddSuccess && (
          <Animated.View
            style={[
              styles.successToast,
              {
                opacity: successAnimation,
                transform: [
                  {
                    translateY: successAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-20, 0],
                    }),
                  },
                ],
              },
            ]}>
            <ThemedView style={[styles.successToastContent, { backgroundColor: colors.primaryDark }]}>
              <IconSymbol name="checkmark.circle.fill" size={20} color="#FFFFFF" />
              <ThemedText style={[styles.successToastText, { color: '#FFFFFF' }]}>
                {t.maintenance.serviceAdded || 'Service added'}: {quickAddSuccess}
              </ThemedText>
            </ThemedView>
          </Animated.View>
        )}

        <AnimatedButton
          style={[styles.addButton, { backgroundColor: colors.primaryDark || '#4F46E5' }, Shadows.md]}
          activeOpacity={1}
          onPress={handleAddService}
          disabled={isLoading || isNavigatingRef.current || !displayCar}>
          <ThemedView style={[styles.addButtonContent, { backgroundColor: colors.primaryDark || '#4F46E5' }]}>
            <IconSymbol name="plus" size={20} color="#FFFFFF" />
            <ThemedText style={[styles.addButtonText, { color: '#FFFFFF', fontWeight: '700' }]}>{t.maintenance.addService}</ThemedText>
          </ThemedView>
        </AnimatedButton>
      </ThemedView>

      {services.length === 0 ? (
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
                name="wrench.and.screwdriver.fill" 
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
              {t.maintenance.noServices}
            </Text>
            <Text 
              style={[
                styles.emptySubtext,
                {
                  color: isDark ? '#94A3B8' : '#64748B',
                }
              ]}>
              {t.maintenance.emptyMessage}
            </Text>
            <AnimatedButton
              style={[
                styles.emptyCTA,
                { backgroundColor: colors.primaryDark || '#4F46E5' },
                Shadows.sm
              ]}
              activeOpacity={1}
              onPress={handleAddService}
              disabled={isLoading || isNavigatingRef.current || !displayCar}>
              <ThemedView style={[
                styles.emptyCTAContent,
                { backgroundColor: colors.primaryDark || '#4F46E5' }
              ]}>
                <IconSymbol name="plus" size={18} color="#FFFFFF" />
                <ThemedText style={[styles.emptyCTAText, { color: '#FFFFFF', fontWeight: '600' }]}>
                  {t.maintenance.addService}
                </ThemedText>
              </ThemedView>
            </AnimatedButton>
          </ThemedView>
        </ThemedView>
      ) : (
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {services.map((service) => {
            const status = calculateServiceStatus(service, currentMileage);
            const { overdue, dueSoon, milesRemaining } = status;
            
            // Determine card background based on status
            let cardBackgroundColor = colors.cardOk;
            
            if (overdue) {
              cardBackgroundColor = colors.cardOverdue;
            } else if (dueSoon) {
              cardBackgroundColor = colors.cardDueSoon;
            }
            
            return (
              <AnimatedCard
                key={service.id}
                style={[styles.serviceCard, Shadows.md]}
                lightColor={cardBackgroundColor}
                darkColor={cardBackgroundColor}>
                {/* Gradient overlay for visual interest */}
                {overdue && (
                  <LinearGradient
                    colors={['rgba(239, 68, 68, 0.1)', 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                    pointerEvents="none"
                  />
                )}
                {dueSoon && !overdue && (
                  <LinearGradient
                    colors={['rgba(245, 158, 11, 0.1)', 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                    pointerEvents="none"
                  />
                )}

                <ThemedView style={styles.serviceHeader}>
                  <ThemedView style={styles.serviceTypeRow}>
                    <ThemedView style={[styles.serviceIconContainer, { backgroundColor: colors.primaryLight }]}>
                      <IconSymbol 
                        name={service.type === 'oil' ? 'drop.fill' : service.type === 'brakes' ? 'circle.grid.hex.fill' : 'wrench.and.screwdriver.fill'} 
                        size={20} 
                        color={tintColor} 
                      />
                    </ThemedView>
                    <ThemedView style={styles.serviceTypeInfo}>
                      <ThemedText type="defaultSemiBold" style={[styles.serviceType, { color: colors.text, fontWeight: '800' }]}>
                        {service.type.charAt(0).toUpperCase() + service.type.slice(1)} {t.maintenance.service}
                      </ThemedText>
                      <ThemedText style={[styles.serviceDate, { color: colors.textTertiary }]}>
                        {formatDate(service.date)}
                      </ThemedText>
                    </ThemedView>
                    <StatusBadge 
                      status={overdue ? 'overdue' : (dueSoon ? 'dueSoon' : 'ok')} 
                      label={overdue ? t.maintenance.overdue : (dueSoon ? t.maintenance.dueSoon : t.maintenance.ok)}
                      pulse={overdue}
                    />
                  </ThemedView>
                </ThemedView>

                {/* Progress Bar */}
                {(() => {
                  const totalInterval = service.intervalMiles;
                  const milesSinceService = currentMileage - service.mileageDone;
                  const progress = overdue 
                    ? 1 
                    : dueSoon 
                      ? 1 - (milesRemaining / 500)
                      : Math.max(0, Math.min(0.5, (totalInterval - milesRemaining) / totalInterval));
                  
                  return (
                    <ThemedView style={styles.progressSection}>
                      <ProgressBar 
                        progress={progress} 
                        height={8}
                        showLabel={true}
                        label={`${formatMileage(Math.abs(milesRemaining), unitSystem)} ${getUnitLabel(unitSystem)} ${overdue ? 'overdue' : 'remaining'}`}
                      />
                    </ThemedView>
                  );
                })()}

                <ThemedView style={styles.serviceDetails}>
                  <ThemedView style={styles.detailRow}>
                    <ThemedText style={[styles.detailLabel, { color: colors.textSecondary }]}>
                      {t.maintenance.mileageDone}
                      <ThemedText>{':'}</ThemedText>
                    </ThemedText>
                    <ThemedText style={[styles.detailValue, { color: colors.text, fontWeight: '700' }]}>
                      {formatMileage(service.mileageDone, unitSystem)} {getUnitLabel(unitSystem)}
                    </ThemedText>
                  </ThemedView>
                  <ThemedView style={styles.detailRow}>
                    <ThemedText style={[styles.detailLabel, { color: colors.textSecondary }]}>
                      {t.maintenance.serviceInterval}
                      <ThemedText>{':'}</ThemedText>
                    </ThemedText>
                    <ThemedText style={[styles.detailValue, { color: colors.text, fontWeight: '700' }]}>
                      {formatMileage(service.intervalMiles, unitSystem)} {getUnitLabel(unitSystem)}
                    </ThemedText>
                  </ThemedView>
                </ThemedView>

                <AnimatedButton
                  style={styles.deleteButton}
                  onPress={() => handleDeleteService(service.id, service.type)}>
                  <ThemedView style={styles.deleteButtonContent}>
                    <IconSymbol name="trash.fill" size={16} color={errorColor} />
                    <ThemedText style={[styles.deleteButtonText, { color: errorColor }]}>{t.common.delete}</ThemedText>
                  </ThemedView>
                </AnimatedButton>
              </AnimatedCard>
            );
          })}
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
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  carInfo: {
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  carTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: '600',
    lineHeight: Typography.fontSize.base * 1.4,
    opacity: 0.8,
  },
  quickAddSection: {
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  quickAddTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
    marginBottom: Spacing.sm,
    opacity: 0.7,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quickAddScrollView: {
    marginHorizontal: -Spacing.lg,
  },
  quickAddScrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingRight: Spacing.lg + Spacing.md,
  },
  quickAddCard: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginRight: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickAddName: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 2,
  },
  quickAddInterval: {
    fontSize: Typography.fontSize.xs,
    textAlign: 'center',
    opacity: 0.6,
  },
  successToast: {
    position: 'absolute',
    top: 100,
    left: Spacing.lg,
    right: Spacing.lg,
    zIndex: 1000,
  },
  successToastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius['2xl'],
    gap: Spacing.sm,
  },
  successToastText: {
    fontSize: Typography.fontSize.base,
    fontWeight: '600',
  },
  addButton: {
    borderRadius: BorderRadius['2xl'],
    overflow: 'hidden',
    marginTop: Spacing.md,
  },
  addButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    minHeight: 44,
  },
  addButtonText: {
    fontSize: DesignSystem.fontSize.body,
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
  list: {
    flex: 1,
  },
  listContent: {
    padding: DesignSystem.spacing.lg,
    gap: DesignSystem.spacing.md,
  },
  serviceCard: {
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  serviceHeader: {
    marginBottom: Spacing.md,
  },
  serviceTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flexWrap: 'wrap',
  },
  serviceIconContainer: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceTypeInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  serviceType: {
    fontSize: Typography.fontSize.lg,
    letterSpacing: -0.3,
  },
  serviceDate: {
    fontSize: Typography.fontSize.sm,
  },
  progressSection: {
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
  serviceDetails: {
    gap: DesignSystem.spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: DesignSystem.fontSize.small,
    opacity: 0.7,
  },
  detailValue: {
    fontSize: DesignSystem.fontSize.small,
    fontWeight: '600',
  },
  deleteButton: {
    marginTop: DesignSystem.spacing.md,
    paddingTop: DesignSystem.spacing.md,
  },
  deleteButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DesignSystem.spacing.xs,
  },
  deleteButtonText: {
    fontSize: DesignSystem.fontSize.small,
  },
});
