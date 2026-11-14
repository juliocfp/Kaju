import React, { useEffect, useMemo, useState } from 'react';
import {
  Baby,
  Bell,
  Clock,
  Moon,
  Pause,
  Pencil,
  Play,
  Plus,
  Square,
  Trash2,
  X,
} from 'lucide-react';
import {
  ActiveTimer,
  BabyProfile,
  BreastSide,
  EntryType,
  SmartPrediction,
  TrackerEntry,
} from '../types/tracker';
import {
  computeDayStats,
  formatDurationHuman,
  formatRelativeCountdown,
  formatTimeShort,
  formatTimerClock,
  pad2,
  sideLabelPt,
  sideShortLabelPt,
  suggestNextBreastSide,
  toLocalDateKey,
} from '../utils/trackerLogic';

interface TodayViewProps {
  entries: TrackerEntry[];
  babyProfile: BabyProfile;
  activeTimer: ActiveTimer | null;
  activeElapsedSeconds: number;
  predictions: SmartPrediction[];
  selectedDateKey: string;
  onSelectDateKey: (dateKey: string) => void;
  onStartTimer: (type: EntryType, side?: BreastSide) => void;
  onTogglePauseTimer: () => void;
  onUpdateActiveTimerMeta: (
    patch: Partial<Pick<ActiveTimer, 'side' | 'amountMl' | 'sleepQuality'>>
  ) => void;
  onCancelTimer: () => void;
  onFinishAndSaveTimer: (notes?: string) => void;
  onOpenNewModal: (type: EntryType) => void;
  onEditEntry: (entry: TrackerEntry) => void;
  onDeleteEntry: (id: string) => void;
  onOpenRemindersTab: () => void;
}

const WEEKDAY_INITIAL = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const ProgressRing: React.FC<{
  percent: number;
  colorClass: string;
  trackClass?: string;
}> = ({ percent, colorClass, trackClass = 'text-slate-200 dark:text-slate-800' }) => {
  const r = 20;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = c - (clamped / 100) * c;

  return (
    <svg className="w-12 h-12 -rotate-90 shrink-0" viewBox="0 0 48 48" aria-hidden="true">
      <circle
        cx="24"
        cy="24"
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        className={trackClass}
      />
      <circle
        cx="24"
        cy="24"
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        className={colorClass}
      />
    </svg>
  );
};

