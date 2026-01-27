import { Vehicle, ServiceRecord } from '@/types/vehicle';
import { getVehicleServiceStatuses } from './maintenance-status';

export interface NextServiceInfo {
  service: ServiceRecord;
  milesRemaining: number;
  milesUntilDue: number;
  progress: number; // 0-1, where 1 is due
}

/**
 * Get the next service that's due (or closest to being due)
 */
export function getNextService(vehicle: Vehicle | null): NextServiceInfo | null {
  if (!vehicle || !vehicle.services || vehicle.services.length === 0) {
    return null;
  }

  const statuses = getVehicleServiceStatuses(vehicle);
  
  // Find overdue services first
  const overdue = statuses.filter(s => s.overdue);
  if (overdue.length > 0) {
    const nextOverdue = overdue.sort((a, b) => a.milesRemaining - b.milesRemaining)[0];
    return {
      service: nextOverdue.service,
      milesRemaining: nextOverdue.milesRemaining,
      milesUntilDue: Math.abs(nextOverdue.milesRemaining),
      progress: 1, // Overdue = 100%
    };
  }

  // Find due soon services
  const dueSoon = statuses.filter(s => s.dueSoon && !s.overdue);
  if (dueSoon.length > 0) {
    const nextDueSoon = dueSoon.sort((a, b) => a.milesRemaining - b.milesRemaining)[0];
    const progress = 1 - (nextDueSoon.milesRemaining / 500); // Progress toward 500 mile threshold
    return {
      service: nextDueSoon.service,
      milesRemaining: nextDueSoon.milesRemaining,
      milesUntilDue: nextDueSoon.milesRemaining,
      progress: Math.max(0.5, progress), // At least 50% if due soon
    };
  }

  // Find next upcoming service
  const upcoming = statuses.filter(s => !s.overdue && !s.dueSoon);
  if (upcoming.length > 0) {
    const nextUpcoming = upcoming.sort((a, b) => a.milesRemaining - b.milesRemaining)[0];
    const totalInterval = nextUpcoming.service.intervalMiles;
    const progress = (totalInterval - nextUpcoming.milesRemaining) / totalInterval;
    return {
      service: nextUpcoming.service,
      milesRemaining: nextUpcoming.milesRemaining,
      milesUntilDue: nextUpcoming.milesRemaining,
      progress: Math.max(0, Math.min(0.5, progress)), // Max 50% if not due soon
    };
  }

  return null;
}
