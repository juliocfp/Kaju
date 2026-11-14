import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { BreastSide, EntryType, SleepQuality, TrackerEntry } from '../types/tracker';
import { pad2 } from '../utils/trackerLogic';

interface EntryModalProps {
  isOpen: boolean;
  initialEntry?: TrackerEntry | null;
  defaultType?: EntryType;
  defaultDateKey?: string;
  onClose: () => void;
  onSave: (entry: TrackerEntry) => void;
}

function toInputDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function toInputTime(iso: string): string {
  const d = new Date(iso);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export const EntryModal: React.FC<EntryModalProps> = ({
  isOpen,
  initialEntry,
  defaultType = 'feeding',
  defaultDateKey,
  onClose,
  onSave,
}) => {
  const [type, setType] = useState<EntryType>(defaultType);
  const [dateStr, setDateStr] = useState<string>('');
  const [startTimeStr, setStartTimeStr] = useState<string>('08:00');
  const [durationMin, setDurationMin] = useState<string>('20');
  const [side, setSide] = useState<BreastSide>('left');
  const [amountMl, setAmountMl] = useState<string>('');
  const [quality, setQuality] = useState<SleepQuality>('calm');
  const [location, setLocation] = useState<string>('Berço');
  const [notes, setNotes] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);
    if (initialEntry) {
      setType(initialEntry.type);
      setDateStr(toInputDate(initialEntry.startTime));
      setStartTimeStr(toInputTime(initialEntry.startTime));
      setDurationMin(String(Math.max(1, Math.round(initialEntry.durationSeconds / 60))));
      if (initialEntry.type === 'feeding') {
        setSide(initialEntry.side);
        setAmountMl(initialEntry.amountMl ? String(initialEntry.amountMl) : '');
      } else {
        setQuality(initialEntry.quality ?? 'calm');
        setLocation(initialEntry.location ?? 'Berço');
      }
      setNotes(initialEntry.notes ?? '');
    } else {
      const now = new Date();
      const todayKey =
        defaultDateKey ??
        `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
      setType(defaultType);
      setDateStr(todayKey);
      setStartTimeStr(`${pad2(now.getHours())}:${pad2(now.getMinutes())}`);
      setDurationMin(defaultType === 'feeding' ? '20' : '60');
      setSide('left');
      setAmountMl('');
      setQuality('calm');
      setLocation('Berço');
      setNotes('');
    }
  }, [isOpen, initialEntry, defaultType, defaultDateKey]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!dateStr || !startTimeStr) {
      setErrorMsg('Informe a data e o horário de início.');
      return;
    }

    const dur = Number(durationMin);
    if (!Number.isFinite(dur) || dur < 1 || dur > 960) {
      setErrorMsg('A duração deve estar entre 1 e 960 minutos.');
      return;
    }

    const [y, m, d] = dateStr.split('-').map(Number);
    const [hh, mm] = startTimeStr.split(':').map(Number);
    const startDate = new Date(y, m - 1, d, hh, mm, 0, 0);
    if (Number.isNaN(startDate.getTime())) {
      setErrorMsg('Data ou horário inválido.');
      return;
    }

    if (type === 'feeding' && side === 'bottle' && amountMl.trim() !== '') {
      const mlVal = Number(amountMl);
      if (!Number.isFinite(mlVal) || mlVal <= 0 || mlVal > 500) {
        setErrorMsg('Informe uma quantidade válida em ml (1 a 500).');
        return;
      }
    }

    const endDate = new Date(startDate.getTime() + Math.round(dur) * 60000);
    const id = initialEntry?.id ?? `entry-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const entry: TrackerEntry =
      type === 'feeding'
        ? {
            id,
            type: 'feeding',
            startTime: startDate.toISOString(),
            endTime: endDate.toISOString(),
            durationSeconds: Math.round(dur) * 60,
            side,
            amountMl:
              side === 'bottle' && amountMl.trim() !== '' ? Math.round(Number(amountMl)) : undefined,
            notes: notes.trim() || undefined,
          }
        : {
            id,
            type: 'sleep',
            startTime: startDate.toISOString(),
            endTime: endDate.toISOString(),
            durationSeconds: Math.round(dur) * 60,
            quality,
            location: location.trim() || undefined,
            notes: notes.trim() || undefined,
          };

    onSave(entry);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="entry-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/50 backdrop-blur-sm p-0 sm:p-4"
    >
      <div className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl bg-white dark:bg-[#131A29] border border-slate-200 dark:border-slate-800 p-6 shadow-xl">
        <div className="w-10 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-4 sm:hidden" />

        <div className="flex items-center justify-between gap-4">
          <h2
            id="entry-modal-title"
            className="text-lg font-semibold text-slate-900 dark:text-slate-100"
          >
            {initialEntry ? 'Editar Registro' : 'Novo Registro Manual'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar formulário"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Type Switcher */}
          <div>
            <span className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Categoria
            </span>
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80">
              <button
                type="button"
                onClick={() => {
                  setType('feeding');
                  if (!initialEntry) setDurationMin('20');
                }}
                className={`min-h-[44px] rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  type === 'feeding'
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-[#1C2538] dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                Amamentação
              </button>
              <button
                type="button"
                onClick={() => {
                  setType('sleep');
                  if (!initialEntry) setDurationMin('60');
                }}
                className={`min-h-[44px] rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  type === 'sleep'
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-[#1C2538] dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                Sono
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label
                htmlFor="entry-date"
                className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
              >
                Data
              </label>
              <input
                id="entry-date"
                type="date"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                required
                className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm text-slate-900 dark:text-slate-100 font-mono"
              />
            </div>

            <div>
              <label
                htmlFor="entry-time"
                className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
              >
                Início
              </label>
              <input
                id="entry-time"
                type="time"
                value={startTimeStr}
                onChange={(e) => setStartTimeStr(e.target.value)}
                required
                className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm text-slate-900 dark:text-slate-100 font-mono"
              />
            </div>

            <div>
              <label
                htmlFor="entry-duration"
                className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
              >
                Duração (min)
              </label>
              <input
                id="entry-duration"
                type="number"
                min={1}
                max={960}
                value={durationMin}
                onChange={(e) => setDurationMin(e.target.value)}
                required
                className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm text-slate-900 dark:text-slate-100 font-mono"
              />
            </div>
          </div>

          {type === 'feeding' ? (
            <div className="space-y-3">
              <div>
                <span className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  Lado / Tipo
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {(
                    [
                      ['left', 'Esquerdo'],
                      ['right', 'Direito'],
                      ['both', 'Ambos'],
                      ['bottle', 'Mamadeira'],
                    ] as const
                  ).map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setSide(val)}
                      className={`min-h-[44px] rounded-xl border text-xs font-medium transition-colors whitespace-nowrap ${
                        side === val
                          ? 'border-[#C85A32] bg-[#C85A32]/10 text-[#A8431F] dark:border-[#F08A65] dark:bg-[#F08A65]/15 dark:text-[#F8B097]'
                          : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {side === 'bottle' && (
                <div>
                  <label
                    htmlFor="entry-ml"
                    className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
                  >
                    Quantidade (ml)
                  </label>
                  <input
                    id="entry-ml"
                    type="number"
                    min={1}
                    max={500}
                    placeholder="Ex: 120"
                    value={amountMl}
                    onChange={(e) => setAmountMl(e.target.value)}
                    className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  Qualidade do Sono
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      ['calm', 'Calmo'],
                      ['deep', 'Profundo'],
                      ['restless', 'Agitado'],
                    ] as const
                  ).map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setQuality(val)}
                      className={`min-h-[44px] rounded-xl border text-xs font-medium transition-colors whitespace-nowrap ${
                        quality === val
                          ? 'border-[#434EC4] bg-[#434EC4]/10 text-[#353EA8] dark:border-[#818CF8] dark:bg-[#818CF8]/15 dark:text-[#A5B4FC]'
                          : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label
                  htmlFor="entry-location"
                  className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5"
                >
                  Local
                </label>
                <input
                  id="entry-location"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Berço, Carrinho, Colo..."
                  className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
          )}

          <div>
            <label
              htmlFor="entry-notes"
              className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
            >
              Observações (opcional)
            </label>
            <textarea
              id="entry-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Pega tranquila, dormiu logo após..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-sm text-slate-900 dark:text-slate-100"
            />
          </div>

          {errorMsg && (
            <p
              role="alert"
              className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/50 px-3.5 py-2.5 text-xs font-medium text-rose-700 dark:text-rose-300"
            >
              {errorMsg}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="min-h-[44px] px-5 rounded-xl bg-slate-900 text-sm font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition-colors"
            >
              {initialEntry ? 'Salvar Alterações' : 'Salvar Registro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
