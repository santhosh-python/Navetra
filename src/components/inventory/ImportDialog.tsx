import { useMemo, useState, type DragEvent } from 'react';
import { Download, FileUp } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Alert } from '../common/Alert';
import { Badge } from '../common/StatusBadge';
import { parseCsvText, stringifyCsv, downloadTextFile, type ParsedCsv } from '../../lib/csv';
import { INVENTORY_FIELDS, REQUIRED_CSV_HEADERS, type InventoryFieldKey } from '../../lib/inventorySchema';
import { buildInventoryCsv } from '../../lib/inventoryExport';
import { DEMO_ITEMS } from '../../data/demoInventory';
import { createColumnMapping, validateImportRows, type ColumnMapping } from '../../lib/validators';
import { useInventory } from '../../hooks/useInventory';
import { useNotifications } from '../../hooks/useNotifications';

const MAX_FILE_BYTES = 2 * 1024 * 1024;
const PREVIEW_ROWS = 50;

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
}

/**
 * CSV import, read entirely in the browser. Nothing is imported until every row passes checks:
 * a single invalid row blocks the whole file, so the inventory never receives partial or guessed data.
 * Excel (.xlsx) is deferred to the backend.
 */
export function ImportDialog({ open, onClose }: ImportDialogProps) {
  const { items, importItems } = useInventory();
  const { showToast } = useNotifications();
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [importing, setImporting] = useState(false);

  const existingSkus = useMemo(() => items.map((item) => item.sku), [items]);

  const report = useMemo(() => {
    if (!parsed || !mapping) return null;
    return validateImportRows(parsed.headers, parsed.rows, mapping, { existingSkus });
  }, [parsed, mapping, existingSkus]);

  const reset = () => {
    setFileName(null);
    setParsed(null);
    setMapping(null);
    setFileError(null);
    setImportError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const loadFile = async (file: File) => {
    setFileError(null);
    setImportError(null);
    const isCsv = /\.csv$/i.test(file.name) || file.type === 'text/csv';
    if (!isCsv) {
      setFileError('Only CSV files (.csv) can be imported in the browser. Export your spreadsheet as CSV first. Excel import is planned for the backend.');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setFileError('This file is larger than 2 MB. Split it into smaller files.');
      return;
    }
    const text = await file.text();
    const result = parseCsvText(text);
    if (result.headers.length === 0 || result.rows.length === 0) {
      setFileError('The file has no data rows. Check that the first line contains column headers.');
      return;
    }
    setFileName(file.name);
    setParsed(result);
    setMapping(createColumnMapping(result.headers));
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void loadFile(file);
  };

  const downloadTemplate = () => {
    const headers = INVENTORY_FIELDS.map((field) => field.csvHeader);
    downloadTextFile('navetra-inventory-template.csv', stringifyCsv(headers, []));
  };

  /** Synthetic sample rows in the import format, so a user can try the import before preparing their own file. */
  const downloadSample = () => {
    const sample = buildInventoryCsv(DEMO_ITEMS);
    downloadTextFile('navetra-sample-inventory-synthetic.csv', stringifyCsv(sample.headers, sample.rows));
  };

  const exportCurrent = () => {
    const csv = buildInventoryCsv(items);
    downloadTextFile('navetra-inventory-current-items.csv', stringifyCsv(csv.headers, csv.rows));
  };

  const updateMapping = (key: InventoryFieldKey, header: string) => {
    setMapping((current) => (current ? { ...current, [key]: header } : current));
  };

  const canImport = report !== null && report.rows.length > 0 && report.invalidCount === 0 && report.unmappedRequiredFields.length === 0 && !importing;

  const handleImport = async () => {
    if (!report || !canImport) return;
    setImporting(true);
    setImportError(null);
    try {
      const inputs = report.rows.map((row) => row.item).filter((item): item is NonNullable<typeof item> => item !== null);
      const added = await importItems(inputs);
      showToast(`Imported ${added} ${added === 1 ? 'item' : 'items'}. They are kept in this browser session only.`);
      handleClose();
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'The import did not complete. Nothing was added.');
    } finally {
      setImporting(false);
    }
  };

  const headerOptions = parsed?.headers ?? [];

  return (
    <Modal
      open={open}
      onClose={handleClose}
      wide
      title="Import inventory from CSV"
      description="Upload a CSV file, check each row, then import. Excel (.xlsx) import is planned for the backend."
      footer={
        <>
          {report && (
            <span className="modal__footer-note">
              {report.validCount} valid · {report.invalidCount} need fixing
            </span>
          )}
          <Button onClick={handleClose}>Cancel</Button>
          {!parsed && (
            <Button icon={<Download size={15} aria-hidden="true" />} onClick={downloadTemplate}>
              Download template
            </Button>
          )}
          {!parsed && (
            <Button icon={<Download size={15} aria-hidden="true" />} onClick={downloadSample}>
              Download sample data
            </Button>
          )}
          <Button variant="primary" disabled={!canImport} onClick={handleImport}>
            {importing ? 'Importing…' : report ? `Import ${report.validCount} valid ${report.validCount === 1 ? 'row' : 'rows'}` : 'Import'}
          </Button>
        </>
      }
    >
      {fileError && (
        <div style={{ marginBottom: 16 }}>
          <Alert tone="error">{fileError}</Alert>
        </div>
      )}
      {importError && (
        <div style={{ marginBottom: 16 }}>
          <Alert tone="error">{importError}</Alert>
        </div>
      )}

      {!parsed && (
        <div className="stack-3">
          <div
            className={`dropzone ${dragging ? 'dropzone--active' : ''}`}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            <FileUp size={28} aria-hidden="true" />
            <span className="dropzone__title">Drop a CSV file here</span>
            <span className="text-small">or</span>
            <label className="btn btn--primary" style={{ cursor: 'pointer' }}>
              Choose CSV file
              <input
                type="file"
                accept=".csv,text/csv"
                className="visually-hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void loadFile(file);
                  event.target.value = '';
                }}
              />
            </label>
            <span className="text-small">Required columns: {REQUIRED_CSV_HEADERS.join(', ')}.</span>
          </div>
          <p className="chart-note" style={{ marginTop: 14 }}>
            Your file stays in this browser. It is checked row by row before anything is added. Duplicate SKUs, existing SKUs and invalid values block the import.
          </p>
        </div>
      )}

      {parsed && report && mapping && (
        <div className="stack-4">
          <div className="import-summary">
            <Badge tone="info">{fileName}</Badge>
            <Badge tone="safe">{report.validCount} valid</Badge>
            <Badge tone={report.invalidCount > 0 ? 'critical' : 'neutral'}>{report.invalidCount} need fixing</Badge>
            {parsed.malformedLineNumbers.length > 0 && <Badge tone="warning">Malformed lines: {parsed.malformedLineNumbers.join(', ')}</Badge>}
          </div>

          {report.unmappedRequiredFields.length > 0 && (
            <Alert tone="warning">Map a column for: {report.unmappedRequiredFields.map((key) => INVENTORY_FIELDS.find((field) => field.key === key)?.label).join(', ')}. The import stays blocked until these are mapped.</Alert>
          )}
          {report.invalidCount > 0 && <Alert tone="error">Fix the rows marked below in the file, then upload it again. No rows have been imported.</Alert>}

          <details>
            <summary style={{ cursor: 'pointer', fontWeight: 500 }}>Column mapping ({parsed.headers.length} columns in file)</summary>
            <div className="mapping-grid" style={{ marginTop: 12 }}>
              {INVENTORY_FIELDS.map((field) => (
                <div key={field.key} style={{ display: 'contents' }}>
                  <label className="mapping-grid__label" htmlFor={`map-${field.key}`}>
                    {field.label}
                    {field.required && <span aria-label="required"> *</span>}
                  </label>
                  <select id={`map-${field.key}`} className="select" value={mapping[field.key]} onChange={(event) => updateMapping(field.key, event.target.value)}>
                    <option value="">Not in file</option>
                    {headerOptions.map((header) => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </details>

          <div className="table-wrap" style={{ maxHeight: 320, overflow: 'auto' }}>
            <table className="table table--compact import-table">
              <caption className="visually-hidden">Preview of checked rows</caption>
              <thead>
                <tr>
                  <th scope="col">Line</th>
                  <th scope="col">Status</th>
                  <th scope="col">SKU</th>
                  <th scope="col">Name</th>
                  <th scope="col">Problems</th>
                </tr>
              </thead>
              <tbody>
                {report.rows.slice(0, PREVIEW_ROWS).map((row) => (
                  <tr key={row.lineNumber}>
                    <td className="num">{row.lineNumber}</td>
                    <td>{row.status === 'valid' ? <Badge tone="safe">Valid</Badge> : <Badge tone="critical">Fix</Badge>}</td>
                    <td className={row.fieldErrors.sku ? 'is-invalid' : undefined}>{row.values.sku || '—'}</td>
                    <td className={row.fieldErrors.name ? 'is-invalid' : undefined}>{row.values.name || '—'}</td>
                    <td>{row.messages.length > 0 ? <ul className="import-error-list">{row.messages.map((message) => <li key={message}>{message}</li>)}</ul> : <span className="text-subtle">None</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {report.rows.length > PREVIEW_ROWS && <p className="chart-note">Showing the first {PREVIEW_ROWS} of {report.rows.length} rows.</p>}
          <div className="row row--wrap">
            <Button size="sm" onClick={() => { reset(); }}>
              Choose a different file
            </Button>
            <Button size="sm" variant="ghost" onClick={exportCurrent} icon={<Download size={14} aria-hidden="true" />}>
              Export current inventory as CSV
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
