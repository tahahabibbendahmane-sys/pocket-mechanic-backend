import { supabase } from './supabase';

export type ServiceType = {
  id: string;
  name: string;
  icon: string;
  category: string;
  default_interval_miles: number | null;
  default_interval_days: number | null;
  is_custom: boolean;
  user_id: string | null;
};

export type MaintenanceLog = {
  id: string;
  user_id: string;
  vehicle_id: string;
  service_type_id: string | null;
  service_name: string;
  date: string;
  mileage_at_service: number;
  cost: number | null;
  notes: string | null;
  shop_name: string | null;
  next_service_miles: number | null;
  next_service_date: string | null;
  reminder_enabled: boolean;
  created_at: string;
};

export type MaintenanceReminder = {
  id: string;
  user_id: string;
  vehicle_id: string;
  maintenance_log_id: string | null;
  service_name: string;
  due_miles: number | null;
  due_date: string | null;
  is_dismissed: boolean;
  is_completed: boolean;
};

// Fetch all service types (global + user's custom)
export const getServiceTypes = async (): Promise<ServiceType[]> => {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }

  const userId = session?.user?.id ?? null;

  let query = supabase.from('service_types').select('*');

  if (userId) {
    // User logged in: fetch global (user_id null) + user-specific
    query = query.or(`user_id.is.null,user_id.eq.${userId}`);
  } else {
    // Guest: only global types
    query = query.is('user_id', null);
  }

  const { data, error } = await query.order('name', { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as ServiceType[];
};

// Fetch all maintenance logs for a vehicle, ordered by date desc
export const getMaintenanceLogs = async (vehicleId: string): Promise<MaintenanceLog[]> => {
  const { data, error } = await supabase
    .from('maintenance_logs')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('date', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as MaintenanceLog[];
};

// Fetch upcoming reminders for a vehicle (not dismissed, not completed)
export const getReminders = async (vehicleId: string): Promise<MaintenanceReminder[]> => {
  const { data, error } = await supabase
    .from('maintenance_reminders')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .eq('is_dismissed', false)
    .eq('is_completed', false)
    .order('due_date', { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as MaintenanceReminder[];
};

// Add a new maintenance log + auto-create a reminder if reminder_enabled
export const addMaintenanceLog = async (
  log: Omit<MaintenanceLog, 'id' | 'user_id' | 'created_at'>
): Promise<MaintenanceLog> => {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }

  if (!session?.user?.id) {
    throw new Error('Not authenticated');
  }

  const payload = {
    ...log,
    user_id: session.user.id,
  };

  const { data, error } = await supabase
    .from('maintenance_logs')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  const createdLog = data as MaintenanceLog;

  if (log.reminder_enabled && (log.next_service_miles != null || log.next_service_date != null)) {
    const reminderPayload = {
      user_id: session.user.id,
      vehicle_id: log.vehicle_id,
      maintenance_log_id: createdLog.id,
      service_name: log.service_name,
      due_miles: log.next_service_miles,
      due_date: log.next_service_date,
      is_dismissed: false,
      is_completed: false,
    };

    const { error: reminderError } = await supabase.from('maintenance_reminders').insert(reminderPayload);
    if (reminderError) {
      throw reminderError;
    }
  }

  return createdLog;
};

// Update an existing log
export const updateMaintenanceLog = async (
  id: string,
  updates: Partial<MaintenanceLog>
): Promise<void> => {
  const { error } = await supabase
    .from('maintenance_logs')
    .update(updates)
    .eq('id', id);

  if (error) {
    throw error;
  }
};

// Delete a log (also deletes associated reminder via CASCADE)
export const deleteMaintenanceLog = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('maintenance_logs')
    .delete()
    .eq('id', id);

  if (error) {
    throw error;
  }
};

// Dismiss a reminder
export const dismissReminder = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('maintenance_reminders')
    .update({ is_dismissed: true })
    .eq('id', id);

  if (error) {
    throw error;
  }
};

// Mark reminder as completed
export const completeReminder = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('maintenance_reminders')
    .update({ is_completed: true })
    .eq('id', id);

  if (error) {
    throw error;
  }
};

