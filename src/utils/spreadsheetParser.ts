import {
  BreastSide,
  EntryType,
  ImportPreviewResult,
  ParsedImportRow,
  SleepQuality,
  TrackerEntry,
} from '../types/tracker';

function normalizeKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

export function parseCsvText(text: string): Record<string, string>[] {
  const cleaned = text.replace(/^\uFEFF/, '').trim();
  if (!cleaned) return [];

  const lines = cleaned.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  // Detect delimiter: semicolon is standard in Brazilian Portuguese Excel CSV exports
  const headerLine = lines[0];
  const commaCount = (headerLine.match(/,/g) || []).length;
  const semiCount = (headerLine.match(/;/g) || []).length;
  const tabCount = (headerLine.match(/\t/g) || []).length;
  const delimiter = semiCount >= commaCount && semiCount >= tabCount ? ';' : tabCount > commaCount ? '\t' : ',';

  const splitRow = (line: string): string[] => {
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === delimiter && !inQuotes) {
        cells.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    cells.push(current.trim());
    return cells;
  };

  const headers = splitRow(headerLine);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const vals = splitRow(lines[i]);
    if (vals.every((v) => v === '')) continue;
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      if (h) obj[h] = vals[idx] ?? '';
    });
    rows.push(obj);
  }

  return rows;
}

function parseEntryType(raw: unknown): EntryType | null {
  const val = normalizeKey(String(raw ?? ''));
  if (!val) return null;
  if (
    val.includes('amament') ||
    val.includes('mamada') ||
    val.includes('mama') ||
    val.includes('leite') ||
    val.includes('mamadeira') ||
    val.includes('feed') ||
    val.includes('nursing') ||
    val.includes('breast')
  ) {
    return 'feeding';
  }
  if (
    val.includes('sono') ||
    val.includes('soneca') ||
    val.includes('dorm') ||
    val.includes('sleep') ||
    val.includes('nap')
  ) {
    return 'sleep';
  }
  return null;
}

function parseSide(raw: unknown): BreastSide {
  const val = normalizeKey(String(raw ?? ''));
  if (val.includes('esq') || val === 'e' || val === 'l' || val.includes('left')) return 'left';
  if (val.includes('dir') || val === 'd' || val === 'r' || val.includes('right')) return 'right';
  if (val.includes('amb') || val.includes('dois') || val.includes('both')) return 'both';
  if (val.includes('mamad') || val.includes('bottle') || val.includes('formul')) return 'bottle';
  return 'left';
}

function parseQuality(raw: unknown): SleepQuality | undefined {
  const val = normalizeKey(String(raw ?? ''));
  if (!val) return undefined;
  if (val.includes('profund') || val.includes('deep')) return 'deep';
  if (val.includes('agit') || val.includes('restless') || val.includes('leve')) return 'restless';
  if (val.includes('calm') || val.includes('tranquil') || val.includes('bom')) return 'calm';
  return undefined;
}

