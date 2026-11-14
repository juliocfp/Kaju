import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActiveTimer,
  BabyProfile,
  BreastSide,
  EntryType,
  ReminderRule,
  SmartPrediction,
  TrackerEntry,
} from '../types/tracker';
import {
  computeSmartReminder,
  formatDurationHuman,
  suggestNextBreastSide,
} from '../utils/trackerLogic';
import {
  createSeedEntries,
  DEFAULT_BABY_PROFILE,
  DEFAULT_REMINDER_RULES,
} from '../utils/seedData';

const STORAGE_KEYS = {
  entries: 'ninho_entries_v1',
  timer: 'ninho_active_timer_v1',
  reminders: 'ninho_reminders_v1',
  profile: 'ninho_baby_profile_v1',
  babies: 'kaju_babies_v1',
  activeBabyId: 'kaju_active_baby_id_v1',
  darkMode: 'ninho_dark_mode_v1',
};

export interface InAppNotification {
  id: string;
  title: string;
  body: string;
  type: EntryType | 'info';
  createdAt: number;
}

function readStorage<T>(key: string, fallback: () => T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback();
    return JSON.parse(raw) as T;
  } catch {
    return fallback();
  }
}

export function useTrackerStore() {
  const [entries, setEntries] = useState<TrackerEntry[]>(() =>
    readStorage<TrackerEntry[]>(STORAGE_KEYS.entries, () => createSeedEntries())
  );
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(() =>
    readStorage<ActiveTimer | null>(STORAGE_KEYS.timer, () => null)
  );
  const [reminderRules, setReminderRules] = useState<ReminderRule[]>(() =>
    readStorage<ReminderRule[]>(STORAGE_KEYS.reminders, () => DEFAULT_REMINDER_RULES)
  );

  const [babies, setBabies] = useState<BabyProfile[]>(() => {
    const storedBabies = readStorage<BabyProfile[] | null>(STORAGE_KEYS.babies, () => null);
    if (storedBabies && storedBabies.length > 0) return storedBabies;
    const legacy = readStorage<Partial<BabyProfile> | null>(STORAGE_KEYS.profile, () => null);
    if (legacy && legacy.name) {
      return [{ ...DEFAULT_BABY_PROFILE, ...legacy, id: legacy.id || DEFAULT_BABY_PROFILE.id }];
    }
    return [DEFAULT_BABY_PROFILE];
  });

  const [activeBabyId, setActiveBabyId] = useState<string>(() =>
    readStorage<string>(STORAGE_KEYS.activeBabyId, () => DEFAULT_BABY_PROFILE.id)
  );

  const [darkMode, setDarkMode] = useState<boolean>(() =>
    readStorage<boolean>(STORAGE_KEYS.darkMode, () => false)
  );

  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    () => {
      try {
        return typeof Notification !== 'undefined' ? Notification.permission : 'default';
      } catch {
        return 'default';
      }
    }
  );
  const [bannerAlert, setBannerAlert] = useState<InAppNotification | null>(null);

  const babyProfile = useMemo(() => {
    return babies.find((b) => b.id === activeBabyId) ?? babies[0] ?? DEFAULT_BABY_PROFILE;
  }, [babies, activeBabyId]);

  const babyEntries = useMemo(() => {
    const firstId = babies[0]?.id ?? DEFAULT_BABY_PROFILE.id;
    return entries.filter((e) => (e.babyId ? e.babyId === babyProfile.id : babyProfile.id === firstId));
  }, [entries, babies, babyProfile.id]);

  // Sync dark mode class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(STORAGE_KEYS.darkMode, JSON.stringify(darkMode));
    } catch {
      // ignore storage errors
    }
  }, [darkMode]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.entries, JSON.stringify(entries));
    } catch {
      // ignore
    }
  }, [entries]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.timer, JSON.stringify(activeTimer));
    } catch {
      // ignore
    }
  }, [activeTimer]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.reminders, JSON.stringify(reminderRules));
    } catch {
      // ignore
    }
  }, [reminderRules]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.babies, JSON.stringify(babies));
      localStorage.setItem(STORAGE_KEYS.activeBabyId, JSON.stringify(babyProfile.id));
    } catch {
      // ignore
    }
  }, [babies, babyProfile.id]);

  // Tick every second if a timer is running, otherwise every 15s for smart countdowns
  useEffect(() => {
    const intervalMs = activeTimer && !activeTimer.isPaused ? 1000 : 15000;
    const id = window.setInterval(() => {
      setNowMs(Date.now());
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [activeTimer]);

  const predictions: SmartPrediction[] = useMemo(() => {
    return reminderRules.map((rule) => computeSmartReminder(rule, babyEntries, nowMs));
  }, [reminderRules, babyEntries, nowMs]);

  const triggerSystemNotification = useCallback(
    (title: string, body: string, type: EntryType | 'info' = 'info') => {
      setBannerAlert({
        id: `notif-${Date.now()}`,
        title,
        body,
        type,
        createdAt: Date.now(),
      });

      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        try {
          new Notification(title, {
            body,
            icon: `${import.meta.env.BASE_URL}pwa-192x192.png`,
          });
        } catch {
          // ignore if Notification constructor blocked in embedded iframe
        }
      }
    },
    []
  );

  // Check if any enabled reminder became due outside quiet hours
  useEffect(() => {
    predictions.forEach((pred) => {
      if (!pred.enabled || !pred.lastEventId) return;
      if (pred.status !== 'overdue' && pred.status !== 'soon') return;
      const rule = reminderRules.find((r) => r.id === pred.ruleId);
      if (!rule || rule.lastNotifiedForEventId === pred.lastEventId) return;

      if (
        pred.minutesRemaining !== null &&
        pred.minutesRemaining <= rule.advanceAlertMinutes &&
        pred.minutesRemaining >= -20
      ) {
        const title =
          pred.type === 'feeding'
            ? `Hora próxima da mamada · ${babyProfile.name}`
            : `Janela de sono chegando · ${babyProfile.name}`;
        const body =
          pred.minutesRemaining <= 0
            ? `Já passou do horário previsto (${pred.rationale}).`
            : `Previsto em ${formatDurationHuman(pred.minutesRemaining)} (${pred.rationale}).`;

        triggerSystemNotification(title, body, pred.type);
        setReminderRules((prev) =>
          prev.map((r) =>
            r.id === rule.id ? { ...r, lastNotifiedForEventId: pred.lastEventId ?? undefined } : r
          )
        );
      }
    });
  }, [predictions, reminderRules, babyProfile.name, triggerSystemNotification]);

  const requestNotificationPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') {
      triggerSystemNotification(
        'Notificações no App Ativadas',
        'Seu navegador atual não suporta alertas em segundo plano, mas os alertas inteligentes aparecerão aqui no Kaju.',
        'info'
      );
      return;
    }
    try {
      const res = await Notification.requestPermission();
      setNotificationPermission(res);
      if (res === 'granted') {
        triggerSystemNotification(
          'Alertas inteligentes ativados',
          `Você receberá lembretes de amamentação e sono para ${babyProfile.name}.`,
          'info'
        );
      }
    } catch {
      // ignore
    }
  }, [babyProfile.name, triggerSystemNotification]);

  const startTimer = useCallback(
    (type: EntryType, side?: BreastSide) => {
      const chosenSide = side ?? suggestNextBreastSide(babyEntries);
      setActiveTimer({
        type,
        startedAt: Date.now(),
        accumulatedMs: 0,
        isPaused: false,
        side: chosenSide,
        sleepQuality: 'calm',
      });
      setNowMs(Date.now());
    },
    [babyEntries]
  );

  const togglePauseTimer = useCallback(() => {
    setActiveTimer((prev) => {
      if (!prev) return null;
      const now = Date.now();
      if (prev.isPaused) {
        return { ...prev, isPaused: false, startedAt: now };
      }
      return {
        ...prev,
        isPaused: true,
        accumulatedMs: prev.accumulatedMs + (now - prev.startedAt),
      };
    });
    setNowMs(Date.now());
  }, []);

  const updateActiveTimerMeta = useCallback(
    (patch: Partial<Pick<ActiveTimer, 'side' | 'amountMl' | 'sleepQuality'>>) => {
      setActiveTimer((prev) => (prev ? { ...prev, ...patch } : null));
    },
    []
  );

  const cancelTimer = useCallback(() => {
    setActiveTimer(null);
  }, []);

  const finishAndSaveTimer = useCallback(
    (notes?: string) => {
      if (!activeTimer) return null;
      const now = Date.now();
      const totalMs = activeTimer.isPaused
        ? activeTimer.accumulatedMs
        : activeTimer.accumulatedMs + (now - activeTimer.startedAt);
      const durationSeconds = Math.max(60, Math.round(totalMs / 1000));
      const endTime = new Date(now).toISOString();
      const startTime = new Date(now - durationSeconds * 1000).toISOString();

      const newEntry: TrackerEntry =
        activeTimer.type === 'feeding'
          ? {
              id: `entry-${now}`,
              babyId: babyProfile.id,
              type: 'feeding',
              startTime,
              endTime,
              durationSeconds,
              side: activeTimer.side,
              amountMl: activeTimer.amountMl,
              notes: notes?.trim() || undefined,
            }
          : {
              id: `entry-${now}`,
              babyId: babyProfile.id,
              type: 'sleep',
              startTime,
              endTime,
              durationSeconds,
              quality: activeTimer.sleepQuality ?? 'calm',
              location: 'Berço',
              notes: notes?.trim() || undefined,
            };

      setEntries((prev) =>
        [newEntry, ...prev].sort(
          (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
        )
      );
      setActiveTimer(null);
      return newEntry;
    },
    [activeTimer, babyProfile.id]
  );

  const addOrUpdateEntry = useCallback(
    (entry: TrackerEntry) => {
      const tagged: TrackerEntry = {
        ...entry,
        babyId: entry.babyId ?? babyProfile.id,
      };
      setEntries((prev) => {
        const exists = prev.some((e) => e.id === tagged.id);
        const next = exists
          ? prev.map((e) => (e.id === tagged.id ? tagged : e))
          : [tagged, ...prev];
        return next.sort(
          (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
        );
      });
    },
    [babyProfile.id]
  );

  const deleteEntry = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const importEntries = useCallback(
    (newEntries: TrackerEntry[]) => {
      if (newEntries.length === 0) return;
      setEntries((prev) => {
        const map = new Map<string, TrackerEntry>();
        prev.forEach((e) => map.set(e.id, e));
        newEntries.forEach((e) => map.set(e.id, { ...e, babyId: babyProfile.id }));
        return Array.from(map.values()).sort(
          (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
        );
      });
    },
    [babyProfile.id]
  );

  const saveBaby = useCallback((profile: BabyProfile) => {
    setBabies((prev) => {
      const exists = prev.some((b) => b.id === profile.id);
      return exists ? prev.map((b) => (b.id === profile.id ? profile : b)) : [...prev, profile];
    });
    setActiveBabyId(profile.id);
  }, []);

  const deleteBaby = useCallback(
    (id: string) => {
      setBabies((prev) => {
        if (prev.length <= 1) return prev;
        const next = prev.filter((b) => b.id !== id);
        if (activeBabyId === id && next[0]) {
          setActiveBabyId(next[0].id);
        }
        return next;
      });
      setEntries((prev) => prev.filter((e) => e.babyId !== id));
    },
    [activeBabyId]
  );

  const updateReminderRule = useCallback((id: string, patch: Partial<ReminderRule>) => {
    setReminderRules((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }, []);

  const resetToDemoData = useCallback(() => {
    setBabies([DEFAULT_BABY_PROFILE]);
    setActiveBabyId(DEFAULT_BABY_PROFILE.id);
    setEntries(createSeedEntries(new Date(), DEFAULT_BABY_PROFILE.id));
    setReminderRules(DEFAULT_REMINDER_RULES);
    setActiveTimer(null);
  }, []);

  const clearAllEntries = useCallback(() => {
    setEntries((prev) => prev.filter((e) => e.babyId && e.babyId !== babyProfile.id));
    setActiveTimer(null);
  }, [babyProfile.id]);

  const activeElapsedSeconds = useMemo(() => {
    if (!activeTimer) return 0;
    const ms = activeTimer.isPaused
      ? activeTimer.accumulatedMs
      : activeTimer.accumulatedMs + Math.max(0, nowMs - activeTimer.startedAt);
    return Math.floor(ms / 1000);
  }, [activeTimer, nowMs]);

  return {
    entries: babyEntries,
    babies,
    activeBabyId: babyProfile.id,
    activeTimer,
    activeElapsedSeconds,
    reminderRules,
    predictions,
    babyProfile,
    darkMode,
    nowMs,
    notificationPermission,
    bannerAlert,
    setDarkMode,
    selectBaby: setActiveBabyId,
    saveBaby,
    deleteBaby,
    setBabyProfile: saveBaby,
    setBannerAlert,
    startTimer,
    togglePauseTimer,
    updateActiveTimerMeta,
    cancelTimer,
    finishAndSaveTimer,
    addOrUpdateEntry,
    deleteEntry,
    importEntries,
    updateReminderRule,
    requestNotificationPermission,
    triggerSystemNotification,
    resetToDemoData,
    clearAllEntries,
  };
}
