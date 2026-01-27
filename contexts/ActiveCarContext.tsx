import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Vehicle, ServiceRecord } from '@/types/vehicle';
import { validateMileageUpdate } from '@/utils/vehicle-validation';

const VEHICLES_STORAGE_KEY = '@pocket_mechanic:vehicles';
const ACTIVE_VEHICLE_STORAGE_KEY = '@pocket_mechanic:active_vehicle_id';

interface ActiveCarContextType {
  vehicles: Vehicle[];
  activeCar: Vehicle | null;
  activeVehicleId: string | null;
  isLoading: boolean;
  refreshActiveCar: () => Promise<void>;
  addVehicle: (vehicle: Omit<Vehicle, 'id'>) => Promise<Vehicle>;
  updateVehicle: (id: string, updates: Partial<Omit<Vehicle, 'id'>>) => Promise<void>;
  deleteVehicle: (id: string) => Promise<void>;
  setActiveVehicle: (id: string) => Promise<void>;
  addService: (vehicleId: string, service: Omit<ServiceRecord, 'id'>) => Promise<void>;
  deleteService: (vehicleId: string, serviceId: string) => Promise<void>;
}

const ActiveCarContext = createContext<ActiveCarContextType | undefined>(undefined);

interface ActiveCarProviderProps {
  children: ReactNode;
}

export function ActiveCarProvider({ children }: ActiveCarProviderProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [activeVehicleId, setActiveVehicleId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const hasLoadedRef = useRef(false);

  // Load vehicles and active vehicle ID from storage on startup
  useEffect(() => {
    const loadData = async () => {
      // Only load if we haven't loaded yet to prevent overwriting newly added cars
      if (hasLoadedRef.current) return;
      hasLoadedRef.current = true;

      try {
        const [vehiclesData, activeId] = await Promise.all([
          AsyncStorage.getItem(VEHICLES_STORAGE_KEY),
          AsyncStorage.getItem(ACTIVE_VEHICLE_STORAGE_KEY),
        ]);

        // Only set vehicles from storage if we haven't already added any (prevents overwriting newly added cars)
        if (vehiclesData) {
          setVehicles((prevVehicles) => {
            // Only overwrite if vehicles array is still empty (initial state)
            // This prevents overwriting newly added cars if load completes after user adds a car
            if (prevVehicles.length === 0) {
              return JSON.parse(vehiclesData);
            }
            return prevVehicles;
          });
        }
        if (activeId) {
          setActiveVehicleId((prevId) => {
            // Only set if not already set
            if (prevId === null) {
              return activeId;
            }
            return prevId;
          });
        }
      } catch (error) {
        console.error('Error loading vehicles:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const addVehicle = useCallback(
    async (vehicle: Omit<Vehicle, 'id'>) => {
      const newVehicle: Vehicle = {
        ...vehicle,
        id: Date.now().toString(),
      };
      // Use functional update to avoid stale closure
      setVehicles((prevVehicles) => {
        const updatedVehicles = [...prevVehicles, newVehicle];
        // Save to storage asynchronously
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
      // Validate mileage update if mileage is being changed (check current state first)
      if (updates.mileage !== undefined) {
        // Get current vehicle for validation
        const currentVehicles = vehicles;
        const existingVehicle = currentVehicles.find((v) => v.id === id);
        const mileageError = validateMileageUpdate(updates.mileage, existingVehicle || null);
        if (mileageError) {
          throw new Error(mileageError.message);
        }
      }

      // Use functional update to avoid stale closure
      setVehicles((prevVehicles) => {
        const updatedVehicles = prevVehicles.map((vehicle) =>
          vehicle.id === id ? { ...vehicle, ...updates } : vehicle
        );
        // Save to storage asynchronously
        AsyncStorage.setItem(VEHICLES_STORAGE_KEY, JSON.stringify(updatedVehicles)).catch((error) => {
          console.error('Error saving vehicles:', error);
        });
        return updatedVehicles;
      });
    },
    [vehicles]
  );

  const deleteVehicle = useCallback(
    async (id: string) => {
      // Use functional update to avoid stale closure
      setVehicles((prevVehicles) => {
        const updatedVehicles = prevVehicles.filter((vehicle) => vehicle.id !== id);
        // Save to storage asynchronously
        AsyncStorage.setItem(VEHICLES_STORAGE_KEY, JSON.stringify(updatedVehicles)).catch((error) => {
          console.error('Error saving vehicles:', error);
        });
        return updatedVehicles;
      });

      // If deleted vehicle was active, clear active vehicle
      setActiveVehicleId((prevId) => {
        if (prevId === id) {
          AsyncStorage.removeItem(ACTIVE_VEHICLE_STORAGE_KEY).catch((error) => {
            console.error('Error removing active vehicle:', error);
          });
          return null;
        }
        return prevId;
      });
    },
    []
  );

  const setActiveVehicle = useCallback(
    async (id: string) => {
      // Use functional update to avoid stale closure
      setActiveVehicleId((prevId) => {
        AsyncStorage.setItem(ACTIVE_VEHICLE_STORAGE_KEY, id).catch((error) => {
          console.error('Error saving active vehicle:', error);
        });
        return id;
      });
    },
    []
  );

  const refreshActiveCar = useCallback(async () => {
    try {
      const [vehiclesData, activeId] = await Promise.all([
        AsyncStorage.getItem(VEHICLES_STORAGE_KEY),
        AsyncStorage.getItem(ACTIVE_VEHICLE_STORAGE_KEY),
      ]);

      if (vehiclesData) {
        setVehicles(JSON.parse(vehiclesData));
      } else {
        setVehicles([]);
      }

      setActiveVehicleId(activeId ?? null);
    } catch (error) {
      console.error('Error refreshing active vehicle:', error);
    }
  }, []);

  const addService = useCallback(
    async (vehicleId: string, service: Omit<ServiceRecord, 'id'>) => {
      const newService: ServiceRecord = {
        ...service,
        id: Date.now().toString(),
      };
      // Use functional update to avoid stale closure
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
        // Save to storage asynchronously
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
      // Use functional update to avoid stale closure
      setVehicles((prevVehicles) => {
        const updatedVehicles = prevVehicles.map((vehicle) => {
          if (vehicle.id === vehicleId) {
            return {
              ...vehicle,
              services: (vehicle.services || []).filter((service) => service.id !== serviceId),
            };
          }
          return vehicle;
        });
        // Save to storage asynchronously
        AsyncStorage.setItem(VEHICLES_STORAGE_KEY, JSON.stringify(updatedVehicles)).catch((error) => {
          console.error('Error saving vehicles:', error);
        });
        return updatedVehicles;
      });
    },
    []
  );

  // Compute activeCar from vehicles and activeVehicleId
  const activeCar = vehicles.find((v) => v.id === activeVehicleId) || null;

  const value: ActiveCarContextType = {
    vehicles,
    activeCar,
    activeVehicleId,
    isLoading,
    refreshActiveCar,
    addVehicle,
    updateVehicle,
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
