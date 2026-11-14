import React from 'react';
import { Baby, Bell, BellOff, Moon, Sparkles } from 'lucide-react';
import { ReminderRule, SmartPrediction } from '../types/tracker';
import {
  formatDurationHuman,
  formatRelativeCountdown,
  formatTimeShort,
} from '../utils/trackerLogic';

interface RemindersViewProps {
  rules: ReminderRule[];
  predictions: SmartPrediction[];
  notificationPermission: NotificationPermission;
  onUpdateRule: (id: string, patch: Partial<ReminderRule>) => void;
  onRequestPermission: () => void;
  onTriggerTestNotification: () => void;
}

export const RemindersView: React.FC<RemindersViewProps> = ({
  rules,
  predictions,
  notificationPermission,
  onUpdateRule,
  onRequestPermission,
  onTriggerTestNotification,
}) => {
  return (
    <div className="space-y-6">
      {/* Header + Notification Permission Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Notificações Inteligentes e Lembretes
          </h2>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            O modo inteligente aprende com os intervalos recentes do bebê e respeita o horário de silêncio.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {notificationPermission !== 'granted' && (
            <button
              type="button"
              onClick={onRequestPermission}
              className="min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition-colors whitespace-nowrap"
            >
              <Bell className="w-4 h-4" aria-hidden="true" />
              <span>Ativar Alertas do iOS / Navegador</span>
            </button>
          )}
          <button
            type="button"
            onClick={onTriggerTestNotification}
            className="min-h-[44px] inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#131A29] px-4 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
          >
            <Bell className="w-4 h-4" aria-hidden="true" />
            <span>Testar Notificação</span>
          </button>
        </div>
      </div>

      {/* Permission status note (unboxed inline notice) */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#131A29] px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-300">
        <span>
          Status das notificações do sistema:{' '}
          <strong className="text-slate-900 dark:text-white">
            {notificationPermission === 'granted'
              ? 'Permitidas'
              : notificationPermission === 'denied'
                ? 'Bloqueadas no navegador (alertas visuais continuam ativos no app)'
                : 'Aguardando autorização'}
          </strong>
        </span>
        <span className="text-slate-500 dark:text-slate-400">
          No iOS, adicione o Kaju à Tela de Início para receber alertas nativos.
        </span>
      </div>

      {/* Rules Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {rules.map((rule) => {
          const isFeed = rule.type === 'feeding';
          const pred = predictions.find((p) => p.ruleId === rule.id);
          const minInterval = isFeed ? 90 : 45;
          const maxInterval = isFeed ? 300 : 240;

          return (
            <section
              key={rule.id}
              aria-labelledby={`rule-title-${rule.id}`}
              className="rounded-3xl bg-white dark:bg-[#131A29] border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-5"
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      isFeed
                        ? 'bg-[#C85A32]/12 text-[#C85A32] dark:bg-[#F08A65]/15 dark:text-[#F08A65]'
                        : 'bg-[#434EC4]/12 text-[#434EC4] dark:bg-[#818CF8]/15 dark:text-[#818CF8]'
                    }`}
                  >
                    {isFeed ? (
                      <Baby className="w-5 h-5" aria-hidden="true" />
                    ) : (
                      <Moon className="w-5 h-5" aria-hidden="true" />
                    )}
                  </div>
                  <div>
                    <h3
                      id={`rule-title-${rule.id}`}
                      className="text-base font-semibold text-slate-900 dark:text-white"
                    >
                      {isFeed ? 'Lembrete de Amamentação' : 'Janela de Sono (Despertar)'}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {isFeed
                        ? 'Tempo após o término da última mamada'
                        : 'Tempo máximo acordado após a última soneca'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={rule.enabled}
                  aria-label={
                    isFeed
                      ? 'Ativar ou pausar lembrete de amamentação'
                      : 'Ativar ou pausar lembrete de sono'
                  }
                  onClick={() => onUpdateRule(rule.id, { enabled: !rule.enabled })}
                  className={`min-h-[40px] px-3.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    rule.enabled
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  {rule.enabled ? 'Ativado' : 'Pausado'}
                </button>
              </div>

              {/* Live Prediction Readout */}
              {pred && (
                <div className="rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-100 dark:border-slate-800 p-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Previsão atual
                    </span>
                    <span className="font-mono text-sm font-semibold text-slate-900 dark:text-white tabular-nums">
                      {pred.dueAt && pred.minutesRemaining !== null
                        ? `${formatTimeShort(pred.dueAt)} (${formatRelativeCountdown(pred.minutesRemaining)})`
                        : 'Sem histórico ainda'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                    {pred.rationale}
                    {pred.effectiveIntervalMinutes > 0 && pred.enabled
                      ? ` · Intervalo efetivo: ${formatDurationHuman(pred.effectiveIntervalMinutes)}`
                      : ''}
                  </p>
                </div>
              )}

              {/* Mode Selector: Smart vs Fixed */}
              <div>
                <span className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  Modo de cálculo
                </span>
                <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80">
                  <button
                    type="button"
                    onClick={() => onUpdateRule(rule.id, { mode: 'smart' })}
                    aria-pressed={rule.mode === 'smart'}
                    className={`min-h-[42px] flex items-center justify-center gap-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                      rule.mode === 'smart'
                        ? 'bg-white text-slate-900 shadow-sm dark:bg-[#1E293B] dark:text-white'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Inteligente (Adaptativo)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateRule(rule.id, { mode: 'fixed' })}
                    aria-pressed={rule.mode === 'fixed'}
                    className={`min-h-[42px] flex items-center justify-center gap-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                      rule.mode === 'fixed'
                        ? 'bg-white text-slate-900 shadow-sm dark:bg-[#1E293B] dark:text-white'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                    }`}
                  >
                    <span>Fixo (Manual)</span>
                  </button>
                </div>
              </div>

              {/* Interval Slider */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <label
                    htmlFor={`interval-${rule.id}`}
                    className="font-medium text-slate-700 dark:text-slate-300"
                  >
                    {rule.mode === 'smart' ? 'Meta base de intervalo' : 'Intervalo exato'}
                  </label>
                  <span className="font-mono font-semibold text-slate-900 dark:text-white tabular-nums">
                    {formatDurationHuman(rule.intervalMinutes)}
                  </span>
                </div>
                <input
                  id={`interval-${rule.id}`}
                  type="range"
                  min={minInterval}
                  max={maxInterval}
                  step={5}
                  value={rule.intervalMinutes}
                  onChange={(e) =>
                    onUpdateRule(rule.id, { intervalMinutes: Number(e.target.value) })
                  }
                  className="w-full accent-slate-900 dark:accent-slate-100 h-2 cursor-pointer"
                />
                <div className="flex justify-between text-[11px] font-mono text-slate-400 mt-1">
                  <span>{formatDurationHuman(minInterval)}</span>
                  <span>{formatDurationHuman(maxInterval)}</span>
                </div>
              </div>

              {/* Advance Warning */}
              <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                <label
                  htmlFor={`advance-${rule.id}`}
                  className="text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  Pré-aviso antes do horário
                </label>
                <select
                  id={`advance-${rule.id}`}
                  value={rule.advanceAlertMinutes}
                  onChange={(e) =>
                    onUpdateRule(rule.id, { advanceAlertMinutes: Number(e.target.value) })
                  }
                  className="min-h-[40px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-mono text-slate-900 dark:text-slate-100"
                >
                  <option value={0}>No horário exato</option>
                  <option value={5}>5 min antes</option>
                  <option value={10}>10 min antes</option>
                  <option value={15}>15 min antes</option>
                  <option value={20}>20 min antes</option>
                  <option value={30}>30 min antes</option>
                </select>
              </div>

              {/* Quiet Hours */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <BellOff className="w-4 h-4 text-slate-400" aria-hidden="true" />
                    <div>
                      <span className="block text-xs font-medium text-slate-800 dark:text-slate-200">
                        Modo Silêncio Noturno
                      </span>
                      <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                        Não disparar alertas sonoros na madrugada
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={rule.quietHoursEnabled}
                    aria-label={`Modo silêncio para ${isFeed ? 'amamentação' : 'sono'}`}
                    onClick={() =>
                      onUpdateRule(rule.id, { quietHoursEnabled: !rule.quietHoursEnabled })
                    }
                    className={`min-h-[38px] px-3 rounded-xl text-xs font-medium transition-colors whitespace-nowrap ${
                      rule.quietHoursEnabled
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {rule.quietHoursEnabled ? 'Ativo' : 'Inativo'}
                  </button>
                </div>

                {rule.quietHoursEnabled && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor={`quiet-start-${rule.id}`}
                        className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1"
                      >
                        Início do silêncio
                      </label>
                      <input
                        id={`quiet-start-${rule.id}`}
                        type="time"
                        value={rule.quietHoursStart}
                        onChange={(e) =>
                          onUpdateRule(rule.id, { quietHoursStart: e.target.value })
                        }
                        className="w-full min-h-[40px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-mono text-slate-900 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor={`quiet-end-${rule.id}`}
                        className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1"
                      >
                        Fim do silêncio
                      </label>
                      <input
                        id={`quiet-end-${rule.id}`}
                        type="time"
                        value={rule.quietHoursEnd}
                        onChange={(e) =>
                          onUpdateRule(rule.id, { quietHoursEnd: e.target.value })
                        }
                        className="w-full min-h-[40px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-mono text-slate-900 dark:text-slate-100"
                      />
                    </div>
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};
