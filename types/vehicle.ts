export type ServiceType = 'oil' | 'brakes' | 'custom';

export interface ServiceRecord {
  id: string;
  type: ServiceType;
  mileageDone: number;
  date: string; // ISO string
  intervalMiles: number;
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
  services?: ServiceRecord[];
  insurance?: InsuranceInfo;
  registration?: RegistrationInfo;
}
