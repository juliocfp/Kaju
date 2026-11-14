import {
  BreastSide,
  DailyTrendPoint,
  DaySummary,
  EntryType,
  FeedingEntry,
  ReminderRule,
  RhythmBlock,
  SleepEntry,
  SmartPrediction,
  TrackerEntry,
} from '../types/tracker';

export function pad2(n: number): string {
  return String(Math.floor(Math.max(0, n))).padStart(2, '0');
}

export function toLocalDateKey(dateInput: Date | number | string): string {
  const d = new Date(dateInput);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function birthDateFromAge(
  months: number,
  days: number = 0,
  referenceDate: Date = new Date()
): string {
  const d = new Date(referenceDate);
  d.setHours(12, 0, 0, 0);
  const safeMonths = Math.max(0, Math.floor(months));
  const safeDays = Math.max(0, Math.floor(days));
  d.setMonth(d.getMonth() - safeMonths);
  d.setDate(d.getDate() - safeDays);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function ageFromBirthDate(
  birthDate: string,
  referenceDate: Date = new Date()
): { months: number; days: number; label: string } {
  const parts = birthDate.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) {
    return { months: 0, days: 0, label: '' };
  }
  const birth = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0, 0);
  const ref = new Date(referenceDate);
  ref.setHours(12, 0, 0, 0);

  if (Number.isNaN(birth.getTime()) || birth.getTime() > ref.getTime()) {
    return { months: 0, days: 0, label: 'Recém-nascido' };
  }

  let months =
    (ref.getFullYear() - birth.getFullYear()) * 12 + (ref.getMonth() - birth.getMonth());
  let anchor = new Date(birth);
  anchor.setMonth(anchor.getMonth() + months);

  if (anchor.getTime() > ref.getTime()) {
    months = Math.max(0, months - 1);
    anchor = new Date(birth);
    anchor.setMonth(anchor.getMonth() + months);
  }

  const days = Math.max(0, Math.round((ref.getTime() - anchor.getTime()) / 86400000));

  if (months === 0) {
    if (days === 0) return { months: 0, days: 0, label: 'Recém-nascido' };
    return { months: 0, days, label: `${days} ${days === 1 ? 'dia' : 'dias'}` };
  }

  if (months < 12) {
    const label =
      days > 0
        ? `${months} ${months === 1 ? 'mês' : 'meses'} e ${days}d`
        : `${months} ${months === 1 ? 'mês' : 'meses'}`;
    return { months, days, label };
  }

  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  const label =
    remMonths > 0
      ? `${years} ${years === 1 ? 'ano' : 'anos'} e ${remMonths}m`
      : `${years} ${years === 1 ? 'ano' : 'anos'}`;
  return { months, days, label };
}

export function formatTimerClock(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(clamped / 3600);
  const m = Math.floor((clamped % 3600) / 60);
  const s = clamped % 60;
  if (h > 0) {
    return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
  }
  return `${pad2(m)}:${pad2(s)}`;
}

