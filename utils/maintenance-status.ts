import { Vehicle, ServiceRecord } from '@/types/vehicle';

export interface ServiceStatus {
  service: ServiceRecord;
  milesRemaining: number;
  overdue: boolean;
  dueSoon: boolean;
}

/**
 * Calculate maintenance status for a service
 */
export function calculateServiceStatus(
  service: ServiceRecord,
  currentMileage: number
): ServiceStatus {
  const milesSinceService = currentMileage - service.mileageDone;
  const milesRemaining = service.intervalMiles - milesSinceService;
  const overdue = milesRemaining <= 0;
  const dueSoon = milesRemaining > 0 && milesRemaining <= 500;

  return {
    service,
    milesRemaining,
    overdue,
    dueSoon,
  };
}

/**
 * Get all service statuses for a vehicle
 */
export function getVehicleServiceStatuses(vehicle: Vehicle | null): ServiceStatus[] {
  if (!vehicle || !vehicle.services) {
    return [];
  }

  return vehicle.services.map((service) =>
    calculateServiceStatus(service, vehicle.mileage)
  );
}

/**
 * Check if vehicle has any overdue services
 */
export function hasOverdueServices(vehicle: Vehicle | null): boolean {
  const statuses = getVehicleServiceStatuses(vehicle);
  return statuses.some((status) => status.overdue);
}

/**
 * Check if vehicle has any due soon services
 */
export function hasDueSoonServices(vehicle: Vehicle | null): boolean {
  const statuses = getVehicleServiceStatuses(vehicle);
  return statuses.some((status) => status.dueSoon);
}
