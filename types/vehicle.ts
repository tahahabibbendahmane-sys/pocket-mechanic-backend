export type ServiceType = 'oil' | 'brakes' | 'custom';

/** Re-export for service history log labels (e.g. "Oil Change", "Tire Rotation") */
export type { ServiceTypeLabel } from './service';

export interface ServiceRecord {
  id: string;
  type: ServiceType;
  mileageDone: number;
  date: string; // ISO string
  intervalMiles: number;
}

/** Matches Supabase vehicle_health table – mileage at last service per category (all in km) */
export interface VehicleHealth {
  id?: string;
  vehicle_id?: string;
  user_id?: string;
  last_oil_change_km?: number;
  last_tire_rotation_km?: number;
  last_brake_service_km?: number;
  last_coolant_flush_km?: number;
  /** Tire pressure monitor – actual PSI per corner */
  tire_psi_fl?: number;
  tire_psi_fr?: number;
  tire_psi_rl?: number;
  tire_psi_rr?: number;
  /** Tire pressure targets (PSI) */
  recommended_psi_front?: number;
  recommended_psi_rear?: number;
  /** Oil specifications (e.g. for parts store reference) */
  oil_type?: string;
  oil_capacity?: string;
  oil_filter_part_number?: string;
}

export interface MaintenanceLog {
  id: string;
  user_id: string;
  vehicle_id: string;
  service_type: string;        // The title, e.g., "Oil Change"
  description?: string;        // Details, parts used
  mileage_at_service: number;
  cost?: number;
  service_date: string;
  created_at: string;
}

export interface InsuranceInfo {
  provider: string;
  policyNumber: string;
  expiryDate: string; // ISO string
}

export interface RegistrationInfo {
  expiryDate: string; // ISO string
}

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  engine?: string;
  mileage: number;
  /** Display name from Supabase (nickname column) */
  nickname?: string | null;
  /** Whether this vehicle is the user's active one (Supabase is_active) */
  is_active?: boolean;
  /** Supabase storage URL for vehicle photo */
  photo_url?: string | null;
  services?: ServiceRecord[];
  /** From Supabase vehicle_health – single source for maintenance status */
  health?: VehicleHealth | null;
  insurance?: InsuranceInfo;
  registration?: RegistrationInfo;
}
