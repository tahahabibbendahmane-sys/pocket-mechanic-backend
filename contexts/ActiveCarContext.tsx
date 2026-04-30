import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Vehicle, ServiceRecord, VehicleHealth } from '@/types/vehicle';
import { ServiceLog } from '@/types/service';
import { validateMileageUpdate } from '@/utils/vehicle-validation';
import { supabase } from '@/lib/supabase';
import { scheduleWrenchyMileageAlerts } from '@/lib/notifications';

const VEHICLES_STORAGE_KEY = '@pocket_mechanic:vehicles';
const ACTIVE_VEHICLE_STORAGE_KEY = '@pocket_mechanic:active_vehicle_id';

interface ActiveCarContextType {
  vehicles: Vehicle[];
  activeCar: Vehicle | null;
  activeVehicleId: string | null;
  isLoading: boolean;
  serviceLogs: ServiceLog[];
  refreshActiveCar: () => Promise<void>;
  fetchVehicles: () => Promise<void>;
  fetchServiceLogs: (vehicleId: string) => Promise<void>;
  addServiceLog: (
    log: Omit<ServiceLog, 'id' | 'created_at'>,
    updateHealth?: boolean
  ) => Promise<ServiceLog | null>;
  addVehicle: (vehicle: Omit<Vehicle, 'id'>) => Promise<Vehicle>;
  updateVehicle: (id: string, updates: Partial<Omit<Vehicle, 'id'>>) => Promise<void>;
  updateVehicleHealth: (vehicleId: string, updates: Partial<VehicleHealth>) => Promise<void>;
  deleteVehicle: (id: string) => Promise<void>;
  setActiveVehicle: (id: string) => Promise<void>;
  addService: (vehicleId: string, service: Omit<ServiceRecord, 'id'>) => Promise<void>;
  deleteService: (vehicleId: string, serviceId: string) => Promise<void>;
}

const ActiveCarContext = createContext<ActiveCarContextType | undefined>(undefined);

interface ActiveCarProviderProps {
  children: ReactNode;
}

/** Map Supabase vehicles + health rows into Vehicle[] and pick active id */
function mapSupabaseToVehicles(
  vehicleRows: any[]
): { vehicles: Vehicle[]; activeVehicleId: string | null } {
  const vehicles: Vehicle[] = vehicleRows.map((row: any) => {
    const id = row.id?.toString();
    return {
      id,
      make: row.make ?? '',
      model: row.model ?? '',
      year: row.year ?? 0,
      engine: row.engine_code ?? undefined,
      mileage: row.current_mileage ?? row.mileage ?? 0,
      nickname: row.nickname ?? undefined,
      is_active: row.is_active ?? false,
      photo_url: row.photo_url ?? null,
      services: [],
      health: undefined,
    };
  });
  const activeRow = vehicleRows.find((r: any) => r.is_active === true);
  const activeVehicleId = activeRow?.id?.toString() ?? (vehicleRows[0]?.id?.toString() ?? null);
  return { vehicles, activeVehicleId };
}

