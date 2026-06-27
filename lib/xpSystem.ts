import { supabase } from './supabase';

export const XP_REWARDS = {
  LOG_SERVICE: 50,
  ADD_VEHICLE: 30,
  COMPLETE_GUIDE: 25,
  LOG_FUEL: 25,
  CHECK_HEALTH: 10,
  ASK_WRENCHY: 15,
  UPLOAD_DOCUMENT: 20,
  DAILY_CHECK_IN: 10,
  STREAK_BONUS: 5,
  VIN_DECODE: 25,
  CHECK_RECALLS: 15,
} as const;

export type XPAction = keyof typeof XP_REWARDS;

const LEVELS = [
  { level: 1, xp: 0, title: 'New Driver', emoji: '' },
  { level: 2, xp: 100, title: 'Maintenance Aware', emoji: '' },
  { level: 3, xp: 300, title: 'Service Tracker', emoji: '' },
  { level: 4, xp: 600, title: 'Garage Regular', emoji: '' },
  { level: 5, xp: 1000, title: 'Dedicated Owner', emoji: '' },
  { level: 6, xp: 1500, title: 'Care Pro', emoji: '' },
  { level: 7, xp: 2200, title: 'Expert Maintainer', emoji: '' },
  { level: 8, xp: 3000, title: 'Vehicle Specialist', emoji: '' },
  { level: 9, xp: 4000, title: 'Top Tier', emoji: '' },
  { level: 10, xp: 5500, title: 'Elite', emoji: '' },
];

export interface LevelInfo {
  level: number;
  title: string;
  emoji: string;
  xpForNext: number;
  xpProgress: number;
  totalXP: number;
}

export function getUserLevel(totalXP: number): LevelInfo {
  let current = LEVELS[0];
  for (const lvl of LEVELS) {
    if (totalXP >= lvl.xp) current = lvl;
    else break;
  }
  const nextLevel = LEVELS.find((l) => l.xp > totalXP);
  const xpForNext = nextLevel ? nextLevel.xp - current.xp : 0;
  const xpProgress = nextLevel ? (totalXP - current.xp) / (nextLevel.xp - current.xp) : 1;

  return {
    level: current.level,
    title: current.title,
    emoji: current.emoji,
    xpForNext,
    xpProgress: Math.min(1, Math.max(0, xpProgress)),
    totalXP,
  };
}

export async function getUserXP(userId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('user_stats')
      .select('total_xp')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return data?.total_xp ?? 0;
  } catch (e) {
    console.error('[xpSystem] getUserXP:', e);
    return 0;
  }
}

export async function addXP(userId: string, action: XPAction): Promise<{ newTotal: number; leveledUp: boolean }> {
  const amount = XP_REWARDS[action];
  const oldXP = await getUserXP(userId);
  const newTotal = oldXP + amount;
  const oldLevel = getUserLevel(oldXP).level;
  const newLevel = getUserLevel(newTotal).level;

  await supabase
    .from('user_stats')
    .upsert({
      user_id: userId,
      total_xp: newTotal,
    }, { onConflict: 'user_id' });

  await supabase.from('xp_log').insert({
    user_id: userId,
    action,
    xp_amount: amount,
  });

  return { newTotal, leveledUp: newLevel > oldLevel };
}

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  lastCheckIn: string | null;
  checkedInToday: boolean;
}

export async function getStreak(userId: string): Promise<StreakInfo> {
  let data: any = null;
  try {
    const res = await supabase
      .from('user_stats')
      .select('current_streak, longest_streak, last_check_in')
      .eq('user_id', userId)
      .maybeSingle();
    if (res.error) throw res.error;
    data = res.data;
  } catch (e) {
    console.error('[xpSystem] getStreak:', e);
    data = null;
  }

  const lastCheckIn = data?.last_check_in ?? null;
  const today = new Date().toISOString().split('T')[0];
  const lastDate = lastCheckIn ? new Date(lastCheckIn).toISOString().split('T')[0] : null;

  return {
    currentStreak: data?.current_streak ?? 0,
    longestStreak: data?.longest_streak ?? 0,
    lastCheckIn,
    checkedInToday: lastDate === today,
  };
}

export async function checkIn(userId: string): Promise<{ streak: number; xpEarned: number }> {
  const streak = await getStreak(userId);
  if (streak.checkedInToday) {
    return { streak: streak.currentStreak, xpEarned: 0 };
  }

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const lastDate = streak.lastCheckIn ? new Date(streak.lastCheckIn).toISOString().split('T')[0] : null;
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const isConsecutive = lastDate === yesterdayStr;
  const newStreak = isConsecutive ? streak.currentStreak + 1 : 1;
  const newLongest = Math.max(newStreak, streak.longestStreak);
  const xpEarned = XP_REWARDS.DAILY_CHECK_IN + (newStreak * XP_REWARDS.STREAK_BONUS);

  const oldXP = await getUserXP(userId);

  await supabase
    .from('user_stats')
    .upsert({
      user_id: userId,
      current_streak: newStreak,
      longest_streak: newLongest,
      last_check_in: today.toISOString(),
      total_xp: oldXP + xpEarned,
    }, { onConflict: 'user_id' });

  await supabase.from('xp_log').insert({
    user_id: userId,
    action: 'DAILY_CHECK_IN',
    xp_amount: xpEarned,
  });

  return { streak: newStreak, xpEarned };
}