export const TodayView: React.FC<TodayViewProps> = ({
  entries,
  babyProfile,
  activeTimer,
  activeElapsedSeconds,
  predictions,
  selectedDateKey,
  onSelectDateKey,
  onStartTimer,
  onTogglePauseTimer,
  onUpdateActiveTimerMeta,
  onCancelTimer,
  onFinishAndSaveTimer,
  onOpenNewModal,
  onEditEntry,
  onDeleteEntry,
  onOpenRemindersTab,
}) => {
  const [selectedMode, setSelectedMode] = useState<EntryType>('feeding');
  const [timerNotes, setTimerNotes] = useState('');

  const suggestedSide = useMemo(() => suggestNextBreastSide(entries), [entries]);
  const [chosenSide, setChosenSide] = useState<BreastSide>(suggestedSide);

  useEffect(() => {
    if (!activeTimer) {
      setChosenSide(suggestedSide);
    }
  }, [suggestedSide, activeTimer]);

  const displayMode = activeTimer ? activeTimer.type : selectedMode;

  const dayStats = useMemo(
    () => computeDayStats(entries, selectedDateKey),
    [entries, selectedDateKey]
  );

  const dayEntries = useMemo(() => {
    return entries
      .filter((e) => toLocalDateKey(e.startTime) === selectedDateKey)
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  }, [entries, selectedDateKey]);

  // 7-day horizontal date strip ending today
  const dateChips = useMemo(() => {
    const today = new Date();
    const list: { key: string; weekday: string; dayNum: string; isToday: boolean }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      list.push({
        key: toLocalDateKey(d),
        weekday: WEEKDAY_INITIAL[d.getDay()],
        dayNum: pad2(d.getDate()),
        isToday: i === 0,
      });
    }
    return list;
  }, []);

  const feedingPred = predictions.find((p) => p.type === 'feeding');
  const sleepPred = predictions.find((p) => p.type === 'sleep');

  const feedingPct = Math.round(
    (dayStats.feedingCount / Math.max(1, babyProfile.dailyFeedingGoalCount)) * 100
  );
  const sleepPct = Math.round(
    (dayStats.sleepMinutes / Math.max(60, babyProfile.dailySleepGoalMinutes)) * 100
  );

  const handleSaveTimer = () => {
    onFinishAndSaveTimer(timerNotes);
    setTimerNotes('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Column (Desktop 5 cols): Active Timer Focal Anchor + Smart Reminders */}
      <div className="lg:col-span-5 space-y-5">
        {/* Live Timer Card */}
        <section
          aria-labelledby="timer-heading"
          className="rounded-3xl bg-white dark:bg-[#131A29] border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-sm"
        >
          <div className="flex items-center justify-between gap-3">
            <h2
              id="timer-heading"
              className="text-base font-semibold text-slate-900 dark:text-slate-100"
            >
              Cronômetro de Rotina
            </h2>
            <button
              type="button"
              onClick={() => onOpenNewModal(displayMode)}
              className="inline-flex items-center gap-1 min-h-[36px] px-2.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Registro manual</span>
            </button>
          </div>

          {/* Segmented Control (disabled switching if timer actively running) */}
          <div className="mt-4 grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80">
            <button
              type="button"
              disabled={!!activeTimer}
              onClick={() => setSelectedMode('feeding')}
              className={`min-h-[44px] flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                displayMode === 'feeding'
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-[#1E293B] dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              } ${activeTimer && displayMode !== 'feeding' ? 'opacity-45 cursor-not-allowed' : ''}`}
            >
              <Baby className="w-4 h-4 text-[#C85A32] dark:text-[#F08A65]" aria-hidden="true" />
              <span>Amamentação</span>
            </button>

            <button
              type="button"
              disabled={!!activeTimer}
              onClick={() => setSelectedMode('sleep')}
              className={`min-h-[44px] flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                displayMode === 'sleep'
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-[#1E293B] dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              } ${activeTimer && displayMode !== 'sleep' ? 'opacity-45 cursor-not-allowed' : ''}`}
            >
              <Moon className="w-4 h-4 text-[#434EC4] dark:text-[#818CF8]" aria-hidden="true" />
              <span>Sono</span>
            </button>
          </div>

          {/* Clock Display */}
          <div className="mt-6 text-center">
            <div
              data-testid="live-timer-clock"
              className="font-mono text-5xl sm:text-6xl font-semibold tracking-tight text-slate-900 dark:text-white tabular-nums"
            >
              {activeTimer ? formatTimerClock(activeElapsedSeconds) : '00:00'}
            </div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {activeTimer ? (
                <span>
                  {activeTimer.isPaused ? 'Pausado' : 'Em andamento'} · Início às{' '}
                  <span className="font-mono">{formatTimeShort(activeTimer.startedAt)}</span>
                  {activeTimer.type === 'feeding' && (
                    <> · {sideLabelPt(activeTimer.side)}</>
                  )}
                </span>
              ) : displayMode === 'feeding' ? (
                <span>Sugestão de revezamento: {sideLabelPt(suggestedSide)}</span>
              ) : (
                <span>Toque em iniciar quando o bebê adormecer</span>
              )}
            </p>
          </div>

          {/* Context Selectors: Breast Side or Sleep Quality */}
          {displayMode === 'feeding' && (
            <div className="mt-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(
                  [
                    ['left', 'Esquerdo'],
                    ['right', 'Direito'],
                    ['both', 'Ambos'],
                    ['bottle', 'Mamadeira'],
                  ] as const
                ).map(([val, label]) => {
                  const isSelected = activeTimer ? activeTimer.side === val : chosenSide === val;
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => {
                        setChosenSide(val);
                        if (activeTimer) {
                          onUpdateActiveTimerMeta({ side: val });
                        }
                      }}
                      className={`min-h-[44px] rounded-xl border px-2 text-xs font-medium transition-colors whitespace-nowrap ${
                        isSelected
                          ? 'border-[#C85A32] bg-[#C85A32]/10 text-[#A8431F] dark:border-[#F08A65] dark:bg-[#F08A65]/15 dark:text-[#F8B097]'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {(activeTimer?.side === 'bottle' || (!activeTimer && chosenSide === 'bottle')) && (
                <div className="mt-3 flex items-center gap-2">
                  <label
                    htmlFor="timer-bottle-ml"
                    className="text-xs font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap"
                  >
                    Volume (ml):
                  </label>
                  <input
                    id="timer-bottle-ml"
                    type="number"
                    min={1}
                    max={500}
                    placeholder="Ex: 110"
                    value={activeTimer?.amountMl ?? ''}
                    onChange={(e) => {
                      const num = Number(e.target.value);
                      onUpdateActiveTimerMeta({
                        amountMl: Number.isFinite(num) && num > 0 ? num : undefined,
                      });
                    }}
                    className="w-28 min-h-[40px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm font-mono text-slate-900 dark:text-slate-100"
                  />
                </div>
              )}
            </div>
          )}

          {activeTimer && (
            <div className="mt-4">
              <label htmlFor="timer-notes-input" className="sr-only">
                Observações do registro
              </label>
              <input
                id="timer-notes-input"
                type="text"
                value={timerNotes}
                onChange={(e) => setTimerNotes(e.target.value)}
                placeholder="Adicionar observação rápida (opcional)..."
                className="w-full min-h-[42px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/70 px-3.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
              />
            </div>
          )}

          {/* Primary Action Controls (48px+ Thumb Friendly) */}
          <div className="mt-5">
            {!activeTimer ? (
              <button
                type="button"
                onClick={() => onStartTimer(displayMode, chosenSide)}
                className={`w-full min-h-[48px] rounded-2xl text-sm font-semibold text-white flex items-center justify-center gap-2 shadow-sm active:scale-[0.99] transition-transform ${
                  displayMode === 'feeding'
                    ? 'bg-[#C85A32] hover:bg-[#B44D27] dark:bg-[#D96B43] dark:hover:bg-[#C85A32]'
                    : 'bg-[#434EC4] hover:bg-[#3741B0] dark:bg-[#5B66E0] dark:hover:bg-[#4B56D1]'
                }`}
              >
                <Play className="w-4 h-4 fill-current" aria-hidden="true" />
                <span>
                  {displayMode === 'feeding' ? 'Iniciar Amamentação' : 'Iniciar Sono'}
                </span>
              </button>
            ) : (
              <div className="grid grid-cols-12 gap-2">
                <button
                  type="button"
                  onClick={onTogglePauseTimer}
                  className="col-span-4 min-h-[48px] rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-100 flex items-center justify-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 whitespace-nowrap"
                >
                  {activeTimer.isPaused ? (
                    <>
                      <Play className="w-4 h-4" aria-hidden="true" />
                      <span>Retomar</span>
                    </>
                  ) : (
                    <>
                      <Pause className="w-4 h-4" aria-hidden="true" />
                      <span>Pausar</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleSaveTimer}
                  className="col-span-6 min-h-[48px] rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-xs sm:text-sm font-semibold text-white dark:text-slate-900 flex items-center justify-center gap-1.5 whitespace-nowrap"
                >
                  <Square className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                  <span>Finalizar e Salvar</span>
                </button>

                <button
                  type="button"
                  onClick={onCancelTimer}
                  aria-label="Descartar cronômetro"
                  className="col-span-2 min-h-[48px] rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-rose-600 hover:border-rose-200 dark:hover:text-rose-400 flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Smart Next-Event Predictions */}
        <section
          aria-labelledby="smart-next-heading"
          className="rounded-3xl bg-white dark:bg-[#131A29] border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm"
        >
          <div className="flex items-center justify-between gap-2">
            <h2
              id="smart-next-heading"
              className="text-sm font-semibold text-slate-900 dark:text-slate-100"
            >
              Lembretes Inteligentes
            </h2>
            <button
              type="button"
              onClick={onOpenRemindersTab}
              className="text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white underline-offset-4 hover:underline whitespace-nowrap"
            >
              Configurar
            </button>
          </div>

          <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800/80">
            {[feedingPred, sleepPred].map((pred) => {
              if (!pred) return null;
              const isFeed = pred.type === 'feeding';
              const statusText =
                pred.status === 'disabled'
                  ? 'Desativado'
                  : pred.status === 'no-data'
                    ? 'Aguardando registro'
                    : pred.status === 'quiet'
                      ? 'Modo silêncio ativo'
                      : pred.minutesRemaining !== null
                        ? formatRelativeCountdown(pred.minutesRemaining)
                        : '—';

              return (
                <div key={pred.ruleId} className="py-3 first:pt-1 last:pb-1 flex items-start gap-3">
                  <div
                    className={`mt-0.5 w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                      isFeed
                        ? 'bg-[#C85A32]/12 text-[#C85A32] dark:bg-[#F08A65]/15 dark:text-[#F08A65]'
                        : 'bg-[#434EC4]/12 text-[#434EC4] dark:bg-[#818CF8]/15 dark:text-[#818CF8]'
                    }`}
                  >
                    {isFeed ? (
                      <Baby className="w-4 h-4" aria-hidden="true" />
                    ) : (
                      <Moon className="w-4 h-4" aria-hidden="true" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {isFeed ? 'Próxima mamada' : 'Próxima janela de sono'}
                      </span>
                      <span
                        className={`font-mono text-xs font-semibold whitespace-nowrap ${
                          pred.status === 'overdue'
                            ? 'text-amber-700 dark:text-amber-400'
                            : pred.status === 'soon'
                              ? 'text-[#C85A32] dark:text-[#F08A65]'
                              : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {pred.dueAt ? `${formatTimeShort(pred.dueAt)} · ` : ''}
                        {statusText}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {pred.rationale}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Right Column (Desktop 7 cols): Daily Summary Rings + Date Selector + Timeline */}
      <div className="lg:col-span-7 space-y-5">
        {/* Daily Summary Cards */}
        <section
          aria-label="Resumo do dia selecionado"
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          <div className="rounded-3xl bg-white dark:bg-[#131A29] border border-slate-200/80 dark:border-slate-800 p-5 flex items-center gap-4 shadow-sm">
            <ProgressRing
              percent={feedingPct}
              colorClass="text-[#C85A32] dark:text-[#F08A65]"
            />
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Amamentação no dia
              </p>
              <p className="mt-0.5 text-2xl font-bold text-slate-900 dark:text-white font-mono tabular-nums">
                {formatDurationHuman(dayStats.feedingMinutes)}
              </p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {dayStats.feedingCount} {dayStats.feedingCount === 1 ? 'mamada' : 'mamadas'}
                {dayStats.bottleMl > 0 ? ` · ${dayStats.bottleMl} ml` : ''}
                {dayStats.lastBreastSide
                  ? ` · Último: ${sideShortLabelPt(dayStats.lastBreastSide)}`
                  : ''}
              </p>
            </div>
          </div>

          <div className="rounded-3xl bg-white dark:bg-[#131A29] border border-slate-200/80 dark:border-slate-800 p-5 flex items-center gap-4 shadow-sm">
            <ProgressRing
              percent={sleepPct}
              colorClass="text-[#434EC4] dark:text-[#818CF8]"
            />
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Sono acumulado
              </p>
              <p className="mt-0.5 text-2xl font-bold text-slate-900 dark:text-white font-mono tabular-nums">
                {formatDurationHuman(dayStats.sleepMinutes)}
              </p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {dayStats.sleepCount} {dayStats.sleepCount === 1 ? 'período' : 'períodos'}
                {dayStats.longestSleepMinutes > 0
                  ? ` · Maior bloco: ${formatDurationHuman(dayStats.longestSleepMinutes)}`
                  : ''}
              </p>
            </div>
          </div>
        </section>

        {/* Horizontal Date Scroller + Timeline */}
        <section
          aria-labelledby="timeline-heading"
          className="rounded-3xl bg-white dark:bg-[#131A29] border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-sm"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2
              id="timeline-heading"
              className="text-base font-semibold text-slate-900 dark:text-slate-100"
            >
              Histórico de Rotina
            </h2>
            <div
              role="group"
              aria-label="Selecionar dia"
              className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0"
            >
              {dateChips.map((chip) => {
                const active = chip.key === selectedDateKey;
                return (
                  <button
                    key={chip.key}
                    type="button"
                    onClick={() => onSelectDateKey(chip.key)}
                    aria-pressed={active}
                    className={`min-h-[44px] min-w-[46px] px-2.5 py-1.5 rounded-xl flex flex-col items-center justify-center text-xs transition-colors shrink-0 ${
                      active
                        ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-semibold'
                        : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/80 dark:bg-slate-800/70 dark:text-slate-300 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="text-[10px] leading-none opacity-80">
                      {chip.isToday ? 'Hoje' : chip.weekday}
                    </span>
                    <span className="mt-1 font-mono text-xs leading-none">{chip.dayNum}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {dayEntries.length === 0 ? (
            <div className="py-12 text-center">
              <Clock className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" aria-hidden="true" />
              <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-300">
                Nenhum registro neste dia
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Inicie o cronômetro ou adicione um registro manual.
              </p>
              <button
                type="button"
                onClick={() => onOpenNewModal('feeding')}
                className="mt-4 min-h-[44px] px-4 rounded-xl bg-slate-900 text-xs font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900"
              >
                + Adicionar registro
              </button>
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100 dark:divide-slate-800/80" data-testid="timeline-list">
              {dayEntries.map((entry) => {
                const isFeed = entry.type === 'feeding';
                const startClock = formatTimeShort(entry.startTime);
                const endClock = formatTimeShort(entry.endTime);
                const durHuman = formatDurationHuman(entry.durationSeconds / 60);
                const title = isFeed
                  ? `Amamentação · ${sideLabelPt(entry.side)}`
                  : `Sono${entry.location ? ` · ${entry.location}` : ''}`;

                return (
                  <li
                    key={entry.id}
                    className="py-3.5 min-h-[64px] flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                          isFeed
                            ? 'bg-[#C85A32]/12 text-[#C85A32] dark:bg-[#F08A65]/15 dark:text-[#F08A65]'
                            : 'bg-[#434EC4]/12 text-[#434EC4] dark:bg-[#818CF8]/15 dark:text-[#818CF8]'
                        }`}
                      >
                        {isFeed ? (
                          <Baby className="w-4 h-4" aria-hidden="true" />
                        ) : (
                          <Moon className="w-4 h-4" aria-hidden="true" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                          {title}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums truncate">
                          {startClock} – {endClock} · {durHuman}
                          {entry.type === 'feeding' && entry.amountMl
                            ? ` · ${entry.amountMl} ml`
                            : ''}
                          {entry.notes ? ` · ${entry.notes}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => onEditEntry(entry)}
                        aria-label={`Editar ${isFeed ? 'mamada' : 'sono'} das ${startClock}`}
                        className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 dark:hover:text-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteEntry(entry.id)}
                        aria-label={`Excluir ${isFeed ? 'mamada' : 'sono'} das ${startClock}`}
                        className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:text-rose-400 dark:hover:bg-rose-950/40 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};
