import { UnitSystem } from '@/contexts/UnitsContext';
import { ServiceType } from '@/types/vehicle';

export interface ServiceTemplate {
  name: string;
  type: ServiceType;
  intervalKm: number; // Always store in metric internally
  icon: string;
}

export const SERVICE_TEMPLATES: ServiceTemplate[] = [
  {
    name: 'Oil Change',
    type: 'oil',
    intervalKm: 8000, // 5,000 miles
    icon: 'drop.fill',
  },
  {
    name: 'Tire Rotation',
    type: 'custom',
    intervalKm: 12000, // 7,500 miles
    icon: 'arrow.triangle.2.circlepath.circle',
  },
  {
    name: 'Brake Inspection',
    type: 'brakes',
    intervalKm: 24000, // 15,000 miles
    icon: 'exclamationmark.triangle.fill',
  },
  {
    name: 'Air Filter',
    type: 'custom',
    intervalKm: 24000, // 15,000 miles
    icon: 'wind.circle',
  },
  {
    name: 'Coolant',
    type: 'custom',
    intervalKm: 80000, // 50,000 miles
    icon: 'thermometer.medium',
  },
  {
    name: 'Transmission Service',
    type: 'custom',
    intervalKm: 96000, // 60,000 miles
    icon: 'gearshift.fill',
  },
];

/**
 * Converts service interval from km to miles if needed
 */
export function getServiceInterval(template: ServiceTemplate, unitSystem: UnitSystem): number {
  if (unitSystem === 'imperial') {
    // Convert km to miles (1 km = 0.621371 miles)
    return Math.round(template.intervalKm * 0.621371);
  }
  return template.intervalKm;
}

/**
 * Formats service interval for display
 */
export function formatServiceInterval(template: ServiceTemplate, unitSystem: UnitSystem): string {
  const interval = getServiceInterval(template, unitSystem);
  const unit = unitSystem === 'imperial' ? 'miles' : 'km';
  return `${interval.toLocaleString()} ${unit}`;
}
