import { Vehicle } from '@/types/vehicle';
import { isElectricVehicle } from './evDetection';

interface HealthScoreResult {
  score: number;
  status: 'great' | 'attention' | 'overdue' | 'critical';
  label: string;
  color: string;
  issues: string[];
}

export const calculateHealthScore = (
  vehicle: Vehicle,
  maintenanceLogs: any[],
  reminders: any[]
): HealthScoreResult => {
  const vehicleMileage =
    (vehicle as any).current_mileage > 0
      ? (vehicle as any).current_mileage
      : (vehicle.mileage ?? 0);
  const isEV = isElectricVehicle(vehicle.make ?? '', vehicle.model ?? '');
  let score = 100;
  const issues: string[] = [];

  const vehicleLogs = maintenanceLogs.filter(
    (l) => l.vehicle_id === vehicle.id
  );
  const vehicleReminders = reminders.filter(
    (r) => r.vehicle_id === vehicle.id && !r.is_completed
  );

  // No service history at all
  if (vehicleLogs.length === 0) {
    const vehicleAge = new Date().getFullYear() - (vehicle.year ?? new Date().getFullYear());
    const isNewVehicle = vehicleAge <= 1 && vehicleMileage < 15000;
    if (!isNewVehicle) {
      score -= 20;
      issues.push('No service history logged');
    }
  }

  // Check overdue reminders
  const now = new Date();
  const overdueReminders = vehicleReminders.filter((r) => {
    if (!r.due_date) return false;
    return new Date(r.due_date) < now;
  });

  const overdueCount = Math.min(overdueReminders.length, 2);
  score -= overdueCount * 10;
  if (overdueCount > 0) {
    issues.push(`${overdueCount} service${overdueCount > 1 ? 's' : ''} overdue`);
  }

  // Derive normalized service name and mileage helpers
  const oilLogs = vehicleLogs.filter((l) => {
    const name = (l.service_name || l.service_type || l.name || '').toLowerCase();
    return name.includes('oil');
  });
  const tireLogs = vehicleLogs.filter((l) => {
    const name = (l.service_name || l.service_type || l.name || '').toLowerCase();
    return name.includes('tire') || name.includes('tyre');
  });
  const brakeLogs = vehicleLogs.filter((l) => {
    const name = (l.service_name || l.service_type || l.name || '').toLowerCase();
    return name.includes('brake');
  });

  const lastOilMileage =
    oilLogs[0]?.mileage_at_service ??
    oilLogs[0]?.odometer ??
    oilLogs[0]?.mileage ??
    0;
  const lastTireMileage =
    tireLogs[0]?.mileage_at_service ??
    tireLogs[0]?.odometer ??
    tireLogs[0]?.mileage ??
    0;
  const lastBrakeMileage =
    brakeLogs[0]?.mileage_at_service ??
    brakeLogs[0]?.odometer ??
    brakeLogs[0]?.mileage ??
    0;

  const kmSinceOil = vehicleMileage - lastOilMileage;
  const kmSinceTire = vehicleMileage - lastTireMileage;
  const kmSinceBrake = vehicleMileage - lastBrakeMileage;

  // Oil — skip entirely for EVs
  if (!isEV) {
    if (oilLogs.length > 0) {
      if (kmSinceOil >= 8000) {
        score -= 25;
        issues.push('Oil change overdue');
      } else if (kmSinceOil >= 6000) {
        score -= 10;
        issues.push('Oil change due soon');
      }
    } else if (vehicleMileage > 8000) {
      score -= 25;
      issues.push('No oil change on record');
    }
  }

  // Tire rotation
  if (tireLogs.length > 0) {
    if (kmSinceTire >= 12000) {
      score -= 15;
      issues.push('Tire rotation overdue');
    } else if (kmSinceTire >= 10000) {
      score -= 10;
      issues.push('Tire rotation due soon');
    }
  } else if (vehicleMileage > 12000) {
    score -= 15;
    issues.push('No tire rotation on record');
  }

  // Brake check
  if (brakeLogs.length > 0) {
    if (kmSinceBrake >= 50000) {
      score -= 15;
      issues.push('Brake inspection overdue');
    }
  } else if (vehicleMileage > 50000) {
    score -= 15;
    issues.push('No brake inspection on record');
  }

  score = Math.max(0, Math.min(100, score));

  let status: HealthScoreResult['status'];
  let label: string;
  let color: string;

  if (score >= 80) {
    status = 'great';
    label = 'Great Shape';
    color = '#2ECC71';
  } else if (score >= 60) {
    status = 'attention';
    label = 'Needs Attention';
    color = '#0567A6';
  } else if (score >= 40) {
    status = 'overdue';
    label = 'Service Overdue';
    color = '#E67E22';
  } else {
    status = 'critical';
    label = 'Critical';
    color = '#FF4444';
  }

  return { score, status, label, color, issues };
};

