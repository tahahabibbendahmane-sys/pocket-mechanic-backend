import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import {
  getUserXP,
  getUserLevel,
  addXP,
  getStreak,
  checkIn,
  XPAction,
  LevelInfo,
  StreakInfo,
} from '@/lib/xpSystem';
import { getUserAchievements, checkAndUnlockAchievements, Badge } from '@/lib/achievements';

interface XPContextType {
  totalXP: number;
  levelInfo: LevelInfo;
  streak: StreakInfo;
  earnedBadges: string[];
  earnXP: (action: XPAction) => Promise<{ xpEarned: number; leveledUp: boolean }>;
  doCheckIn: () => Promise<{ streak: number; xpEarned: number }>;
  refreshStats: () => Promise<void>;
  pendingXPPopup: number | null;
  dismissXPPopup: () => void;
}

const XPContext = createContext<XPContextType>({
  totalXP: 0,
  levelInfo: { level: 1, title: 'New Driver', emoji: '', xpForNext: 100, xpProgress: 0, totalXP: 0 },
  streak: { currentStreak: 0, longestStreak: 0, lastCheckIn: null, checkedInToday: false },
  earnedBadges: [],
  earnXP: async () => ({ xpEarned: 0, leveledUp: false }),
  doCheckIn: async () => ({ streak: 0, xpEarned: 0 }),
  refreshStats: async () => {},
  pendingXPPopup: null,
  dismissXPPopup: () => {},
});

export function XPProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [totalXP, setTotalXP] = useState(0);
  const [streak, setStreak] = useState<StreakInfo>({
    currentStreak: 0, longestStreak: 0, lastCheckIn: null, checkedInToday: false,
  });
  const [earnedBadges, setEarnedBadges] = useState<string[]>([]);
  const [pendingXPPopup, setPendingXPPopup] = useState<number | null>(null);

  const levelInfo = getUserLevel(totalXP);

  const refreshStats = useCallback(async () => {
    if (!userId) return;
    try {
      const [xp, s, badges] = await Promise.all([
        getUserXP(userId),
        getStreak(userId),
        getUserAchievements(userId),
      ]);
      setTotalXP(xp);
      setStreak(s);
      setEarnedBadges(badges);
    } catch {
      // silent
    }
  }, [userId]);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  const earnXP = useCallback(async (action: XPAction) => {
    if (!userId) return { xpEarned: 0, leveledUp: false };
    const result = await addXP(userId, action);
    setTotalXP(result.newTotal);
    setPendingXPPopup(result.newTotal - totalXP);
    return { xpEarned: result.newTotal - totalXP, leveledUp: result.leveledUp };
  }, [userId, totalXP]);

  const doCheckIn = useCallback(async () => {
    if (!userId) return { streak: 0, xpEarned: 0 };
    const result = await checkIn(userId);
    setStreak((prev) => ({ ...prev, currentStreak: result.streak, checkedInToday: true }));
    setTotalXP((prev) => prev + result.xpEarned);
    if (result.xpEarned > 0) setPendingXPPopup(result.xpEarned);
    return result;
  }, [userId]);

  const dismissXPPopup = useCallback(() => {
    setPendingXPPopup(null);
  }, []);

  return (
    <XPContext.Provider
      value={{
        totalXP,
        levelInfo,
        streak,
        earnedBadges,
        earnXP,
        doCheckIn,
        refreshStats,
        pendingXPPopup,
        dismissXPPopup,
      }}
    >
      {children}
    </XPContext.Provider>
  );
}

export function useXP() {
  return useContext(XPContext);
}