export function ActiveCarProvider({ children }: ActiveCarProviderProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [activeVehicleId, setActiveVehicleId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [serviceLogs, setServiceLogs] = useState<ServiceLog[]>([]);
  const hasLoadedRef = useRef(false);

  // Never allow screens to hang indefinitely on context loading
  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 6000);
    return () => clearTimeout(t);
  }, []);

  const fetchServiceLogs = useCallback(async (vehicleId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setServiceLogs([]);
      return;
    }
    const { data, error } = await supabase
      .from('service_logs')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .eq('user_id', user.id)
      .order('date', { ascending: false });
    if (error) {
      console.error('[ActiveCarContext] fetchServiceLogs:', error);
      setServiceLogs([]);
      return;
    }
    const logs: ServiceLog[] = (data || []).map((row: any) => ({
      id: row.id,
      vehicle_id: row.vehicle_id,
      service_type: row.service_type,
      date: row.date,
      mileage: row.mileage ?? 0,
      cost: row.cost,
      notes: row.notes,
      created_at: row.created_at,
    }));
    setServiceLogs(logs);
  }, []);

  useEffect(() => {
    if (activeVehicleId) {
      fetchServiceLogs(activeVehicleId);
    } else {
      setServiceLogs([]);
    }
  }, [activeVehicleId, fetchServiceLogs]);

  const fetchFromSupabase = useCallback(async () => {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        setVehicles([]);
        setActiveVehicleId(null);
        return;
      }

      const { data: vehicleRows, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (vehiclesError) {
        console.error('[ActiveCarContext] fetchFromSupabase vehicles:', vehiclesError);
        return;
      }
      if (!vehicleRows || vehicleRows.length === 0) {
        setVehicles([]);
        setActiveVehicleId(null);
        return;
      }

      const { vehicles: nextVehicles, activeVehicleId: nextActiveId } = mapSupabaseToVehicles(vehicleRows);
      setVehicles(nextVehicles);
      setActiveVehicleId(nextActiveId);

      if (nextActiveId) {
        AsyncStorage.setItem(ACTIVE_VEHICLE_STORAGE_KEY, nextActiveId).catch(() => {});
      }
    } catch {
      // Ensure loading resolves even on network failure
    }
  }, []);

  const loadData = useCallback(async () => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await fetchFromSupabase();
      } else {
        const [vehiclesData, activeId] = await Promise.all([
          AsyncStorage.getItem(VEHICLES_STORAGE_KEY),
          AsyncStorage.getItem(ACTIVE_VEHICLE_STORAGE_KEY),
        ]);
        if (vehiclesData) {
          setVehicles((prev) => (prev.length === 0 ? JSON.parse(vehiclesData) : prev));
        }
        if (activeId) {
          setActiveVehicleId((prev) => (prev === null ? activeId : prev));
        }
      }
    } catch {
      // Silent — loading will be cleared in finally
    } finally {
      setIsLoading(false);
    }
  }, [fetchFromSupabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refreshActiveCar = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await fetchFromSupabase();
      } else {
        const [vehiclesData, activeId] = await Promise.all([
          AsyncStorage.getItem(VEHICLES_STORAGE_KEY),
          AsyncStorage.getItem(ACTIVE_VEHICLE_STORAGE_KEY),
        ]);
        setVehicles(vehiclesData ? JSON.parse(vehiclesData) : []);
        setActiveVehicleId(activeId ?? null);
      }
    } catch (error) {
      console.error('Error refreshing active vehicle:', error);
    }
  }, [fetchFromSupabase]);

  const fetchVehicles = fetchFromSupabase;

  const addVehicle = useCallback(
    async (vehicle: Omit<Vehicle, 'id'>) => {
      const newVehicle: Vehicle = {
        ...vehicle,
        id: Date.now().toString(),
      };
      setVehicles((prevVehicles) => {
        const updatedVehicles = [...prevVehicles, newVehicle];
        AsyncStorage.setItem(VEHICLES_STORAGE_KEY, JSON.stringify(updatedVehicles)).catch((error) => {
          console.error('Error saving vehicles:', error);
        });
        return updatedVehicles;
      });
      return newVehicle;
    },
    []
  );

  const updateVehicle = useCallback(
    async (id: string, updates: Partial<Omit<Vehicle, 'id'>>) => {
      if (updates.mileage !== undefined) {
        const existing = vehicles.find((v) => v.id === id);
        const err = validateMileageUpdate(updates.mileage, existing || null);
        if (err) throw new Error(err.message);
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user && updates.mileage !== undefined) {
        await supabase
          .from('vehicles')
          .update({ current_mileage: updates.mileage })
          .eq('id', id)
          .eq('user_id', user.id);

        const existing = vehicles.find((v) => v.id === id);
        if (existing) {
          const { data: logs } = await supabase
            .from('maintenance_logs')
            .select('service_name, mileage_at_service, vehicle_id')
            .eq('vehicle_id', id)
            .order('created_at', { ascending: false });

          const lastOil = logs?.find((l: any) =>
            l.service_name?.toLowerCase().includes('oil')
          )?.mileage_at_service;

          const lastTire = logs?.find((l: any) =>
            l.service_name?.toLowerCase().includes('tire') ||
            l.service_name?.toLowerCase().includes('tyre')
          )?.mileage_at_service;

          const lastBrake = logs?.find((l: any) =>
            l.service_name?.toLowerCase().includes('brake')
          )?.mileage_at_service;

          await scheduleWrenchyMileageAlerts(
            {
              id,
              make: existing.make,
              model: existing.model,
              year: existing.year,
              mileage: updates.mileage,
            },
            { oil: lastOil, tire: lastTire, brake: lastBrake }
          );
        }
      }
      if (user && updates.photo_url !== undefined) {
        await supabase
          .from('vehicles')
          .update({ photo_url: updates.photo_url })
          .eq('id', id)
          .eq('user_id', user.id);
      }

      setVehicles((prevVehicles) => {
        const updatedVehicles = prevVehicles.map((vehicle) =>
          vehicle.id === id ? { ...vehicle, ...updates } : vehicle
        );
        AsyncStorage.setItem(VEHICLES_STORAGE_KEY, JSON.stringify(updatedVehicles)).catch((error) => {
          console.error('Error saving vehicles:', error);
        });
        return updatedVehicles;
      });
    },
    [vehicles]
  );

  const updateVehicleHealth = useCallback(
    async (vehicleId: string, updates: Partial<VehicleHealth>) => {
      setVehicles((prevVehicles) =>
        prevVehicles.map((vehicle) => {
          if (vehicle.id !== vehicleId) return vehicle;
          const nextHealth: VehicleHealth = {
            ...vehicle.health,
            ...updates,
          };
          return { ...vehicle, health: nextHealth };
        })
      );
    },
    []
  );

  const deleteVehicle = useCallback(
    async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('vehicles').delete().eq('id', id).eq('user_id', user.id);
      }

      setVehicles((prevVehicles) => {
        const updatedVehicles = prevVehicles.filter((vehicle) => vehicle.id !== id);
        AsyncStorage.setItem(VEHICLES_STORAGE_KEY, JSON.stringify(updatedVehicles)).catch((error) => {
          console.error('Error saving vehicles:', error);
        });
        return updatedVehicles;
      });
      setActiveVehicleId((prevId) => {
        if (prevId === id) {
          AsyncStorage.removeItem(ACTIVE_VEHICLE_STORAGE_KEY).catch(() => {});
          return null;
        }
        return prevId;
      });
    },
    []
  );

  const setActiveVehicle = useCallback(
    async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('vehicles').update({ is_active: false }).eq('user_id', user.id);
        await supabase.from('vehicles').update({ is_active: true }).eq('id', id).eq('user_id', user.id);
      }
      setActiveVehicleId(id);
      AsyncStorage.setItem(ACTIVE_VEHICLE_STORAGE_KEY, id).catch((error) => {
        console.error('Error saving active vehicle:', error);
      });
    },
    []
  );

  const addServiceLog = useCallback(
    async (
      log: Omit<ServiceLog, 'id' | 'created_at'>,
      updateHealth?: boolean
    ): Promise<ServiceLog | null> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data: inserted, error } = await supabase
        .from('service_logs')
        .insert({
          vehicle_id: log.vehicle_id,
          user_id: user.id,
          service_type: log.service_type,
          date: log.date,
          mileage: log.mileage,
          cost: log.cost ?? null,
          notes: log.notes ?? null,
        })
        .select('*')
        .single();
      if (error) {
        console.error('[ActiveCarContext] addServiceLog:', error);
        throw new Error(error.message);
      }
      if (updateHealth && inserted) {
        const healthUpdate: Partial<VehicleHealth> = {};
        if (log.service_type === 'Oil Change') healthUpdate.last_oil_change_km = log.mileage;
        if (log.service_type === 'Tire Rotation') healthUpdate.last_tire_rotation_km = log.mileage;
        if (log.service_type === 'Brake Job') healthUpdate.last_brake_service_km = log.mileage;
        if (Object.keys(healthUpdate).length > 0) {
          await updateVehicleHealth(log.vehicle_id, healthUpdate);
        }
      }
      const newLog: ServiceLog = {
        id: inserted.id,
        vehicle_id: inserted.vehicle_id,
        service_type: inserted.service_type,
        date: inserted.date,
        mileage: inserted.mileage ?? 0,
        cost: inserted.cost,
        notes: inserted.notes,
        created_at: inserted.created_at,
      };
      setServiceLogs((prev) => [newLog, ...prev]);
      return newLog;
    },
    [updateVehicleHealth]
  );

  const addService = useCallback(
    async (vehicleId: string, service: Omit<ServiceRecord, 'id'>) => {
      const newService: ServiceRecord = {
        ...service,
        id: Date.now().toString(),
      };
      setVehicles((prevVehicles) => {
        const updatedVehicles = prevVehicles.map((vehicle) => {
          if (vehicle.id === vehicleId) {
            return {
              ...vehicle,
              services: [...(vehicle.services || []), newService],
            };
          }
          return vehicle;
        });
        AsyncStorage.setItem(VEHICLES_STORAGE_KEY, JSON.stringify(updatedVehicles)).catch((error) => {
          console.error('Error saving vehicles:', error);
        });
        return updatedVehicles;
      });
    },
    []
  );

  const deleteService = useCallback(
    async (vehicleId: string, serviceId: string) => {
      setVehicles((prevVehicles) => {
        const updatedVehicles = prevVehicles.map((vehicle) => {
          if (vehicle.id === vehicleId) {
            return {
              ...vehicle,
              services: (vehicle.services || []).filter((s) => s.id !== serviceId),
            };
          }
          return vehicle;
        });
        AsyncStorage.setItem(VEHICLES_STORAGE_KEY, JSON.stringify(updatedVehicles)).catch((error) => {
          console.error('Error saving vehicles:', error);
        });
        return updatedVehicles;
      });
    },
    []
  );

  const activeCar = vehicles.find((v) => v.id === activeVehicleId) || null;

  const value: ActiveCarContextType = {
    vehicles,
    activeCar,
    activeVehicleId,
    isLoading,
    serviceLogs,
    refreshActiveCar,
    fetchVehicles,
    fetchServiceLogs,
    addServiceLog,
    addVehicle,
    updateVehicle,
    updateVehicleHealth,
    deleteVehicle,
    setActiveVehicle,
    addService,
    deleteService,
  };

  return <ActiveCarContext.Provider value={value}>{children}</ActiveCarContext.Provider>;
}

export function useActiveCar() {
  const context = useContext(ActiveCarContext);
  if (context === undefined) {
    throw new Error('useActiveCar must be used within an ActiveCarProvider');
  }
  return context;
}
