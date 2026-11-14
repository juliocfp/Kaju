import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  Bell,
  Clock,
  FileSpreadsheet,
  Moon,
  Pencil,
  Plus,
  Sun,
  UserPlus,
  X,
} from 'lucide-react';
import { useTrackerStore } from './hooks/useTrackerStore';
import { BabyProfile, EntryType, TrackerEntry } from './types/tracker';
import { ageFromBirthDate, toLocalDateKey } from './utils/trackerLogic';
import { TodayView } from './components/TodayView';
import { ChartsView } from './components/ChartsView';
import { RemindersView } from './components/RemindersView';
import { ImportView } from './components/ImportView';
import { EntryModal } from './components/EntryModal';
import { BabyModal } from './components/BabyModal';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';

type TabId = 'today' | 'charts' | 'reminders' | 'import';

export default function App() {
  const {
    entries,
    babies,
    activeTimer,
    activeElapsedSeconds,
    reminderRules,
    predictions,
    babyProfile,
    darkMode,
    notificationPermission,
    bannerAlert,
    setDarkMode,
    selectBaby,
    saveBaby,
    deleteBaby,
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
  } = useTrackerStore();

  const [activeTab, setActiveTab] = useState<TabId>('today');
  const [selectedDateKey, setSelectedDateKey] = useState<string>(() =>
    toLocalDateKey(new Date())
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TrackerEntry | null>(null);
  const [modalDefaultType, setModalDefaultType] = useState<EntryType>('feeding');

  const [babyModalOpen, setBabyModalOpen] = useState(false);
  const [editingBaby, setEditingBaby] = useState<BabyProfile | null>(null);

  const babyAgeLabel = useMemo(
    () => ageFromBirthDate(babyProfile.birthDate).label,
    [babyProfile.birthDate]
  );

  const openNewModal = (type: EntryType = 'feeding') => {
    setEditingEntry(null);
    setModalDefaultType(type);
    setModalOpen(true);
  };

  const openEditModal = (entry: TrackerEntry) => {
    setEditingEntry(entry);
    setModalDefaultType(entry.type);
    setModalOpen(true);
  };

  const openNewBabyModal = () => {
    setEditingBaby(null);
    setBabyModalOpen(true);
  };

  const openEditBabyModal = (baby: BabyProfile) => {
    setEditingBaby(baby);
    setBabyModalOpen(true);
  };

  const navItems: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'today', label: 'Hoje', icon: Clock },
    { id: 'charts', label: 'Gráficos', icon: BarChart3 },
    { id: 'reminders', label: 'Lembretes', icon: Bell },
    { id: 'import', label: 'Planilhas', icon: FileSpreadsheet },
  ];

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-slate-900 dark:bg-[#0B101B] dark:text-slate-100 pb-24 md:pb-12 transition-colors">
      {/* Top Bar: Clean 3-zone contract on desktop, compact 56px bar on mobile */}
      <header className="sticky top-0 z-30 h-14 md:h-16 bg-white/90 dark:bg-[#0F1624]/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 pt-safe">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Wordmark */}
          <button
            type="button"
            onClick={() => setActiveTab('today')}
            className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0"
          >
            Kaju
          </button>

          {/* Zone 2: Desktop Navigation Tabs */}
          <nav
            aria-label="Navegação principal"
            className="hidden md:flex items-center gap-6"
          >
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`min-h-[40px] text-sm font-medium transition-colors whitespace-nowrap shrink-0 border-b-2 px-1 ${
                    isActive
                      ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white'
                      : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Single Primary Action */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => openNewModal('feeding')}
              className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Registrar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Workspace Sub-header: Baby selector & registration, Night Mode toggle, iOS PWA Install */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Rotina de {babyProfile.name || 'Bebê'}
            </h1>
            <button
              type="button"
              onClick={() => openEditBabyModal(babyProfile)}
              aria-label={`Editar perfil de ${babyProfile.name}`}
              className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-200/60 dark:hover:text-white dark:hover:bg-slate-800 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {babyAgeLabel ? `${babyAgeLabel} · ` : ''}
            Amamentação, sono e lembretes adaptativos
          </p>

          {babies.length > 1 && (
            <div
              role="group"
              aria-label="Selecionar bebê"
              className="mt-2.5 flex flex-wrap items-center gap-1.5"
            >
              {babies.map((b) => {
                const isSelected = b.id === babyProfile.id;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => selectBaby(b.id)}
                    aria-pressed={isSelected}
                    className={`min-h-[36px] px-3 rounded-xl text-xs font-medium transition-colors whitespace-nowrap ${
                      isSelected
                        ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-[#131A29] dark:border-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {b.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={openNewBabyModal}
            className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#131A29] px-3 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
          >
            <UserPlus className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Cadastrar Bebê</span>
          </button>

          <button
            type="button"
            onClick={() => setDarkMode((prev) => !prev)}
            aria-label={darkMode ? 'Alternar para tema claro' : 'Alternar para modo noturno'}
            className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#131A29] px-3 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
          >
            {darkMode ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                <span>Claro</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-600" aria-hidden="true" />
                <span>Noturno</span>
              </>
            )}
          </button>

          <PWAInstallButton compact />
        </div>
      </div>

      {/* In-App Smart Notification Toast/Banner */}
      {bannerAlert && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 mb-4">
          <div
            role="status"
            aria-live="polite"
            className="rounded-2xl bg-slate-900 dark:bg-[#1C2538] dark:border dark:border-slate-700 text-white px-4 py-3 flex items-center justify-between gap-3 shadow-md"
          >
            <div className="flex items-center gap-3 min-w-0">
              <Bell className="w-4 h-4 text-amber-300 shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate">{bannerAlert.title}</p>
                <p className="text-xs text-slate-300 truncate">{bannerAlert.body}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setBannerAlert(null)}
              aria-label="Dispensar notificação"
              className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-white/10 shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6">
        {activeTab === 'today' && (
          <TodayView
            entries={entries}
            babyProfile={babyProfile}
            activeTimer={activeTimer}
            activeElapsedSeconds={activeElapsedSeconds}
            predictions={predictions}
            selectedDateKey={selectedDateKey}
            onSelectDateKey={setSelectedDateKey}
            onStartTimer={startTimer}
            onTogglePauseTimer={togglePauseTimer}
            onUpdateActiveTimerMeta={updateActiveTimerMeta}
            onCancelTimer={cancelTimer}
            onFinishAndSaveTimer={(notes) => {
              finishAndSaveTimer(notes);
              setSelectedDateKey(toLocalDateKey(new Date()));
            }}
            onOpenNewModal={openNewModal}
            onEditEntry={openEditModal}
            onDeleteEntry={deleteEntry}
            onOpenRemindersTab={() => setActiveTab('reminders')}
          />
        )}

        {activeTab === 'charts' && <ChartsView entries={entries} />}

        {activeTab === 'reminders' && (
          <RemindersView
            rules={reminderRules}
            predictions={predictions}
            notificationPermission={notificationPermission}
            onUpdateRule={updateReminderRule}
            onRequestPermission={requestNotificationPermission}
            onTriggerTestNotification={() =>
              triggerSystemNotification(
                `Lembrete de teste · ${babyProfile.name}`,
                'As notificações inteligentes do Kaju estão configuradas e funcionando.',
                'feeding'
              )
            }
          />
        )}

        {activeTab === 'import' && (
          <ImportView
            entries={entries}
            babies={babies}
            babyProfile={babyProfile}
            darkMode={darkMode}
            onToggleDarkMode={() => setDarkMode((prev) => !prev)}
            onSelectBaby={selectBaby}
            onOpenNewBaby={openNewBabyModal}
            onEditBaby={openEditBabyModal}
            onUpdateProfile={saveBaby}
            onImportEntries={importEntries}
            onResetDemoData={resetToDemoData}
            onClearAllEntries={clearAllEntries}
          />
        )}
      </main>

      {/* Mobile Fixed Bottom Tab Bar (64px height, Thumb Zone) */}
      <nav
        aria-label="Navegação inferior"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0F1624]/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pb-safe"
      >
        <div className="grid grid-cols-4 h-16 items-center">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`h-full flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
                  isActive
                    ? 'text-slate-900 dark:text-white'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <Icon className="w-5 h-5" aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Manual Entry / Edit Modal */}
      <EntryModal
        isOpen={modalOpen}
        initialEntry={editingEntry}
        defaultType={modalDefaultType}
        defaultDateKey={selectedDateKey}
        onClose={() => setModalOpen(false)}
        onSave={(saved) => {
          addOrUpdateEntry(saved);
          setSelectedDateKey(toLocalDateKey(saved.startTime));
        }}
      />

      {/* Baby Registration / Edit Modal */}
      <BabyModal
        isOpen={babyModalOpen}
        editingBaby={editingBaby}
        canDelete={babies.length > 1}
        onClose={() => setBabyModalOpen(false)}
        onSave={(baby) => saveBaby(baby)}
        onDelete={deleteBaby}
      />

      <OfflineIndicator />
    </div>
  );
}
