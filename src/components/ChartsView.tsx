import React, { useMemo, useState } from 'react';
import { Baby, Moon } from 'lucide-react';
import { TrackerEntry } from '../types/tracker';
import {
  compute24HourRhythm,
  computeDailyTrend,
  computeHistoricalIntervalMinutes,
  formatDurationHuman,
  pad2,
  toLocalDateKey,
} from '../utils/trackerLogic';

interface ChartsViewProps {
  entries: TrackerEntry[];
}

export const ChartsView: React.FC<ChartsViewProps> = ({ entries }) => {
  const [rangeDays, setRangeDays] = useState<7 | 14 | 30>(7);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const trend = useMemo(() => computeDailyTrend(entries, rangeDays), [entries, rangeDays]);

  const averages = useMemo(() => {
    const activeDays = trend.filter((d) => d.sleepMinutes > 0 || d.feedingMinutes > 0);
    const divisor = Math.max(1, activeDays.length);
    const avgSleepMin = Math.round(
      activeDays.reduce((s, d) => s + d.sleepMinutes, 0) / divisor
    );
    const avgFeedMin = Math.round(
      activeDays.reduce((s, d) => s + d.feedingMinutes, 0) / divisor
    );
    const avgFeedCount = (
      activeDays.reduce((s, d) => s + d.feedingCount, 0) / divisor
    ).toFixed(1);
    const avgFeedGap = computeHistoricalIntervalMinutes(entries, 'feeding');

    return { avgSleepMin, avgFeedMin, avgFeedCount, avgFeedGap };
  }, [trend, entries]);

  // Last 5 days 24h circadian rhythm blocks
  const rhythmDays = useMemo(() => {
    const now = new Date();
    const list: { dateKey: string; label: string; blocks: ReturnType<typeof compute24HourRhythm> }[] =
      [];
    for (let i = 0; i < 5; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = toLocalDateKey(d);
      list.push({
        dateKey: key,
        label: i === 0 ? 'Hoje' : `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`,
        blocks: compute24HourRhythm(entries, key),
      });
    }
    return list;
  }, [entries]);

  const maxSleepHours = Math.max(12, ...trend.map((t) => Math.ceil(t.sleepHours + 1)));
  const maxFeedMinutes = Math.max(120, ...trend.map((t) => Math.ceil((t.feedingMinutes + 20) / 30) * 30));

  const inspectedPoint = hoveredIdx !== null ? trend[hoveredIdx] : trend[trend.length - 1];

  return (
    <div className="space-y-6">
      {/* Header & Period Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Gráficos de Progresso e Ritmo
          </h2>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Evolução diária de sono e amamentação para acompanhar a consolidação da rotina.
          </p>
        </div>

        <div
          role="group"
          aria-label="Período dos gráficos"
          className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-200/70 dark:bg-slate-800/80 self-start"
        >
          {([7, 14, 30] as const).map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => {
                setRangeDays(days);
                setHoveredIdx(null);
              }}
              aria-pressed={rangeDays === days}
              className={`min-h-[40px] px-3.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                rangeDays === days
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-[#1E293B] dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {days} dias
            </button>
          ))}
        </div>
      </div>

      {/* KPI Averages Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white dark:bg-[#131A29] border border-slate-200/80 dark:border-slate-800 p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Média de Sono / dia</p>
          <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {formatDurationHuman(averages.avgSleepMin)}
          </p>
        </div>
        <div className="rounded-2xl bg-white dark:bg-[#131A29] border border-slate-200/80 dark:border-slate-800 p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Média Amamentação / dia</p>
          <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {formatDurationHuman(averages.avgFeedMin)}
          </p>
        </div>
        <div className="rounded-2xl bg-white dark:bg-[#131A29] border border-slate-200/80 dark:border-slate-800 p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Mamadas / dia</p>
          <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {averages.avgFeedCount}
          </p>
        </div>
        <div className="rounded-2xl bg-white dark:bg-[#131A29] border border-slate-200/80 dark:border-slate-800 p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Intervalo médio</p>
          <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {averages.avgFeedGap ? formatDurationHuman(averages.avgFeedGap) : '—'}
          </p>
        </div>
      </div>

      {/* Main 2-Column SVG Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sleep Hours Chart */}
        <section className="rounded-3xl bg-white dark:bg-[#131A29] border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Moon className="w-4 h-4 text-[#434EC4] dark:text-[#818CF8]" aria-hidden="true" />
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Horas de Sono por Dia
              </h3>
            </div>
            {inspectedPoint && (
              <span className="text-xs font-mono tabular-nums text-slate-600 dark:text-slate-300">
                {inspectedPoint.label} · {inspectedPoint.sleepHours}h
              </span>
            )}
          </div>

          <div className="mt-5">
            <svg
              viewBox="0 0 560 220"
              className="w-full h-52 overflow-visible"
              role="img"
              aria-label={`Gráfico de barras de horas de sono nos últimos ${rangeDays} dias`}
            >
              {/* Horizontal guidelines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                const y = 180 - ratio * 150;
                const val = Math.round(maxSleepHours * ratio);
                return (
                  <g key={ratio}>
                    <line
                      x1="34"
                      x2="550"
                      y1={y}
                      y2={y}
                      stroke="currentColor"
                      className="text-slate-100 dark:text-slate-800"
                      strokeWidth="1"
                    />
                    <text
                      x="26"
                      y={y + 4}
                      textAnchor="end"
                      className="fill-slate-400 dark:fill-slate-500 text-[10px] font-mono"
                    >
                      {val}h
                    </text>
                  </g>
                );
              })}

              {/* Bars */}
              {trend.map((pt, i) => {
                const plotWidth = 510;
                const slotW = plotWidth / trend.length;
                const barW = Math.max(6, Math.min(28, slotW * 0.62));
                const x = 38 + i * slotW + (slotW - barW) / 2;
                const barH = Math.max(2, (pt.sleepHours / maxSleepHours) * 150);
                const y = 180 - barH;
                const showLabel =
                  rangeDays === 7 || i % (rangeDays === 14 ? 2 : 5) === 0 || i === trend.length - 1;

                return (
                  <g
                    key={pt.dateKey}
                    onMouseEnter={() => setHoveredIdx(i)}
                    onClick={() => setHoveredIdx(i)}
                    className="cursor-pointer"
                  >
                    <rect
                      x={x}
                      y={pt.sleepMinutes > 0 ? y : 178}
                      width={barW}
                      height={pt.sleepMinutes > 0 ? barH : 2}
                      rx={Math.min(6, barW / 2)}
                      className={
                        hoveredIdx === i
                          ? 'fill-[#353EA8] dark:fill-[#A5B4FC]'
                          : 'fill-[#434EC4] dark:fill-[#818CF8]'
                      }
                    />
                    {showLabel && (
                      <text
                        x={x + barW / 2}
                        y={202}
                        textAnchor="middle"
                        className="fill-slate-500 dark:fill-slate-400 text-[10px] font-mono"
                      >
                        {rangeDays === 7 ? pt.shortWeekday : pt.label}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </section>

        {/* Feeding Duration Chart */}
        <section className="rounded-3xl bg-white dark:bg-[#131A29] border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Baby className="w-4 h-4 text-[#C85A32] dark:text-[#F08A65]" aria-hidden="true" />
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Tempo de Amamentação (min/dia)
              </h3>
            </div>
            {inspectedPoint && (
              <span className="text-xs font-mono tabular-nums text-slate-600 dark:text-slate-300">
                {inspectedPoint.label} · {inspectedPoint.feedingMinutes}m ({inspectedPoint.feedingCount}x)
              </span>
            )}
          </div>

          <div className="mt-5">
            <svg
              viewBox="0 0 560 220"
              className="w-full h-52 overflow-visible"
              role="img"
              aria-label={`Gráfico de barras de duração de amamentação nos últimos ${rangeDays} dias`}
            >
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                const y = 180 - ratio * 150;
                const val = Math.round(maxFeedMinutes * ratio);
                return (
                  <g key={ratio}>
                    <line
                      x1="38"
                      x2="550"
                      y1={y}
                      y2={y}
                      stroke="currentColor"
                      className="text-slate-100 dark:text-slate-800"
                      strokeWidth="1"
                    />
                    <text
                      x="30"
                      y={y + 4}
                      textAnchor="end"
                      className="fill-slate-400 dark:fill-slate-500 text-[10px] font-mono"
                    >
                      {val}m
                    </text>
                  </g>
                );
              })}

              {trend.map((pt, i) => {
                const plotWidth = 506;
                const slotW = plotWidth / trend.length;
                const barW = Math.max(6, Math.min(28, slotW * 0.62));
                const x = 42 + i * slotW + (slotW - barW) / 2;
                const barH = Math.max(2, (pt.feedingMinutes / maxFeedMinutes) * 150);
                const y = 180 - barH;
                const showLabel =
                  rangeDays === 7 || i % (rangeDays === 14 ? 2 : 5) === 0 || i === trend.length - 1;

                return (
                  <g
                    key={pt.dateKey}
                    onMouseEnter={() => setHoveredIdx(i)}
                    onClick={() => setHoveredIdx(i)}
                    className="cursor-pointer"
                  >
                    <rect
                      x={x}
                      y={pt.feedingMinutes > 0 ? y : 178}
                      width={barW}
                      height={pt.feedingMinutes > 0 ? barH : 2}
                      rx={Math.min(6, barW / 2)}
                      className={
                        hoveredIdx === i
                          ? 'fill-[#A8431F] dark:fill-[#F8B097]'
                          : 'fill-[#C85A32] dark:fill-[#F08A65]'
                      }
                    />
                    {showLabel && (
                      <text
                        x={x + barW / 2}
                        y={202}
                        textAnchor="middle"
                        className="fill-slate-500 dark:fill-slate-400 text-[10px] font-mono"
                      >
                        {rangeDays === 7 ? pt.shortWeekday : pt.label}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </section>
      </div>

      {/* 24-Hour Circadian Rhythm Strip */}
      <section className="rounded-3xl bg-white dark:bg-[#131A29] border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Mapa de Ritmo 24 Horas (Últimos 5 dias)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Visualize horários de sono e mamadas ao longo do dia e da madrugada.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-300">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-[#434EC4] dark:bg-[#818CF8]" />
              Sono
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-[#C85A32] dark:bg-[#F08A65]" />
              Amamentação
            </span>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {/* Hour scale */}
          <div className="flex items-center gap-3">
            <span className="w-12 shrink-0" />
            <div className="flex-1 flex justify-between text-[10px] font-mono text-slate-400 dark:text-slate-500">
              <span>00h</span>
              <span>06h</span>
              <span>12h</span>
              <span>18h</span>
              <span>24h</span>
            </div>
          </div>

          {rhythmDays.map((day) => (
            <div key={day.dateKey} className="flex items-center gap-3">
              <span className="w-12 text-xs font-mono text-slate-600 dark:text-slate-400 shrink-0">
                {day.label}
              </span>
              <div className="relative flex-1 h-7 rounded-lg bg-slate-100 dark:bg-slate-800/80 overflow-hidden">
                {day.blocks.map((block) => {
                  const leftPct = (block.startMinuteOfDay / 1440) * 100;
                  const widthPct = Math.max(
                    0.9,
                    ((block.endMinuteOfDay - block.startMinuteOfDay) / 1440) * 100
                  );
                  return (
                    <div
                      key={block.id}
                      title={block.label}
                      style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                      className={`absolute top-1 bottom-1 rounded-sm ${
                        block.type === 'sleep'
                          ? 'bg-[#434EC4]/85 dark:bg-[#818CF8]/85'
                          : 'bg-[#C85A32] dark:bg-[#F08A65]'
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
