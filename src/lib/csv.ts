/**
 * CSV reading and writing. Handles quoted fields, embedded commas and line breaks, and a UTF-8 BOM.
 * This is a small, dependency-free parser. It reads text already loaded in the browser.
 */

export interface ParsedCsv {
  headers: string[];
  /** Data rows. Each row has the same length as `headers` (missing cells are empty strings). */
  rows: string[][];
  /** Line numbers (1-based, counting the header as line 1) of rows that had the wrong number of cells. */
  malformedLineNumbers: number[];
}

export function parseCsvText(text: string): ParsedCsv {
  const source = text.replace(/^\uFEFF/, '');
  const records: string[][] = [];
  let current: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (inQuotes) {
      if (character === '"') {
        if (source[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += character;
      }
      continue;
    }
    if (character === '"') {
      inQuotes = true;
    } else if (character === ',') {
      current.push(cell);
      cell = '';
    } else if (character === '\n' || character === '\r') {
      if (character === '\r' && source[index + 1] === '\n') index += 1;
      current.push(cell);
      records.push(current);
      current = [];
      cell = '';
    } else {
      cell += character;
    }
  }
  if (cell.length > 0 || current.length > 0) {
    current.push(cell);
    records.push(current);
  }

  const nonEmptyRecords = records
    .map((record, index) => ({ record, lineNumber: index + 1 }))
    .filter(({ record }) => record.some((value) => value.trim() !== ''));

  if (nonEmptyRecords.length === 0) {
    return { headers: [], rows: [], malformedLineNumbers: [] };
  }

  const headers = nonEmptyRecords[0].record.map((header) => header.trim());
  const malformedLineNumbers: number[] = [];
  const rows = nonEmptyRecords.slice(1).map(({ record, lineNumber }) => {
    if (record.length !== headers.length) malformedLineNumbers.push(lineNumber);
    return headers.map((_, columnIndex) => (record[columnIndex] ?? '').trim());
  });

  return { headers, rows, malformedLineNumbers };
}

function escapeCsvCell(value: string | number | boolean | null | undefined): string {
  const text = value === null || value === undefined ? '' : String(value);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function stringifyCsv(headers: string[], rows: (string | number | boolean | null | undefined)[][]): string {
  const lines = [headers.map(escapeCsvCell).join(',')];
  for (const row of rows) {
    lines.push(row.map(escapeCsvCell).join(','));
  }
  return `${lines.join('\r\n')}\r\n`;
}

/** Triggers a browser download of text content. No-op outside the browser. */
export function downloadTextFile(fileName: string, content: string, mimeType = 'text/csv;charset=utf-8'): void {
  if (typeof document === 'undefined' || typeof URL === 'undefined') return;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
