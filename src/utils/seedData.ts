import { BabyProfile, ReminderRule, TrackerEntry } from '../types/tracker';

export const DEFAULT_BABY_PROFILE: BabyProfile = {
  id: 'baby-default',
  name: 'Lucas',
  birthDate: '2026-08-12',
  dailyFeedingGoalCount: 8,
  dailySleepGoalMinutes: 840, // 14h
};

export const DEFAULT_REMINDER_RULES: ReminderRule[] = [
  {
    id: 'rem-feeding',
    type: 'feeding',
    enabled: true,
    mode: 'smart',
    intervalMinutes: 180, // 3h baseline
    advanceAlertMinutes: 15,
    quietHoursEnabled: true,
    quietHoursStart: '23:00',
    quietHoursEnd: '05:30',
    soundEnabled: true,
  },
  {
    id: 'rem-sleep',
    type: 'sleep',
    enabled: true,
    mode: 'smart',
    intervalMinutes: 95, // 1h35m wake window
    advanceAlertMinutes: 10,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '06:00',
    soundEnabled: true,
  },
];

export function createSeedEntries(
  now: Date = new Date(),
  babyId: string = DEFAULT_BABY_PROFILE.id
): TrackerEntry[] {
  const entries: TrackerEntry[] = [];

  const addFeeding = (
    daysAgo: number,
    hour: number,
    minute: number,
    durationMin: number,
    side: 'left' | 'right' | 'both' | 'bottle',
    amountMl?: number,
    notes?: string
  ) => {
    const start = new Date(now);
    start.setDate(start.getDate() - daysAgo);
    start.setHours(hour, minute, 0, 0);
    if (start.getTime() > now.getTime() - 15 * 60000) return; // keep strictly in past
    const end = new Date(start.getTime() + durationMin * 60000);
    entries.push({
      id: `seed-f-${daysAgo}-${hour}-${minute}`,
      babyId,
      type: 'feeding',
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      durationSeconds: durationMin * 60,
      side,
      amountMl,
      notes,
    });
  };

  const addSleep = (
    daysAgo: number,
    hour: number,
    minute: number,
    durationMin: number,
    quality: 'calm' | 'deep' | 'restless',
    location = 'Berço'
  ) => {
    const start = new Date(now);
    start.setDate(start.getDate() - daysAgo);
    start.setHours(hour, minute, 0, 0);
    if (start.getTime() > now.getTime() - 10 * 60000) return;
    const end = new Date(start.getTime() + durationMin * 60000);
    entries.push({
      id: `seed-s-${daysAgo}-${hour}-${minute}`,
      babyId,
      type: 'sleep',
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      durationSeconds: durationMin * 60,
      quality,
      location,
    });
  };

  // Generate 10 days of realistic 3-month-old baby routine
  for (let d = 9; d >= 1; d--) {
    const jitter = (d % 3) * 8 - 8;
    addSleep(d, 0, 15, 295 + jitter, 'deep', 'Berço');
    addFeeding(d, 5, 15 + Math.abs(jitter), 22, 'left');
    addSleep(d, 5, 50, 110, 'calm', 'Berço');
    addFeeding(d, 8, 5, 19, 'right');
    addSleep(d, 9, 30, 75 + jitter, 'calm', 'Carrinho');
    addFeeding(d, 11, 0, 21, 'left');
    addSleep(d, 12, 20, 95, 'deep', 'Berço');
    addFeeding(d, 14, 15, 17, 'right');
    addSleep(d, 15, 45, 55, 'restless', 'Colo');
    addFeeding(d, 17, 10, 20, 'both');
    addSleep(d, 18, 40, 45, 'calm', 'Berço');
    addFeeding(d, 19, 50, 18, 'bottle', 120, 'Leite ordenhado antes de dormir');
    addSleep(d, 20, 30, 220, 'deep', 'Berço');
  }

  // Today's recent events anchored safely before `now`
  const curH = now.getHours();
  if (curH >= 2) {
    addSleep(0, 0, 20, 240, 'deep', 'Berço');
  }
  if (curH >= 5) {
    addFeeding(0, 4, 30, 20, 'left', undefined, 'Mamada tranquila da madrugada');
  }
  if (curH >= 6) {
    addSleep(0, 5, 5, 85, 'calm', 'Berço');
  }
  // Also add one recent feeding ~2h25m ago and sleep ending ~1h15m ago relative to `now` so countdowns are always active
  const recentFeedStart = new Date(now.getTime() - 165 * 60000);
  const recentFeedEnd = new Date(recentFeedStart.getTime() + 19 * 60000);
  entries.push({
    id: 'seed-today-recent-feed',
    babyId,
    type: 'feeding',
    startTime: recentFeedStart.toISOString(),
    endTime: recentFeedEnd.toISOString(),
    durationSeconds: 19 * 60,
    side: 'right',
    notes: 'Boa pega',
  });

  const recentSleepStart = new Date(now.getTime() - 135 * 60000);
  const recentSleepEnd = new Date(recentSleepStart.getTime() + 65 * 60000);
  entries.push({
    id: 'seed-today-recent-sleep',
    babyId,
    type: 'sleep',
    startTime: recentSleepStart.toISOString(),
    endTime: recentSleepEnd.toISOString(),
    durationSeconds: 65 * 60,
    quality: 'deep',
    location: 'Berço',
  });

  return entries.sort(
    (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
  );
}
