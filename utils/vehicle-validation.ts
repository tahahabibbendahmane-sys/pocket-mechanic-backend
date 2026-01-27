import { Vehicle, ServiceRecord } from '@/types/vehicle';
import { formatMileage } from './formatting';

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validates vehicle mileage update
 * Rule: Mileage must be positive and cannot decrease
 */
export function validateMileageUpdate(
  newMileage: number,
  existingVehicle: Vehicle | null
): ValidationError | null {
  // Must be a positive number
  if (isNaN(newMileage) || newMileage <= 0) {
    return {
      field: 'mileage',
      message: 'Mileage must be a positive number.',
    };
  }

  // Cannot decrease mileage
  if (existingVehicle && newMileage < existingVehicle.mileage) {
    return {
      field: 'mileage',
      message: `Mileage cannot decrease. Current mileage is ${formatMileage(existingVehicle.mileage)} miles.`,
    };
  }

  return null;
}

/**
 * Validates service record
 * Rules:
 * - mileageDone must be <= currentMileage
 * - intervalMiles must be positive
 */
export function validateServiceRecord(
  service: Omit<ServiceRecord, 'id' | 'date'>,
  currentMileage: number
): ValidationError | null {
  // intervalMiles must be positive
  if (isNaN(service.intervalMiles) || service.intervalMiles <= 0) {
    return {
      field: 'intervalMiles',
      message: 'Service interval must be a positive number.',
    };
  }

  // mileageDone must be valid number
  if (isNaN(service.mileageDone) || service.mileageDone < 0) {
    return {
      field: 'mileageDone',
      message: 'Mileage done must be a valid number (0 or greater).',
    };
  }

  // mileageDone cannot exceed current mileage
  if (service.mileageDone > currentMileage) {
    return {
      field: 'mileageDone',
      message: `Mileage done (${formatMileage(service.mileageDone)}) cannot exceed current mileage (${formatMileage(currentMileage)}).`,
    };
  }

  return null;
}

/**
 * Validates complete vehicle data
 */
export function validateVehicleData(vehicle: Partial<Vehicle>): ValidationError | null {
  if (vehicle.mileage !== undefined) {
    if (isNaN(vehicle.mileage) || vehicle.mileage <= 0) {
      return {
        field: 'mileage',
        message: 'Mileage must be a positive number.',
      };
    }
  }

  return null;
}
