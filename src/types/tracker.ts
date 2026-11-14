export type EntryType = 'feeding' | 'sleep';

export type BreastSide = 'left' | 'right' | 'both' | 'bottle';

export type SleepQuality = 'calm' | 'restless' | 'deep';

export interface BabyProfile {
  id: string;
  name: string;
  birthDate: string; // YYYY-MM-DD
  dailyFeedingGoalCount: number;
  dailySleepGoalMinutes: number;
}

export interface FeedingEntry {
  id: string;
  babyId?: string;
  type: 'feeding';
  startTime: string; // ISO string
  endTime: string; // ISO string
  durationSeconds: number;
  side: BreastSide;
  amountMl?: number;
  notes?: string;
}

export interface SleepEntry {
  id: string;
  babyId?: string;
  type: 'sleep';
  startTime: string; // ISO string
  endTime: string; // ISO string
  durationSeconds: number;
  quality?: SleepQuality;
  location?: string;
  notes?: string;
}

export type TrackerEntry = FeedingEntry | SleepEntry;

export interface ActiveTimer {
  type: EntryType;
  startedAt: number; // epoch ms
  accumulatedMs: number;
  isPaused: boolean;
  side: BreastSide;
  amountMl?: number;
  sleepQuality?: SleepQuality;
}

export type ReminderMode = 'smart' | 'fixed';

export interface ReminderRule {
  id: string;
  type: EntryType;
  enabled: boolean;
  mode: ReminderMode;
  intervalMinutes: number; // baseline interval (feeding) or wake-window (sleep)
  advanceAlertMinutes: number; // warn X min before due
  quietHoursEnabled: boolean;
  quietHoursStart: string; // HH:mm
  quietHoursEnd: string; // HH:mm
  soundEnabled: boolean;
  lastNotifiedForEventId?: string;
}

export interface SmartPrediction {
  ruleId: string;
  type: EntryType;
  enabled: boolean;
  dueAt: number | null; // epoch ms
  minutesRemaining: number | null; // negative if overdue
  effectiveIntervalMinutes: number;
  historicalAvgMinutes: number | null;
  status: 'disabled' | 'no-data' | 'ok' | 'soon' | 'overdue' | 'quiet';
  rationale: string;
  lastEventEnd: number | null;
  lastEventId: string | null;
}

export interface DaySummary {
  dateKey: string; // YYYY-MM-DD local
  feedingCount: number;
  feedingMinutes: number;
  bottleMl: number;
  sleepCount: number;
  sleepMinutes: number;
  longestSleepMinutes: number;
  lastBreastSide: BreastSide | null;
}

export interface DailyTrendPoint {
  dateKey: string;
  label: string; // e.g., "14/11"
  shortWeekday: string; // e.g., "Sáb"
  feedingMinutes: number;
  feedingCount: number;
  sleepMinutes: number;
  sleepHours: number;
}

export interface RhythmBlock {
  id: string;
  type: EntryType;
  startMinuteOfDay: number; // 0..1440
  endMinuteOfDay: number; // 0..1440
  label: string;
}

export interface ParsedImportRow {
  rowNumber: number;
  status: 'valid' | 'duplicate' | 'error';
  errorReason?: string;
  entry?: TrackerEntry;
  rawSummary: string;
}

export interface ImportPreviewResult {
  totalRows: number;
  validCount: number;
  duplicateCount: number;
  errorCount: number;
  rows: ParsedImportRow[];
}
