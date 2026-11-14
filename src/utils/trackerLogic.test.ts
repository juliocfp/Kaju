import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ageFromBirthDate,
  birthDateFromAge,
  compute24HourRhythm,
  computeDailyTrend,
  computeDayStats,
  computeSmartReminder,
  formatDurationHuman,
  formatTimerClock,
  isTimeInQuietHours,
  suggestNextBreastSide,
  toLocalDateKey,
} from './trackerLogic';
import { ReminderRule, TrackerEntry } from '../types/tracker';

test('birthDateFromAge and ageFromBirthDate convert baby age accurately', () => {
  const ref = new Date(2026, 10, 14, 12, 0, 0);
  const birth = birthDateFromAge(3, 5, ref);
  const parsed = ageFromBirthDate(birth, ref);
  assert.equal(parsed.months, 3);
  assert.equal(parsed.days, 5);
  assert.equal(parsed.label, '3 meses e 5d');

  const exact2 = ageFromBirthDate(birthDateFromAge(2, 0, ref), ref);
  assert.equal(exact2.label, '2 meses');

  const newborn = ageFromBirthDate('2026-11-14', ref);
  assert.equal(newborn.label, 'Recém-nascido');
});

test('formatTimerClock and formatDurationHuman format durations accurately', () => {
  assert.equal(formatTimerClock(0), '00:00');
  assert.equal(formatTimerClock(125), '02:05');
  assert.equal(formatTimerClock(3661), '01:01:01');
  assert.equal(formatDurationHuman(45), '45 min');
  assert.equal(formatDurationHuman(120), '2h');
  assert.equal(formatDurationHuman(155), '2h 35m');
});

test('suggestNextBreastSide alternates between left and right', () => {
  const entries: TrackerEntry[] = [
    {
      id: '1',
      type: 'feeding',
      startTime: new Date(2026, 10, 14, 6, 0).toISOString(),
      endTime: new Date(2026, 10, 14, 6, 20).toISOString(),
      durationSeconds: 1200,
      side: 'left',
    },
    {
      id: '2',
      type: 'feeding',
      startTime: new Date(2026, 10, 14, 8, 30).toISOString(),
      endTime: new Date(2026, 10, 14, 8, 45).toISOString(),
      durationSeconds: 900,
      side: 'bottle',
      amountMl: 100,
    },
  ];
  assert.equal(suggestNextBreastSide(entries), 'right');
});

test('computeDayStats aggregates feeding, bottle ml, and sleep metrics for a day', () => {
  const entries: TrackerEntry[] = [
    {
      id: 'f1',
      type: 'feeding',
      startTime: new Date(2026, 10, 14, 7, 0).toISOString(),
      endTime: new Date(2026, 10, 14, 7, 20).toISOString(),
      durationSeconds: 1200,
      side: 'left',
    },
    {
      id: 'f2',
      type: 'feeding',
      startTime: new Date(2026, 10, 14, 10, 0).toISOString(),
      endTime: new Date(2026, 10, 14, 10, 15).toISOString(),
      durationSeconds: 900,
      side: 'bottle',
      amountMl: 120,
    },
    {
      id: 's1',
      type: 'sleep',
      startTime: new Date(2026, 10, 14, 8, 0).toISOString(),
      endTime: new Date(2026, 10, 14, 9, 30).toISOString(),
      durationSeconds: 5400,
    },
  ];
  const stats = computeDayStats(entries, '2026-11-14');
  assert.equal(stats.feedingCount, 2);
  assert.equal(stats.feedingMinutes, 35);
  assert.equal(stats.bottleMl, 120);
  assert.equal(stats.sleepCount, 1);
  assert.equal(stats.sleepMinutes, 90);
  assert.equal(stats.longestSleepMinutes, 90);
  assert.equal(stats.lastBreastSide, 'bottle');
});

test('isTimeInQuietHours handles overnight wrapping ranges', () => {
  const lateNight = new Date(2026, 10, 14, 23, 30).getTime();
  const earlyMorning = new Date(2026, 10, 14, 4, 15).getTime();
  const noon = new Date(2026, 10, 14, 12, 0).getTime();

  assert.equal(isTimeInQuietHours(lateNight, '22:30', '06:00'), true);
  assert.equal(isTimeInQuietHours(earlyMorning, '22:30', '06:00'), true);
  assert.equal(isTimeInQuietHours(noon, '22:30', '06:00'), false);
});

test('computeSmartReminder adapts to recent intervals in smart mode and respects fixed mode', () => {
  const base = new Date(2026, 10, 14, 6, 0, 0, 0);
  const makeFeed = (id: string, startMin: number, durMin: number): TrackerEntry => {
    const s = new Date(base.getTime() + startMin * 60000);
    const e = new Date(s.getTime() + durMin * 60000);
    return {
      id,
      type: 'feeding',
      startTime: s.toISOString(),
      endTime: e.toISOString(),
      durationSeconds: durMin * 60,
      side: 'left',
    };
  };

  // Gaps of 120 min each between end and next start
  const entries = [
    makeFeed('f1', 0, 20), // ends +20
    makeFeed('f2', 140, 20), // ends +160 (gap 120)
    makeFeed('f3', 280, 20), // ends +300 (gap 120)
  ];

  const smartRule: ReminderRule = {
    id: 'r1',
    type: 'feeding',
    enabled: true,
    mode: 'smart',
    intervalMinutes: 180,
    advanceAlertMinutes: 15,
    quietHoursEnabled: false,
    quietHoursStart: '23:00',
    quietHoursEnd: '06:00',
    soundEnabled: true,
  };

  // Now = +435m (135m after f3 end). Blended interval = round(120*0.65 + 180*0.35) = 141m
  const nowSmart = base.getTime() + 435 * 60000;
  const smartPred = computeSmartReminder(smartRule, entries, nowSmart);
  assert.equal(smartPred.effectiveIntervalMinutes, 141);
  assert.equal(smartPred.minutesRemaining, 6);
  assert.equal(smartPred.status, 'soon');

  const fixedRule: ReminderRule = { ...smartRule, mode: 'fixed' };
  const fixedPred = computeSmartReminder(fixedRule, entries, nowSmart);
  assert.equal(fixedPred.effectiveIntervalMinutes, 180);
  assert.equal(fixedPred.minutesRemaining, 45);
  assert.equal(fixedPred.status, 'ok');
});

test('computeDailyTrend and compute24HourRhythm return expected buckets', () => {
  const ref = new Date(2026, 10, 14, 12, 0, 0);
  const key = toLocalDateKey(ref);
  const entries: TrackerEntry[] = [
    {
      id: 's1',
      type: 'sleep',
      startTime: new Date(2026, 10, 14, 1, 0).toISOString(),
      endTime: new Date(2026, 10, 14, 3, 0).toISOString(),
      durationSeconds: 7200,
    },
  ];
  const trend = computeDailyTrend(entries, 7, ref);
  assert.equal(trend.length, 7);
  assert.equal(trend[6].sleepHours, 2);

  const blocks = compute24HourRhythm(entries, key);
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].startMinuteOfDay, 60);
  assert.equal(blocks[0].endMinuteOfDay, 180);
});
