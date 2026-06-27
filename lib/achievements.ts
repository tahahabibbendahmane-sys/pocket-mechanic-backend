import { supabase } from './supabase';
import { isElectricVehicle } from './evDetection';

export interface Badge {
  id: string;
  title: string;
  emoji: string;
  description: string;
}

export const BADGES: Record<string, Badge> = {
  first_service: { id: 'first_service', title: 'First Wrench', emoji: '🔧', description: 'Log your first service' },
  five_services: { id: 'five_services', title: 'Regular', emoji: '⭐', description: 'Log 5 services' },
  money_saver: { id: 'money_saver', title: 'Money Saver', emoji: '💰', description: 'Save $100+ doing DIY' },
  streak_7: { id: 'streak_7', title: 'Week Warrior', emoji: '🔥', description: '7-day streak' },
  streak_30: { id: 'streak_30', title: 'Monthly Machine', emoji: '💪', description: '30-day streak' },
  two_cars: { id: 'two_cars', title: 'Collector', emoji: '🚗', description: 'Add 2+ vehicles' },
  health_100: { id: 'health_100', title: 'Perfect Health', emoji: '💚', description: 'Get a 100 health score' },
  vin_scanner: { id: 'vin_scanner', title: 'VIN Scanner', emoji: '📱', description: 'Decode a VIN' },
  guide_reader: { id: 'guide_reader', title: 'DIY King', emoji: '📖', description: 'Read 5 guides' },
  oil_master: { id: 'oil_master', title: 'Oil Master', emoji: '🛢️', description: 'Log 3 oil changes' },
};

export const ALL_BADGE_IDS = Object.keys(BADGES);

export const EV_EXCLUDED_ACHIEVEMENTS = ['oil_master'] as const;

export function getEligibleBadgeIds(make?: string, model?: string): string[] {
  const isEV = isElectricVehicle(make ?? '', model ?? '');
  const achievements = ALL_BADGE_IDS.map((id) => BADGES[id]);
  const eligibleAchievements = isEV
    ? achievements.filter((a) => !(EV_EXCLUDED_ACHIEVEMENTS as readonly string[]).includes(a.id))
    : achievements;
  return eligibleAchievements.map((a) => a.id);
}

export async function getUserAchievements(userId: string): Promise<string[]> {
  const { data } = await supabase
    .from('achievements')
    .select('badge_id')
    .eq('user_id', userId);
  return (data ?? []).map((a) => a.badge_id);
}

export async function unlockAchievement(userId: string, badgeId: string): Promise<boolean> {
  const { error } = await supabase
    .from('achievements')
    .upsert({ user_id: userId, badge_id: badgeId }, { onConflict: 'user_id,badge_id' });
  return !error;
}

export async function checkAndUnlockAchievements(
  userId: string,
  context: {
    serviceCount?: number;
    vehicleCount?: number;
    streak?: number;
    healthScore?: number;
    totalSaved?: number;
    guidesRead?: number;
    oilChangeCount?: number;
    vinDecoded?: boolean;
    vehicleMake?: string;
    vehicleModel?: string;
  }
): Promise<Badge[]> {
  const existing = await getUserAchievements(userId);
  const newBadges: Badge[] = [];

  const isEV = isElectricVehicle(
    context.vehicleMake ?? '',
    context.vehicleModel ?? ''
  );

  const achievements = ALL_BADGE_IDS.map((id) => BADGES[id]);
  const eligibleAchievements = isEV
    ? achievements.filter((a) => !(EV_EXCLUDED_ACHIEVEMENTS as readonly string[]).includes(a.id))
    : achievements;

  const tryUnlock = async (badgeId: string) => {
    if (!eligibleAchievements.some((a) => a.id === badgeId)) return;
    if (existing.includes(badgeId)) return;
    const badge = BADGES[badgeId];
    if (!badge) return;
    const success = await unlockAchievement(userId, badgeId);
    if (success) newBadges.push(badge);
  };

  if ((context.serviceCount ?? 0) >= 1) await tryUnlock('first_service');
  if ((context.serviceCount ?? 0) >= 5) await tryUnlock('five_services');
  if ((context.totalSaved ?? 0) >= 100) await tryUnlock('money_saver');
  if ((context.streak ?? 0) >= 7) await tryUnlock('streak_7');
  if ((context.streak ?? 0) >= 30) await tryUnlock('streak_30');
  if ((context.vehicleCount ?? 0) >= 2) await tryUnlock('two_cars');
  if ((context.healthScore ?? 0) >= 100) await tryUnlock('health_100');
  if (context.vinDecoded) await tryUnlock('vin_scanner');
  if ((context.guidesRead ?? 0) >= 5) await tryUnlock('guide_reader');
  if ((context.oilChangeCount ?? 0) >= 3) await tryUnlock('oil_master');

  return newBadges;
}
