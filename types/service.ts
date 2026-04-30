/**
 * Service log entry (Supabase service_logs table).
 */

export type ServiceTypeLabel =
  | 'Oil Change'
  | 'Tire Rotation'
  | 'Brake Job'
  | 'Inspection'
  | 'Other';

export interface ServiceLog {
  id: string;
  vehicle_id: string;
  service_type: ServiceTypeLabel;
  date: string; // ISO date (YYYY-MM-DD)
  mileage: number;
  cost?: number;
  notes?: string;
  created_at: string;
}
