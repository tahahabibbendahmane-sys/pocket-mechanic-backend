import { Vehicle, ServiceRecord } from '@/types/vehicle';

export interface ServiceStatus {
  service: ServiceRecord;
  milesRemaining: number;
  overdue: boolean;
  dueSoon: boolean;
}

/** Intervals (km) used when using vehicle_health data */
const OIL_INTERVAL_KM = 8000;
const TIRES_INTERVAL_KM = 10000;
const BRAKES_INTERVAL_KM = 50000;
const COOLANT_INTERVAL_KM = 50000;

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
 * Get all service statuses for a vehicle (from services array)
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
 * Derive overdue/due-soon from vehicle_health (Supabase). Used when vehicle.services is empty.
 */
function getHealthBasedOverdueDueSoon(vehicle: Vehicle | null): { overdue: boolean; dueSoon: boolean } {
  if (!vehicle || !vehicle.health) return { overdue: false, dueSoon: false };
  const km = vehicle.mileage ?? 0;
  let overdue = false;
  let dueSoon = false;
  const check = (lastKm: number | null | undefined, intervalKm: number) => {
    if (lastKm == null) return;
    const diff = km - lastKm;
    const remaining = intervalKm - diff;
    if (remaining <= 0) overdue = true;
    else if (remaining <= 1000) dueSoon = true;
  };
  check(vehicle.health.last_oil_change_km, OIL_INTERVAL_KM);
  check(vehicle.health.last_tire_rotation_km, TIRES_INTERVAL_KM);
  check(vehicle.health.last_brake_service_km, BRAKES_INTERVAL_KM);
  check(vehicle.health.last_coolant_flush_km, COOLANT_INTERVAL_KM);
  return { overdue, dueSoon };
}

/**
 * Check if vehicle has any overdue services (uses services array, or health when present)
 */
export function hasOverdueServices(vehicle: Vehicle | null): boolean {
  const statuses = getVehicleServiceStatuses(vehicle);
  if (statuses.length > 0) return statuses.some((s) => s.overdue);
  return getHealthBasedOverdueDueSoon(vehicle).overdue;
}

/**
 * Check if vehicle has any due soon services (uses services array, or health when present)
 */
export function hasDueSoonServices(vehicle: Vehicle | null): boolean {
  const statuses = getVehicleServiceStatuses(vehicle);
  if (statuses.length > 0) return statuses.some((s) => s.dueSoon);
  return getHealthBasedOverdueDueSoon(vehicle).dueSoon;
}
