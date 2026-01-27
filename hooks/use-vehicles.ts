import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Vehicle } from '@/types/vehicle';

const VEHICLES_STORAGE_KEY = '@pocket_mechanic:vehicles';
const ACTIVE_VEHICLE_STORAGE_KEY = '@pocket_mechanic:active_vehicle_id';

export function useVehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [activeVehicleId, setActiveVehicleId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load vehicles and active vehicle ID from storage
  useEffect(() => {
    const loadData = async () => {
      try {
        const [vehiclesData, activeId] = await Promise.all([
          AsyncStorage.getItem(VEHICLES_STORAGE_KEY),
          AsyncStorage.getItem(ACTIVE_VEHICLE_STORAGE_KEY),
        ]);

        if (vehiclesData) {
          setVehicles(JSON.parse(vehiclesData));
        }
        if (activeId) {
          setActiveVehicleId(activeId);
        }
      } catch (error) {
        console.error('Error loading vehicles:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Save vehicles to storage
  const saveVehicles = useCallback(async (newVehicles: Vehicle[]) => {
    try {
      await AsyncStorage.setItem(VEHICLES_STORAGE_KEY, JSON.stringify(newVehicles));
      setVehicles(newVehicles);
    } catch (error) {
      console.error('Error saving vehicles:', error);
    }
  }, []);

  // Save active vehicle ID to storage
  const saveActiveVehicleId = useCallback(async (id: string | null) => {
    try {
      if (id) {
        await AsyncStorage.setItem(ACTIVE_VEHICLE_STORAGE_KEY, id);
      } else {
        await AsyncStorage.removeItem(ACTIVE_VEHICLE_STORAGE_KEY);
      }
      setActiveVehicleId(id);
    } catch (error) {
      console.error('Error saving active vehicle:', error);
    }
  }, []);

  const addVehicle = useCallback(
    async (vehicle: Omit<Vehicle, 'id'>) => {
      const newVehicle: Vehicle = {
        ...vehicle,
        id: Date.now().toString(),
      };
      const updatedVehicles = [...vehicles, newVehicle];
      await saveVehicles(updatedVehicles);
      return newVehicle;
    },
    [vehicles, saveVehicles]
  );

  const updateVehicle = useCallback(
    async (id: string, updates: Partial<Omit<Vehicle, 'id'>>) => {
      const updatedVehicles = vehicles.map((vehicle) =>
        vehicle.id === id ? { ...vehicle, ...updates } : vehicle
      );
      await saveVehicles(updatedVehicles);
    },
    [vehicles, saveVehicles]
  );

  const deleteVehicle = useCallback(
    async (id: string) => {
      const updatedVehicles = vehicles.filter((vehicle) => vehicle.id !== id);
      await saveVehicles(updatedVehicles);
      
      // If deleted vehicle was active, clear active vehicle
      if (activeVehicleId === id) {
        await saveActiveVehicleId(null);
      }
    },
    [vehicles, activeVehicleId, saveVehicles, saveActiveVehicleId]
  );

  const setActiveVehicle = useCallback(
    async (id: string) => {
      await saveActiveVehicleId(id);
    },
    [saveActiveVehicleId]
  );

  const getActiveVehicle = useCallback(() => {
    return vehicles.find((v) => v.id === activeVehicleId) || null;
  }, [vehicles, activeVehicleId]);

  return {
    vehicles,
    activeVehicleId,
    activeVehicle: getActiveVehicle(),
    isLoading,
    addVehicle,
    updateVehicle,
    deleteVehicle,
    setActiveVehicle,
  };
}
