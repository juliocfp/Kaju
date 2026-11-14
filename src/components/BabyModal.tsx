import React, { useEffect, useState } from 'react';
import { Trash2, X } from 'lucide-react';
import { BabyProfile } from '../types/tracker';
import { ageFromBirthDate, birthDateFromAge } from '../utils/trackerLogic';

interface BabyModalProps {
  isOpen: boolean;
  editingBaby?: BabyProfile | null;
  canDelete?: boolean;
  onClose: () => void;
  onSave: (baby: BabyProfile) => void;
  onDelete?: (id: string) => void;
}

export const BabyModal: React.FC<BabyModalProps> = ({
  isOpen,
  editingBaby,
  canDelete = false,
  onClose,
  onSave,
  onDelete,
}) => {
  const [name, setName] = useState('');
  const [inputMode, setInputMode] = useState<'age' | 'birthdate'>('age');
  const [ageMonths, setAgeMonths] = useState('3');
  const [ageDays, setAgeDays] = useState('0');
  const [birthDate, setBirthDate] = useState('');
  const [dailyFeedingGoal, setDailyFeedingGoal] = useState('8');
  const [dailySleepHours, setDailySleepHours] = useState('14');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);
    if (editingBaby) {
      setName(editingBaby.name);
      setBirthDate(editingBaby.birthDate);
      const parsed = ageFromBirthDate(editingBaby.birthDate);
      setAgeMonths(String(parsed.months));
      setAgeDays(String(parsed.days));
      setDailyFeedingGoal(String(editingBaby.dailyFeedingGoalCount));
      setDailySleepHours(String(Math.round(editingBaby.dailySleepGoalMinutes / 60)));
    } else {
      setName('');
      setInputMode('age');
      setAgeMonths('0');
      setAgeDays('0');
      setBirthDate(birthDateFromAge(0, 0));
      setDailyFeedingGoal('8');
      setDailySleepHours('14');
    }
  }, [isOpen, editingBaby]);

  if (!isOpen) return null;

  const handleModeSwitch = (nextMode: 'age' | 'birthdate') => {
    if (nextMode === inputMode) return;
    if (nextMode === 'birthdate') {
      const m = Number(ageMonths) || 0;
      const d = Number(ageDays) || 0;
      setBirthDate(birthDateFromAge(m, d));
    } else if (birthDate) {
      const parsed = ageFromBirthDate(birthDate);
      setAgeMonths(String(parsed.months));
      setAgeDays(String(parsed.days));
    }
    setInputMode(nextMode);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMsg('Informe o nome do bebê.');
      return;
    }

    let finalBirthDate = birthDate;
    if (inputMode === 'age') {
      const m = Number(ageMonths);
      const d = Number(ageDays);
      if (!Number.isFinite(m) || m < 0 || m > 60) {
        setErrorMsg('Informe uma idade em meses entre 0 e 60.');
        return;
      }
      if (!Number.isFinite(d) || d < 0 || d > 30) {
        setErrorMsg('Informe os dias adicionais entre 0 e 30.');
        return;
      }
      finalBirthDate = birthDateFromAge(m, d);
    } else {
      if (!birthDate) {
        setErrorMsg('Informe a data de nascimento do bebê.');
        return;
      }
      const parsed = new Date(birthDate);
      if (Number.isNaN(parsed.getTime())) {
        setErrorMsg('Data de nascimento inválida.');
        return;
      }
    }

    const feeds = Math.max(1, Math.min(24, Number(dailyFeedingGoal) || 8));
    const sleepH = Math.max(4, Math.min(22, Number(dailySleepHours) || 14));

    const profile: BabyProfile = {
      id: editingBaby?.id ?? `baby-${Date.now()}`,
      name: trimmedName,
      birthDate: finalBirthDate,
      dailyFeedingGoalCount: feeds,
      dailySleepGoalMinutes: sleepH * 60,
    };

    onSave(profile);
    onClose();
  };

  const previewAgeLabel =
    inputMode === 'age'
      ? ageFromBirthDate(birthDateFromAge(Number(ageMonths) || 0, Number(ageDays) || 0)).label
      : ageFromBirthDate(birthDate).label;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="baby-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/50 backdrop-blur-sm p-0 sm:p-4"
    >
      <div className="w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl bg-white dark:bg-[#131A29] border border-slate-200 dark:border-slate-800 p-6 shadow-xl">
        <div className="w-10 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-4 sm:hidden" />

        <div className="flex items-center justify-between gap-4">
          <div>
            <h2
              id="baby-modal-title"
              className="text-lg font-semibold text-slate-900 dark:text-slate-100"
            >
              {editingBaby ? 'Editar Cadastro do Bebê' : 'Cadastrar Bebê'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Informe o nome e a idade para personalizar a rotina no Kaju.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar cadastro do bebê"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label
              htmlFor="modal-baby-name"
              className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
            >
              Nome do bebê
            </label>
            <input
              id="modal-baby-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Sofia, Gabriel, Marina..."
              required
              autoFocus
              className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 text-sm text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Idade do bebê
              </span>
              {previewAgeLabel && (
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Exibição: {previewAgeLabel}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 mb-3">
              <button
                type="button"
                onClick={() => handleModeSwitch('age')}
                className={`min-h-[38px] rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  inputMode === 'age'
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-[#1C2538] dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                }`}
              >
                Por idade (meses)
              </button>
              <button
                type="button"
                onClick={() => handleModeSwitch('birthdate')}
                className={`min-h-[38px] rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  inputMode === 'birthdate'
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-[#1C2538] dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                }`}
              >
                Por data de nascimento
              </button>
            </div>

            {inputMode === 'age' ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="modal-baby-months"
                    className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1"
                  >
                    Meses
                  </label>
                  <input
                    id="modal-baby-months"
                    type="number"
                    min={0}
                    max={60}
                    value={ageMonths}
                    onChange={(e) => setAgeMonths(e.target.value)}
                    className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm font-mono text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label
                    htmlFor="modal-baby-days"
                    className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1"
                  >
                    Dias (opcional)
                  </label>
                  <input
                    id="modal-baby-days"
                    type="number"
                    min={0}
                    max={30}
                    value={ageDays}
                    onChange={(e) => setAgeDays(e.target.value)}
                    className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm font-mono text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label htmlFor="modal-baby-birthdate" className="sr-only">
                  Data de nascimento
                </label>
                <input
                  id="modal-baby-birthdate"
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm font-mono text-slate-900 dark:text-slate-100"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label
                htmlFor="modal-goal-feeds"
                className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
              >
                Meta mamadas / dia
              </label>
              <input
                id="modal-goal-feeds"
                type="number"
                min={1}
                max={24}
                value={dailyFeedingGoal}
                onChange={(e) => setDailyFeedingGoal(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm font-mono text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label
                htmlFor="modal-goal-sleep"
                className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
              >
                Meta sono (horas/dia)
              </label>
              <input
                id="modal-goal-sleep"
                type="number"
                min={4}
                max={22}
                value={dailySleepHours}
                onChange={(e) => setDailySleepHours(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm font-mono text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          {errorMsg && (
            <p
              role="alert"
              className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/50 px-3.5 py-2.5 text-xs font-medium text-rose-700 dark:text-rose-300"
            >
              {errorMsg}
            </p>
          )}

          <div className="flex items-center justify-between gap-3 pt-2">
            {editingBaby && canDelete && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  onDelete(editingBaby.id);
                  onClose();
                }}
                aria-label={`Remover cadastro de ${editingBaby.name}`}
                className="min-h-[44px] px-3.5 rounded-xl border border-rose-200 dark:border-rose-900 text-xs font-medium text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 inline-flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Remover</span>
              </button>
            ) : (
              <span />
            )}

            <div className="flex items-center gap-2.5">
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
                {editingBaby ? 'Salvar Alterações' : 'Cadastrar Bebê'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
