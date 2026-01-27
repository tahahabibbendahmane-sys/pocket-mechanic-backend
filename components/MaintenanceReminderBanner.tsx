import { useState, useRef, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useLanguage } from '@/contexts/LanguageContext';
import { Vehicle } from '@/types/vehicle';
import { getVehicleServiceStatuses } from '@/utils/maintenance-status';

interface MaintenanceReminderBannerProps {
  activeCar: Vehicle | null;
}

export function MaintenanceReminderBanner({ activeCar }: MaintenanceReminderBannerProps) {
  const { t } = useLanguage();
  const [isDismissed, setIsDismissed] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    if (activeCar && !isDismissed) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
      ]).start();
    }
  }, [activeCar, isDismissed]);

  if (!activeCar || isDismissed) {
    return null;
  }

  const serviceStatuses = getVehicleServiceStatuses(activeCar);
  const overdueServices = serviceStatuses.filter((status) => status.overdue);
  const dueSoonServices = serviceStatuses.filter((status) => status.dueSoon && !status.overdue);

  // Show overdue first, then due soon
  const hasOverdue = overdueServices.length > 0;
  const hasDueSoon = dueSoonServices.length > 0;

  if (!hasOverdue && !hasDueSoon) {
    return null;
  }

  const servicesToShow = hasOverdue ? overdueServices : dueSoonServices;
  const serviceNames = servicesToShow.map((status) => {
    const serviceType = status.service.type.charAt(0).toUpperCase() + status.service.type.slice(1);
    return serviceType;
  });

  const servicesText = serviceNames.join(', ');
  const carName = `${activeCar.make} ${activeCar.model}`;

  const title = hasOverdue ? t.reminders.overdueTitle : t.reminders.dueSoonTitle;
  const message = hasOverdue
    ? t.reminders.overdueMessage.replace('{car}', carName).replace('{services}', servicesText)
    : t.reminders.dueSoonMessage.replace('{car}', carName).replace('{services}', servicesText);

  const backgroundColor = hasOverdue ? '#ff3b30' : '#ff9500';
  const iconName = hasOverdue ? 'exclamationmark.triangle.fill' : 'clock.fill';

  return (
    <Animated.View
      style={[
        styles.banner,
        { backgroundColor },
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}>
      <ThemedView style={styles.content}>
        <IconSymbol name={iconName} size={16} color="#fff" />
        <ThemedView style={styles.textContainer}>
          <ThemedText style={styles.title}>{title}</ThemedText>
          <ThemedText style={styles.message}>{message}</ThemedText>
        </ThemedView>
      </ThemedView>
      <TouchableOpacity
        style={styles.dismissButton}
        onPress={() => setIsDismissed(true)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <IconSymbol name="xmark" size={16} color="#fff" />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 8,
    opacity: 0.95,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  textContainer: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  message: {
    color: '#fff',
    fontSize: 13,
    opacity: 0.95,
  },
  dismissButton: {
    padding: 4,
    marginLeft: 8,
  },
});
