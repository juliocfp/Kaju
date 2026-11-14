import test from 'node:test';
import assert from 'node:assert/strict';
import {
  exportEntriesToCsv,
  generateSampleCsv,
  parseCsvText,
  parseDurationMinutes,
  parseFlexibleDateTime,
  parseSpreadsheetRows,
} from './spreadsheetParser';
import { TrackerEntry } from '../types/tracker';

test('parseCsvText handles Portuguese semicolon CSV with BOM and quotes', () => {
  const csv = '\uFEFFTipo;Data;Inicio;Duracao_Min;Lado;Notas\r\nAmamentação;14/11/2026;08:30;22;Esquerdo;"Mamada; tranquila"\r\nSono;14/11/2026;09:15;90;;"Berço"';
  const rows = parseCsvText(csv);
  assert.equal(rows.length, 2);
  assert.equal(rows[0]['Tipo'], 'Amamentação');
  assert.equal(rows[0]['Notas'], 'Mamada; tranquila');
  assert.equal(rows[1]['Duracao_Min'], '90');
});

test('parseFlexibleDateTime and parseDurationMinutes support Brazilian and ISO formats', () => {
  const d1 = parseFlexibleDateTime('14/11/2026', '08:45');
  assert.ok(d1);
  assert.equal(d1.getFullYear(), 2026);
  assert.equal(d1.getMonth(), 10);
  assert.equal(d1.getDate(), 14);
  assert.equal(d1.getHours(), 8);
  assert.equal(d1.getMinutes(), 45);

  assert.equal(parseDurationMinutes('25 min'), 25);
  assert.equal(parseDurationMinutes('1h 30m'), 90);
  assert.equal(parseDurationMinutes('00:20:00'), 20);
});

test('parseSpreadsheetRows validates rows, detects duplicates, and flags errors', () => {
  const existingStart = new Date(2026, 10, 14, 8, 30, 0, 0);
  const existing: TrackerEntry[] = [
    {
      id: 'ex-1',
      type: 'feeding',
      startTime: existingStart.toISOString(),
      endTime: new Date(existingStart.getTime() + 20 * 60000).toISOString(),
      durationSeconds: 1200,
      side: 'left',
    },
  ];

  const rows = [
    {
      Tipo: 'Amamentação',
      Data: '14/11/2026',
      Inicio: '08:31', // within 2 min -> duplicate
      Duracao_Min: '20',
      Lado: 'Esquerdo',
    },
    {
      Tipo: 'Sono',
      Data: '14/11/2026',
      Inicio: '10:00',
      Fim: '11:30',
      Qualidade: 'Profundo',
    },
    {
      Tipo: 'Desconhecido',
      Data: '14/11/2026',
      Inicio: '12:00',
      Duracao_Min: '15',
    },
  ];

  const result = parseSpreadsheetRows(rows, existing);
  assert.equal(result.totalRows, 3);
  assert.equal(result.duplicateCount, 1);
  assert.equal(result.validCount, 1);
  assert.equal(result.errorCount, 1);
  assert.equal(result.rows[1].entry?.type, 'sleep');
  assert.equal(result.rows[1].entry?.durationSeconds, 5400);
});

test('generateSampleCsv and exportEntriesToCsv roundtrip cleanly', () => {
  const sample = generateSampleCsv(new Date(2026, 10, 14, 12, 0));
  const parsedRows = parseCsvText(sample);
  const preview = parseSpreadsheetRows(parsedRows, []);
  assert.equal(preview.validCount, 5);
  assert.equal(preview.errorCount, 0);

  const validEntries = preview.rows.map((r) => r.entry!).filter(Boolean);
  const exported = exportEntriesToCsv(validEntries);
  const reParsed = parseSpreadsheetRows(parseCsvText(exported), []);
  assert.equal(reParsed.validCount, 5);
});