export function formatDurationHuman(totalMinutes: number): string {
  const mins = Math.max(0, Math.round(totalMinutes));
  if (mins < 60) {
    return `${mins} min`;
  }
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function formatTimeShort(isoOrMs: string | number): string {
  const d = new Date(isoOrMs);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function formatRelativeCountdown(minutesRemaining: number): string {
  const abs = Math.abs(Math.round(minutesRemaining));
  if (abs === 0) return 'agora';
  const formatted = formatDurationHuman(abs);
  if (minutesRemaining < 0) {
    return `atrasado há ${formatted}`;
  }
  return `em ${formatted}`;
}

export function sideLabelPt(side: BreastSide): string {
  switch (side) {
    case 'left':
      return 'Seio Esquerdo';
    case 'right':
      return 'Seio Direito';
    case 'both':
      return 'Ambos os Seios';
    case 'bottle':
      return 'Mamadeira';
  }
}

export function sideShortLabelPt(side: BreastSide): string {
  switch (side) {
    case 'left':
      return 'Esquerdo';
    case 'right':
      return 'Direito';
    case 'both':
      return 'Ambos';
    case 'bottle':
      return 'Mamadeira';
  }
}

export function suggestNextBreastSide(entries: TrackerEntry[]): BreastSide {
  const feedings = entries
    .filter((e): e is FeedingEntry => e.type === 'feeding')
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

  const lastBreast = feedings.find((f) => f.side === 'left' || f.side === 'right');
  if (!lastBreast) return 'left';
  return lastBreast.side === 'left' ? 'right' : 'left';
}

export function computeDayStats(entries: TrackerEntry[], dateKey: string): DaySummary {
  const dayFeedings: FeedingEntry[] = [];
  const daySleeps: SleepEntry[] = [];

  for (const entry of entries) {
    const entryDay = toLocalDateKey(entry.startTime);
    if (entryDay !== dateKey) continue;
    if (entry.type === 'feeding') {
      dayFeedings.push(entry);
    } else {
      daySleeps.push(entry);
    }
  }

  dayFeedings.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

  const feedingSeconds = dayFeedings.reduce((acc, f) => acc + f.durationSeconds, 0);
  const bottleMl = dayFeedings.reduce((acc, f) => acc + (f.amountMl ?? 0), 0);
  const sleepSeconds = daySleeps.reduce((acc, s) => acc + s.durationSeconds, 0);
  const longestSleepSeconds = daySleeps.reduce((max, s) => Math.max(max, s.durationSeconds), 0);

  return {
    dateKey,
    feedingCount: dayFeedings.length,
    feedingMinutes: Math.round(feedingSeconds / 60),
    bottleMl,
    sleepCount: daySleeps.length,
    sleepMinutes: Math.round(sleepSeconds / 60),
    longestSleepMinutes: Math.round(longestSleepSeconds / 60),
    lastBreastSide: dayFeedings[0]?.side ?? null,
  };
}

const WEEKDAYS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function computeDailyTrend(
  entries: TrackerEntry[],
  days: number,
  referenceDate: Date = new Date()
): DailyTrendPoint[] {
  const points: DailyTrendPoint[] = [];
  const base = new Date(referenceDate);
  base.setHours(12, 0, 0, 0);

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    const key = toLocalDateKey(d);
    const stats = computeDayStats(entries, key);
    points.push({
      dateKey: key,
      label: `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`,
      shortWeekday: WEEKDAYS_PT[d.getDay()],
      feedingMinutes: stats.feedingMinutes,
      feedingCount: stats.feedingCount,
      sleepMinutes: stats.sleepMinutes,
      sleepHours: Number((stats.sleepMinutes / 60).toFixed(1)),
    });
  }

  return points;
}

export function compute24HourRhythm(entries: TrackerEntry[], dateKey: string): RhythmBlock[] {
  const [year, month, day] = dateKey.split('-').map(Number);
  const dayStart = new Date(year, month - 1, day, 0, 0, 0, 0).getTime();
  const dayEnd = dayStart + 24 * 60 * 60 * 1000;

  const blocks: RhythmBlock[] = [];

  for (const entry of entries) {
    const startMs = new Date(entry.startTime).getTime();
    const endMs = new Date(entry.endTime).getTime();
    if (endMs <= dayStart || startMs >= dayEnd) continue;

    const clampedStart = Math.max(startMs, dayStart);
    const clampedEnd = Math.min(endMs, dayEnd);
    const startMin = (clampedStart - dayStart) / 60000;
    const endMin = Math.max(startMin + 6, (clampedEnd - dayStart) / 60000); // minimum visual slice

    blocks.push({
      id: entry.id,
      type: entry.type,
      startMinuteOfDay: startMin,
      endMinuteOfDay: Math.min(1440, endMin),
      label:
        entry.type === 'feeding'
          ? `${sideShortLabelPt(entry.side)} · ${Math.round(entry.durationSeconds / 60)} min`
          : `Sono · ${formatDurationHuman(entry.durationSeconds / 60)}`,
    });
  }

  return blocks.sort((a, b) => a.startMinuteOfDay - b.startMinuteOfDay);
}

export function isTimeInQuietHours(
  epochMs: number,
  quietStartHHMM: string,
  quietEndHHMM: string
): boolean {
  const d = new Date(epochMs);
  const currentMinutes = d.getHours() * 60 + d.getMinutes();

  const [sh, sm] = quietStartHHMM.split(':').map(Number);
  const [eh, em] = quietEndHHMM.split(':').map(Number);
  const startMin = (sh || 0) * 60 + (sm || 0);
  const endMin = (eh || 0) * 60 + (em || 0);

  if (startMin === endMin) return false;
  if (startMin < endMin) {
    return currentMinutes >= startMin && currentMinutes < endMin;
  }
  // Wraps past midnight (e.g. 22:00 to 06:30)
  return currentMinutes >= startMin || currentMinutes < endMin;
}

export function computeHistoricalIntervalMinutes(
  entries: TrackerEntry[],
  type: EntryType
): number | null {
  const filtered = entries
    .filter((e) => e.type === type)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  if (filtered.length < 2) return null;

  const intervals: number[] = [];
  for (let i = 1; i < filtered.length; i++) {
    const prevEnd = new Date(filtered[i - 1].endTime).getTime();
    const currStart = new Date(filtered[i].startTime).getTime();
    const gapMin = (currStart - prevEnd) / 60000;

    // Ignore unrealistic gaps (e.g., > 10h overnight gap for daytime rhythm or overlapping < 15 min)
    const maxRealisticGap = type === 'feeding' ? 420 : 360;
    if (gapMin >= 20 && gapMin <= maxRealisticGap) {
      intervals.push(gapMin);
    }
  }

  if (intervals.length === 0) return null;

  // Weighted average favoring the most recent 6 intervals
  const recent = intervals.slice(-6);
  let weightedSum = 0;
  let weightTotal = 0;
  recent.forEach((val, idx) => {
    const w = idx + 1;
    weightedSum += val * w;
    weightTotal += w;
  });

  return Math.round(weightedSum / weightTotal);
}

export function computeSmartReminder(
  rule: ReminderRule,
  entries: TrackerEntry[],
  nowMs: number = Date.now()
): SmartPrediction {
  if (!rule.enabled) {
    return {
      ruleId: rule.id,
      type: rule.type,
      enabled: false,
      dueAt: null,
      minutesRemaining: null,
      effectiveIntervalMinutes: rule.intervalMinutes,
      historicalAvgMinutes: null,
      status: 'disabled',
      rationale: 'Lembrete desativado',
      lastEventEnd: null,
      lastEventId: null,
    };
  }

  const sameType = entries
    .filter((e) => e.type === rule.type)
    .sort((a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime());

  const latest = sameType[0];
  if (!latest) {
    return {
      ruleId: rule.id,
      type: rule.type,
      enabled: true,
      dueAt: null,
      minutesRemaining: null,
      effectiveIntervalMinutes: rule.intervalMinutes,
      historicalAvgMinutes: null,
      status: 'no-data',
      rationale: 'Registre o primeiro evento para iniciar a previsão',
      lastEventEnd: null,
      lastEventId: null,
    };
  }

  const historicalAvg = computeHistoricalIntervalMinutes(entries, rule.type);

  let effectiveInterval = rule.intervalMinutes;
  let rationale =
    rule.type === 'feeding'
      ? `Intervalo fixo de ${formatDurationHuman(rule.intervalMinutes)} após a última mamada`
      : `Janela de sono fixa de ${formatDurationHuman(rule.intervalMinutes)} após acordar`;

  if (rule.mode === 'smart' && historicalAvg !== null) {
    // Blend 65% recent baby rhythm + 35% parent baseline, clamped safely
    const blended = Math.round(historicalAvg * 0.65 + rule.intervalMinutes * 0.35);
    const minBound = rule.type === 'feeding' ? 90 : 45;
    const maxBound = rule.type === 'feeding' ? 270 : 240;
    effectiveInterval = Math.max(minBound, Math.min(maxBound, blended));
    rationale =
      rule.type === 'feeding'
        ? `Adaptado ao ritmo recente (${formatDurationHuman(historicalAvg)} em média)`
        : `Janela ajustada pelo histórico (${formatDurationHuman(historicalAvg)} acordado)`;
  } else if (rule.mode === 'smart' && historicalAvg === null) {
    rationale = `Usando sua meta base de ${formatDurationHuman(rule.intervalMinutes)} (coletando histórico)`;
  }

  const lastEventEnd = new Date(latest.endTime).getTime();
  const dueAt = lastEventEnd + effectiveInterval * 60000;
  const minutesRemaining = Math.round((dueAt - nowMs) / 60000);

  const inQuiet =
    rule.quietHoursEnabled &&
    isTimeInQuietHours(nowMs, rule.quietHoursStart, rule.quietHoursEnd);

  let status: SmartPrediction['status'] = 'ok';
  if (inQuiet) {
    status = 'quiet';
  } else if (minutesRemaining <= 0) {
    status = 'overdue';
  } else if (minutesRemaining <= rule.advanceAlertMinutes) {
    status = 'soon';
  }

  return {
    ruleId: rule.id,
    type: rule.type,
    enabled: true,
    dueAt,
    minutesRemaining,
    effectiveIntervalMinutes: effectiveInterval,
    historicalAvgMinutes: historicalAvg,
    status,
    rationale,
    lastEventEnd,
    lastEventId: latest.id,
  };
}
