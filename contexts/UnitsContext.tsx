import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type UnitSystem = 'metric' | 'imperial';

const UNITS_STORAGE_KEY = '@pocket_mechanic:units';

interface UnitsContextType {
  unitSystem: UnitSystem;
  setUnitSystem: (unit: UnitSystem) => Promise<void>;
  isMetric: boolean;
  isImperial: boolean;
}

const UnitsContext = createContext<UnitsContextType | undefined>(undefined);

interface UnitsProviderProps {
  children: ReactNode;
}

export function UnitsProvider({ children }: UnitsProviderProps) {
  const [unitSystem, setUnitSystemState] = useState<UnitSystem>('metric');
  const [isLoading, setIsLoading] = useState(true);

  // Load units from storage on startup
  useEffect(() => {
    const loadUnits = async () => {
      try {
        const savedUnits = await AsyncStorage.getItem(UNITS_STORAGE_KEY);
        if (savedUnits === 'metric' || savedUnits === 'imperial') {
          setUnitSystemState(savedUnits as UnitSystem);
        }
        // Default to metric if not set
      } catch (error) {
        console.error('Error loading units:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUnits();
  }, []);

  const setUnitSystem = useCallback(async (newUnit: UnitSystem) => {
    try {
      await AsyncStorage.setItem(UNITS_STORAGE_KEY, newUnit);
      setUnitSystemState(newUnit);
    } catch (error) {
      console.error('Error saving units:', error);
    }
  }, []);

  // Don't render children until units are loaded to prevent flash
  if (isLoading) {
    return null;
  }

  const value: UnitsContextType = {
    unitSystem,
    setUnitSystem,
    isMetric: unitSystem === 'metric',
    isImperial: unitSystem === 'imperial',
  };

  return <UnitsContext.Provider value={value}>{children}</UnitsContext.Provider>;
}

export function useUnits() {
  const context = useContext(UnitsContext);
  if (context === undefined) {
    throw new Error('useUnits must be used within a UnitsProvider');
  }
  return context;
}
