import { supabase } from '@/lib/supabase';

export interface FuelLog {
  id: string;
  user_id: string;
  vehicle_id: string;
  date: string;
  mileage_at_fillup: number;
  liters: number;
  cost: number;
  fuel_type: string;
  full_tank: boolean;
  station_name?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface FuelStats {
  totalLiters: number;
  totalCost: number;
  totalDistance: number;
  avgConsumption: number; // L/100km
  avgCostPerKm: number;
  avgCostPerLiter: number;
  bestConsumption: number;
  worstConsumption: number;
  fillUpCount: number;
  lastFillUp: FuelLog | null;
}

export async function getFuelLogs(vehicleId: string): Promise<FuelLog[]> {
  const { data, error } = await supabase
    .from('fuel_logs')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('mileage_at_fillup', { ascending: true });

  if (error) {
    console.error('[FuelTracking] getFuelLogs error:', error);
    return [];
  }

  return (data ?? []) as FuelLog[];
}

export async function addFuelLog(
  log: Omit<FuelLog, 'id' | 'created_at'>
): Promise<FuelLog | null> {
  const { data, error } = await supabase
    .from('fuel_logs')
    .insert(log)
    .select()
    .single();

  if (error) {
    console.error('[FuelTracking] addFuelLog error:', error);
    return null;
  }

  return data as FuelLog;
}

export async function deleteFuelLog(logId: string): Promise<boolean> {
  const { error } = await supabase.from('fuel_logs').delete().eq('id', logId);
  if (error) {
    console.error('[FuelTracking] deleteFuelLog error:', error);
    return false;
  }
  return true;
}

// Calculate fuel economy between consecutive fill-ups.
// Uses ONLY intervals where BOTH prev and curr are full-tank fill-ups.
export function calculateConsumption(logs: FuelLog[]) {
  const results: { date: string; consumption: number; costPerKm: number; distance: number }[] = [];

  // Defensive: ensure chronological by mileage
  const sorted = [...logs].sort((a, b) => a.mileage_at_fillup - b.mileage_at_fillup);

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];

    if (!prev.full_tank || !curr.full_tank) continue;

    const distance = curr.mileage_at_fillup - prev.mileage_at_fillup;
    if (distance <= 0) continue;

    const consumption = (curr.liters / distance) * 100; // L/100km
    const costPerKm = curr.cost / distance;

    results.push({
      date: curr.date,
      consumption: Math.round(consumption * 10) / 10,
      costPerKm: Math.round(costPerKm * 100) / 100,
      distance,
    });
  }

  return results;
}

export function calculateFuelStats(logs: FuelLog[]): FuelStats {
  if (!logs.length) {
    return {
      totalLiters: 0,
      totalCost: 0,
      totalDistance: 0,
      avgConsumption: 0,
      avgCostPerKm: 0,
      avgCostPerLiter: 0,
      bestConsumption: 0,
      worstConsumption: 0,
      fillUpCount: 0,
      lastFillUp: null,
    };
  }

  const sorted = [...logs].sort((a, b) => a.mileage_at_fillup - b.mileage_at_fillup);
  const totalLiters = sorted.reduce((sum, l) => sum + Number(l.liters), 0);
  const totalCost = sorted.reduce((sum, l) => sum + Number(l.cost), 0);

  const consumptionData = calculateConsumption(sorted);
  const consumptions = consumptionData.map((c) => c.consumption);

  const totalDistance =
    sorted.length >= 2 ? sorted[sorted.length - 1].mileage_at_fillup - sorted[0].mileage_at_fillup : 0;

  const avgConsumption =
    consumptions.length > 0 ? consumptions.reduce((a, b) => a + b, 0) / consumptions.length : 0;

  return {
    totalLiters: Math.round(totalLiters * 10) / 10,
    totalCost: Math.round(totalCost * 100) / 100,
    totalDistance,
    avgConsumption: Math.round(avgConsumption * 10) / 10,
    avgCostPerKm: totalDistance > 0 ? Math.round((totalCost / totalDistance) * 100) / 100 : 0,
    avgCostPerLiter: totalLiters > 0 ? Math.round((totalCost / totalLiters) * 100) / 100 : 0,
    bestConsumption: consumptions.length > 0 ? Math.min(...consumptions) : 0,
    worstConsumption: consumptions.length > 0 ? Math.max(...consumptions) : 0,
    fillUpCount: sorted.length,
    lastFillUp: sorted[sorted.length - 1] ?? null,
  };
}

// Check for anomalies — consumption spike
export function checkFuelAnomaly(logs: FuelLog[]): string | null {
  const consumptionData = calculateConsumption(logs);
  if (consumptionData.length < 3) return null; // Need at least 3 data points

  const recent = consumptionData[consumptionData.length - 1];
  const previous = consumptionData.slice(0, -1);
  const previousAvg = previous.reduce((sum, c) => sum + c.consumption, 0) / previous.length;

  if (previousAvg <= 0) return null;

  const percentIncrease = ((recent.consumption - previousAvg) / previousAvg) * 100;

  if (percentIncrease > 15) {
    return `Your fuel consumption jumped ${Math.round(percentIncrease)}% on your last fill-up (${recent.consumption} L/100km vs your average of ${Math.round(
      previousAvg * 10
    ) / 10} L/100km). This could indicate low tire pressure, a clogged air filter, or a mechanical issue.`;
  }

  return null;
}

