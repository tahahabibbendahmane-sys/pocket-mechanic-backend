/**
 * Formatting utilities for consistent display
 */

// Conversion constants (km to miles)
const KM_TO_MILES = 0.621371;

/**
 * Convert kilometers to miles
 */
export function kmToMiles(km: number): number {
  return km * KM_TO_MILES;
}

/**
 * Convert miles to kilometers
 */
export function milesToKm(miles: number): number {
  return miles / KM_TO_MILES;
}

/**
 * Format a number as mileage with thousand separators
 * Assumes input is in kilometers (metric), converts to miles if imperial
 */
export function formatMileage(mileageKm: number, unitSystem: 'metric' | 'imperial' = 'metric'): string {
  const value = unitSystem === 'imperial' ? kmToMiles(mileageKm) : mileageKm;
  return Math.round(value).toLocaleString();
}

/**
 * Get the unit label (km or miles) based on unit system
 */
export function getUnitLabel(unitSystem: 'metric' | 'imperial' = 'metric'): string {
  return unitSystem === 'imperial' ? 'miles' : 'km';
}

/**
 * Format an ISO date string to a readable format (e.g., "Jan 18, 2026")
 */
export function formatDate(isoString: string): string {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return isoString;
  }
}

/**
 * Format a date for input fields (YYYY-MM-DD)
 */
export function formatDateForInput(isoString: string): string {
  if (!isoString) return '';
  try {
    return new Date(isoString).toISOString().split('T')[0];
  } catch {
    return isoString;
  }
}