export function parseFlexibleDateTime(dateRaw: unknown, timeRaw?: unknown): Date | null {
  // Excel numeric serial date (days since 1899-12-30)
  if (typeof dateRaw === 'number' && Number.isFinite(dateRaw) && dateRaw > 25000) {
    const utcMs = Math.round((dateRaw - 25569) * 86400 * 1000);
    const d = new Date(utcMs);
    if (!Number.isNaN(d.getTime())) {
      if (timeRaw !== undefined && String(timeRaw).trim() !== '') {
        const hm = parseTimeOfDay(timeRaw);
        if (hm) {
          d.setHours(hm.hours, hm.minutes, 0, 0);
        }
      }
      return d;
    }
  }

  const dateStr = String(dateRaw ?? '').trim();
  const timeStr = String(timeRaw ?? '').trim();
  if (!dateStr) return null;

  // Match DD/MM/YYYY [HH:mm[:ss]] or DD-MM-YYYY [HH:mm]
  const brMatch = dateStr.match(
    /^(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})(?:[T\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
  );
  if (brMatch) {
    const day = Number(brMatch[1]);
    const month = Number(brMatch[2]);
    let year = Number(brMatch[3]);
    if (year < 100) year += 2000;
    let hours = brMatch[4] ? Number(brMatch[4]) : 0;
    let minutes = brMatch[5] ? Number(brMatch[5]) : 0;
    const seconds = brMatch[6] ? Number(brMatch[6]) : 0;

    if (!brMatch[4] && timeStr) {
      const hm = parseTimeOfDay(timeStr);
      if (hm) {
        hours = hm.hours;
        minutes = hm.minutes;
      }
    }

    const d = new Date(year, month - 1, day, hours, minutes, seconds, 0);
    if (d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day) {
      return d;
    }
  }

  // Match YYYY-MM-DD [HH:mm[:ss]]
  const isoMatch = dateStr.match(
    /^(\d{4})[/\-](\d{1,2})[/\-](\d{1,2})(?:[T\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
  );
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    let hours = isoMatch[4] ? Number(isoMatch[4]) : 0;
    let minutes = isoMatch[5] ? Number(isoMatch[5]) : 0;
    const seconds = isoMatch[6] ? Number(isoMatch[6]) : 0;

    if (!isoMatch[4] && timeStr) {
      const hm = parseTimeOfDay(timeStr);
      if (hm) {
        hours = hm.hours;
        minutes = hm.minutes;
      }
    }

    const d = new Date(year, month - 1, day, hours, minutes, seconds, 0);
    if (!Number.isNaN(d.getTime())) return d;
  }

  const parsed = new Date(timeStr ? `${dateStr} ${timeStr}` : dateStr);
  if (!Number.isNaN(parsed.getTime())) return parsed;

  return null;
}

function parseTimeOfDay(raw: unknown): { hours: number; minutes: number } | null {
  if (typeof raw === 'number' && raw >= 0 && raw < 1) {
    const totalMin = Math.round(raw * 24 * 60);
    return { hours: Math.floor(totalMin / 60) % 24, minutes: totalMin % 60 };
  }
  const m = String(raw ?? '')
    .trim()
    .match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const hours = Number(m[1]);
  const minutes = Number(m[2]);
  if (hours > 23 || minutes > 59) return null;
  return { hours, minutes };
}

export function parseDurationMinutes(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) {
    return Math.round(raw);
  }
  const str = String(raw ?? '').trim().toLowerCase();
  if (!str) return null;

  // HH:MM:SS or HH:MM
  const colonMatch = str.match(/^(\d+):(\d{1,2})(?::(\d{1,2}))?$/);
  if (colonMatch) {
    const p1 = Number(colonMatch[1]);
    const p2 = Number(colonMatch[2]);
    const p3 = colonMatch[3] ? Number(colonMatch[3]) : null;
    if (p3 !== null) {
      return Math.max(1, Math.round(p1 * 60 + p2 + p3 / 60));
    }
    return Math.max(1, p1 * 60 + p2);
  }

  // "1h 30m" / "1h30"
  const hmMatch = str.match(/(\d+)\s*h(?:\s*(\d+)\s*m?)?/);
  if (hmMatch) {
    const h = Number(hmMatch[1]);
    const m = hmMatch[2] ? Number(hmMatch[2]) : 0;
    return Math.max(1, h * 60 + m);
  }

  // "25 min" or "25"
  const numMatch = str.match(/(\d+(?:[.,]\d+)?)/);
  if (numMatch) {
    const val = Number(numMatch[1].replace(',', '.'));
    if (Number.isFinite(val) && val > 0) return Math.round(val);
  }

  return null;
}

function findColumnValue(row: Record<string, unknown>, aliases: string[]): unknown {
  const keys = Object.keys(row);
  for (const alias of aliases) {
    const found = keys.find((k) => normalizeKey(k) === alias || normalizeKey(k).includes(alias));
    if (found !== undefined && row[found] !== undefined && String(row[found]).trim() !== '') {
      return row[found];
    }
  }
  return undefined;
}

export function parseSpreadsheetRows(
  rawRows: Record<string, unknown>[],
  existingEntries: TrackerEntry[] = []
): ImportPreviewResult {
  const parsedRows: ParsedImportRow[] = [];
  let validCount = 0;
  let duplicateCount = 0;
  let errorCount = 0;

  rawRows.forEach((raw, idx) => {
    const rowNumber = idx + 2; // 1-indexed + header row

    const rawType = findColumnValue(raw, ['tipo', 'categoria', 'evento', 'type', 'category', 'activity']);
    const entryType = parseEntryType(rawType);
    if (!entryType) {
      errorCount++;
      parsedRows.push({
        rowNumber,
        status: 'error',
        errorReason: 'Tipo inválido (use "Amamentação" ou "Sono")',
        rawSummary: String(rawType ?? 'Vazio'),
      });
      return;
    }

    const rawDate = findColumnValue(raw, ['data', 'date', 'dia']);
    const rawStart = findColumnValue(raw, ['inicio', 'horainicio', 'start', 'starttime', 'horario', 'time']);
    const rawEnd = findColumnValue(raw, ['fim', 'horafim', 'termino', 'end', 'endtime']);
    const rawDuration = findColumnValue(raw, ['duracao', 'duracaomin', 'duration', 'minutos', 'minutes']);

    let startDate: Date | null = null;
    if (rawStart !== undefined && rawDate !== undefined) {
      // Check if rawStart already contains full date
      const fullStart = parseFlexibleDateTime(rawStart);
      if (fullStart && String(rawStart).length > 8) {
        startDate = fullStart;
      } else {
        startDate = parseFlexibleDateTime(rawDate, rawStart);
      }
    } else if (rawStart !== undefined) {
      startDate = parseFlexibleDateTime(rawStart);
    } else if (rawDate !== undefined) {
      startDate = parseFlexibleDateTime(rawDate);
    }

    if (!startDate) {
      errorCount++;
      parsedRows.push({
        rowNumber,
        status: 'error',
        errorReason: 'Data/horário de início inválido (ex: 14/11/2026 08:30)',
        rawSummary: `${String(rawDate ?? '')} ${String(rawStart ?? '')}`.trim() || 'Sem data',
      });
      return;
    }

    let durationMin = parseDurationMinutes(rawDuration);
    let endDate: Date | null = null;

    if (rawEnd !== undefined) {
      const fullEnd = parseFlexibleDateTime(rawEnd);
      if (fullEnd && String(rawEnd).length > 8) {
        endDate = fullEnd;
      } else if (rawDate !== undefined) {
        endDate = parseFlexibleDateTime(rawDate, rawEnd);
      } else {
        const hm = parseTimeOfDay(rawEnd);
        if (hm) {
          endDate = new Date(startDate);
          endDate.setHours(hm.hours, hm.minutes, 0, 0);
        }
      }
      if (endDate && endDate.getTime() < startDate.getTime()) {
        // Crossed midnight
        endDate = new Date(endDate.getTime() + 24 * 60 * 60 * 1000);
      }
      if (endDate && durationMin === null) {
        durationMin = Math.round((endDate.getTime() - startDate.getTime()) / 60000);
      }
    }

    if (durationMin === null || durationMin <= 0 || durationMin > 1200) {
      errorCount++;
      parsedRows.push({
        rowNumber,
        status: 'error',
        errorReason: 'Duração ausente ou fora do intervalo válido',
        rawSummary: `${entryType === 'feeding' ? 'Amamentação' : 'Sono'} · ${startDate.toLocaleString('pt-BR')}`,
      });
      return;
    }

    if (!endDate) {
      endDate = new Date(startDate.getTime() + durationMin * 60000);
    }

    // Duplicate check against existing entries and already parsed valid rows
    const startMs = startDate.getTime();
    const isDuplicateExisting = existingEntries.some(
      (e) => e.type === entryType && Math.abs(new Date(e.startTime).getTime() - startMs) <= 120000
    );
    const isDuplicateBatch = parsedRows.some(
      (r) =>
        r.entry &&
        r.entry.type === entryType &&
        Math.abs(new Date(r.entry.startTime).getTime() - startMs) <= 120000
    );

    const notesRaw = findColumnValue(raw, ['notas', 'observacoes', 'obs', 'notes']);
    const notes = notesRaw ? String(notesRaw).trim() : undefined;

    let entry: TrackerEntry;
    if (entryType === 'feeding') {
      const sideRaw = findColumnValue(raw, ['lado', 'seio', 'side', 'breast']);
      const mlRaw = findColumnValue(raw, ['ml', 'quantidade', 'volume', 'amount']);
      const amountMl = mlRaw !== undefined ? Number(String(mlRaw).replace(/[^\d.]/g, '')) || undefined : undefined;
      entry = {
        id: `imp-${startMs}-${idx}`,
        type: 'feeding',
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        durationSeconds: durationMin * 60,
        side: amountMl && !sideRaw ? 'bottle' : parseSide(sideRaw),
        amountMl,
        notes,
      };
    } else {
      const qualityRaw = findColumnValue(raw, ['qualidade', 'quality']);
      const locRaw = findColumnValue(raw, ['local', 'location', 'berco']);
      entry = {
        id: `imp-${startMs}-${idx}`,
        type: 'sleep',
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        durationSeconds: durationMin * 60,
        quality: parseQuality(qualityRaw),
        location: locRaw ? String(locRaw).trim() : undefined,
        notes,
      };
    }

    const summary = `${entryType === 'feeding' ? 'Amamentação' : 'Sono'} · ${durationMin} min`;

    if (isDuplicateExisting || isDuplicateBatch) {
      duplicateCount++;
      parsedRows.push({
        rowNumber,
        status: 'duplicate',
        errorReason: 'Registro já existente neste horário',
        entry,
        rawSummary: summary,
      });
      return;
    }

    validCount++;
    parsedRows.push({
      rowNumber,
      status: 'valid',
      entry,
      rawSummary: summary,
    });
  });

  return {
    totalRows: rawRows.length,
    validCount,
    duplicateCount,
    errorCount,
    rows: parsedRows,
  };
}

export function generateSampleCsv(referenceDate: Date = new Date()): string {
  const fmt = (daysAgo: number, h: number, m: number) => {
    const d = new Date(referenceDate);
    d.setDate(d.getDate() - daysAgo);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return {
      date: `${dd}/${mm}/${yyyy}`,
      time: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
    };
  };

  const r1 = fmt(11, 7, 15);
  const r2 = fmt(11, 8, 45);
  const r3 = fmt(11, 10, 30);
  const r4 = fmt(11, 12, 20);
  const r5 = fmt(10, 6, 40);

  return [
    'Tipo;Data;Inicio;Duracao_Min;Lado;Quantidade_ml;Qualidade;Notas',
    `Amamentação;${r1.date};${r1.time};22;Esquerdo;;;"Mamada tranquila pela manhã"`,
    `Sono;${r2.date};${r2.time};85;;;"Profundo";"Soneca no berço"`,
    `Amamentação;${r3.date};${r3.time};18;Direito;;;"Pega ótima"`,
    `Sono;${r4.date};${r4.time};60;;;"Calmo";"Soneca da tarde"`,
    `Amamentação;${r5.date};${r5.time};15;Mamadeira;110;;"Leite materno ordenhado"`,
  ].join('\n');
}

export function exportEntriesToCsv(entries: TrackerEntry[]): string {
  const header = 'Tipo;Data;Inicio;Fim;Duracao_Min;Lado;Quantidade_ml;Qualidade;Notas';
  const sorted = [...entries].sort(
    (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
  );

  const lines = sorted.map((e) => {
    const start = new Date(e.startTime);
    const end = new Date(e.endTime);
    const dateStr = `${String(start.getDate()).padStart(2, '0')}/${String(start.getMonth() + 1).padStart(2, '0')}/${start.getFullYear()}`;
    const startStr = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`;
    const endStr = `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;
    const durMin = Math.round(e.durationSeconds / 60);
    const safeNotes = (e.notes ?? '').replace(/"/g, '""');

    if (e.type === 'feeding') {
      const sidePt =
        e.side === 'left'
          ? 'Esquerdo'
          : e.side === 'right'
            ? 'Direito'
            : e.side === 'both'
              ? 'Ambos'
              : 'Mamadeira';
      return `Amamentação;${dateStr};${startStr};${endStr};${durMin};${sidePt};${e.amountMl ?? ''};;"${safeNotes}"`;
    }
    const qualPt =
      e.quality === 'deep'
        ? 'Profundo'
        : e.quality === 'restless'
          ? 'Agitado'
          : e.quality === 'calm'
            ? 'Calmo'
            : '';
    return `Sono;${dateStr};${startStr};${endStr};${durMin};;;${qualPt};"${safeNotes}"`;
  });

  return '\uFEFF' + [header, ...lines].join('\n');
}
