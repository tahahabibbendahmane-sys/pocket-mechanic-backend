import { Vehicle } from '@/types/vehicle';

export interface ValidationResult {
  isValid: boolean;
  errorMessage?: string;
}

/**
 * Validates car data before allowing chatbot to call backend
 */
export function validateCarData(activeCar: Vehicle | null): ValidationResult {
  // Rule 1: Check if activeCar exists
  if (!activeCar) {
    return {
      isValid: false,
      errorMessage: 'Please select a car in your Garage so I can help.',
    };
  }

  // Rule 2: Check if currentMileage is missing, zero, or invalid
  const mileage = activeCar.mileage;
  if (mileage === undefined || mileage === null || mileage === 0 || typeof mileage !== 'number' || mileage < 0) {
    return {
      isValid: false,
      errorMessage: 'I need your current mileage to give maintenance advice.',
    };
  }

  // Rule 3: Services can be empty - that's okay, we'll note it in the prompt
  // No validation needed for services

  return { isValid: true };
}
