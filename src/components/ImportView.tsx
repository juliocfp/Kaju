import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Moon,
  Pencil,
  Plus,
  RotateCcw,
  Sun,
  Trash2,
  Upload,
} from 'lucide-react';
import { BabyProfile, ImportPreviewResult, TrackerEntry } from '../types/tracker';
import {
  exportEntriesToCsv,
  generateSampleCsv,
  parseCsvText,
  parseSpreadsheetRows,
} from '../utils/spreadsheetParser';
import { ageFromBirthDate, formatTimeShort, toLocalDateKey } from '../utils/trackerLogic';

interface ImportViewProps {
  entries: TrackerEntry[];
  babies: BabyProfile[];
  babyProfile: BabyProfile;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onSelectBaby: (id: string) => void;
  onOpenNewBaby: () => void;
  onEditBaby: (baby: BabyProfile) => void;
  onUpdateProfile: (profile: BabyProfile) => void;
  onImportEntries: (entries: TrackerEntry[]) => void;
  onResetDemoData: () => void;
  onClearAllEntries: () => void;
}

export const ImportView: React.FC<ImportViewProps> = ({
  entries,
  babies,
  babyProfile,
  darkMode,
  onToggleDarkMode,
  onSelectBaby,
  onOpenNewBaby,
  onEditBaby,
  onImportEntries,
  onResetDemoData,
  onClearAllEntries,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [importFeedback, setImportFeedback] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const processFile = async (file: File) => {
    setParseError(null);
    setImportFeedback(null);
    setFileName(file.name);

    try {
      const lower = file.name.toLowerCase();
      if (lower.endsWith('.csv') || lower.endsWith('.tsv') || lower.endsWith('.txt')) {
        const text = await file.text();
        const rawRows = parseCsvText(text);
        if (rawRows.length === 0) {
          setParseError('A planilha parece vazia ou não possui cabeçalho válido.');
          setPreview(null);
          return;
        }
        setPreview(parseSpreadsheetRows(rawRows, entries));
      } else {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          setParseError('Nenhuma aba encontrada no arquivo Excel.');
          setPreview(null);
          return;
        }
        const sheet = workbook.Sheets[firstSheetName];
        const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
          defval: '',
        });
        if (rawRows.length === 0) {
          setParseError('Nenhuma linha de dados encontrada na primeira aba.');
          setPreview(null);
          return;
        }
        setPreview(parseSpreadsheetRows(rawRows, entries));
      }
    } catch {
      setParseError('Não foi possível ler este arquivo. Use formato .xlsx, .xls ou .csv.');
      setPreview(null);
    }
  };

  const handleLoadSample = () => {
    setParseError(null);
    setImportFeedback(null);
    const csv = generateSampleCsv();
    const rawRows = parseCsvText(csv);
    setFileName('exemplo_historico_kaju.csv');
    setPreview(parseSpreadsheetRows(rawRows, entries));
  };

  const handleConfirmImport = () => {
    if (!preview) return;
    const validEntries = preview.rows
      .filter((r) => r.status === 'valid' && r.entry)
      .map((r) => r.entry!);
    if (validEntries.length === 0) return;

    onImportEntries(validEntries);
    setImportFeedback(
      `${validEntries.length} ${
        validEntries.length === 1 ? 'registro importado' : 'registros importados'
      } com sucesso para o histórico.`
    );
    setPreview(null);
    setFileName(null);
  };

  const handleDownloadSampleCsv = () => {
    const csv = '\uFEFF' + generateSampleCsv();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modelo_rotina_kaju.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportXlsx = () => {
    const csvText = exportEntriesToCsv(entries);
    const rows = parseCsvText(csvText);
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rotina');
    XLSX.writeFile(wb, `kaju_historico_${toLocalDateKey(new Date())}.xlsx`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left 7 Cols: Spreadsheet Import & Preview */}
      <div className="lg:col-span-7 space-y-5">
        <section
          aria-labelledby="import-heading"
          className="rounded-3xl bg-white dark:bg-[#131A29] border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-sm"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2
                id="import-heading"
                className="text-lg font-bold text-slate-900 dark:text-white"
              >
                Importar Planilha Histórica
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Aceita arquivos Excel (.xlsx, .xls) ou CSV (.csv) com colunas de tipo, data, início e duração.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleDownloadSampleCsv}
                className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 px-3 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Baixar Modelo</span>
              </button>
              <button
                type="button"
                onClick={handleExportXlsx}
                className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 px-3 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Exportar (.xlsx)</span>
              </button>
            </div>
          </div>

          {/* Dropzone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const f = e.dataTransfer.files?.[0];
              if (f) void processFile(f);
            }}
            className={`mt-5 rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${
              isDragging
                ? 'border-slate-900 bg-slate-100/80 dark:border-slate-200 dark:bg-slate-800/60'
                : 'border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40'
            }`}
          >
            <Upload
              className="w-8 h-8 mx-auto text-slate-400 dark:text-slate-500"
              aria-hidden="true"
            />
            <p className="mt-3 text-sm font-medium text-slate-800 dark:text-slate-200">
              Arraste sua planilha aqui ou selecione do iPhone / iCloud
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Colunas reconhecidas: Tipo, Data, Início, Fim ou Duração (min), Lado, ml, Notas
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.tsv,.xlsx,.xls"
              aria-label="Selecionar arquivo de planilha"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void processFile(f);
                e.target.value = '';
              }}
              className="sr-only"
            />

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="min-h-[44px] px-4 rounded-xl bg-slate-900 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition-colors"
              >
                Escolher Arquivo (.xlsx / .csv)
              </button>
              <button
                type="button"
                onClick={handleLoadSample}
                className="min-h-[44px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Carregar Planilha de Exemplo
              </button>
            </div>
          </div>

          {parseError && (
            <p
              role="alert"
              className="mt-4 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/50 px-4 py-3 text-xs font-medium text-rose-700 dark:text-rose-300"
            >
              {parseError}
            </p>
          )}

          {importFeedback && (
            <div
              role="status"
              className="mt-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 px-4 py-3 flex items-center gap-2 text-xs font-medium text-emerald-800 dark:text-emerald-300"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{importFeedback}</span>
            </div>
          )}

          {/* Validation Preview */}
          {preview && (
            <div className="mt-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Prévia: {fileName}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                    {preview.validCount} válidos · {preview.duplicateCount} duplicados ·{' '}
                    {preview.errorCount} com erro
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPreview(null);
                      setFileName(null);
                    }}
                    className="min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={preview.validCount === 0}
                    onClick={handleConfirmImport}
                    className="min-h-[40px] px-4 rounded-xl bg-slate-900 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-40 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white whitespace-nowrap"
                  >
                    Confirmar Importação ({preview.validCount})
                  </button>
                </div>
              </div>

              <div className="max-h-72 overflow-y-auto rounded-2xl border border-slate-100 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900/70 text-slate-500 dark:text-slate-400 sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3 font-medium">Linha</th>
                      <th className="py-2.5 px-3 font-medium">Registro</th>
                      <th className="py-2.5 px-3 font-medium">Horário</th>
                      <th className="py-2.5 px-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {preview.rows.map((row) => (
                      <tr key={row.rowNumber}>
                        <td className="py-2.5 px-3 font-mono text-slate-500">#{row.rowNumber}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                          {row.rawSummary}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {row.entry
                            ? `${toLocalDateKey(row.entry.startTime).split('-').reverse().join('/')} ${formatTimeShort(row.entry.startTime)}`
                            : '—'}
                        </td>
                        <td className="py-2.5 px-3">
                          {row.status === 'valid' ? (
                            <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                              Pronto para importar
                            </span>
                          ) : row.status === 'duplicate' ? (
                            <span className="text-amber-700 dark:text-amber-400">
                              Ignorado · {row.errorReason}
                            </span>
                          ) : (
                            <span className="text-rose-700 dark:text-rose-400">
                              Erro · {row.errorReason}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Right 5 Cols: Baby Registry, Night Mode & Data Management */}
      <div className="lg:col-span-5 space-y-5">
        <section
          aria-labelledby="profile-heading"
          className="rounded-3xl bg-white dark:bg-[#131A29] border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between gap-3">
            <h2
              id="profile-heading"
              className="text-base font-semibold text-slate-900 dark:text-white"
            >
              Bebês Cadastrados
            </h2>
            <button
              type="button"
              onClick={onOpenNewBaby}
              className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition-colors whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Cadastrar Bebê</span>
            </button>
          </div>

          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {babies.map((b) => {
              const isSelected = b.id === babyProfile.id;
              const ageInfo = ageFromBirthDate(b.birthDate);
              return (
                <li key={b.id} className="py-3 first:pt-1 last:pb-1 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => onSelectBaby(b.id)}
                    aria-pressed={isSelected}
                    className="flex-1 text-left min-h-[44px] flex flex-col justify-center rounded-xl px-2 -mx-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                  >
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {b.name}
                      {isSelected && (
                        <span className="ml-2 text-xs font-normal text-[#C85A32] dark:text-[#F08A65]">
                          · Ativo
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {ageInfo.label || 'Idade não informada'} · Meta: {b.dailyFeedingGoalCount} mamadas /{' '}
                      {Math.round(b.dailySleepGoalMinutes / 60)}h sono
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onEditBaby(b)}
                    aria-label={`Editar cadastro de ${b.name}`}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-slate-800"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                Modo Noturno (3h da manhã)
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Reduz o brilho da tela para mamadas na madrugada.
              </p>
            </div>
            <button
              type="button"
              onClick={onToggleDarkMode}
              className="min-h-[44px] inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-3.5 text-xs font-medium text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
            >
              {darkMode ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400" aria-hidden="true" />
                  <span>Tema Claro</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-indigo-600" aria-hidden="true" />
                  <span>Modo Noturno</span>
                </>
              )}
            </button>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              Total armazenado: {entries.length} registros
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onResetDemoData}
                className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 px-3 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Restaurar Exemplo</span>
              </button>
              <button
                type="button"
                onClick={onClearAllEntries}
                className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl border border-rose-200 dark:border-rose-900 px-3 text-xs font-medium text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Limpar Tudo</span>
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
