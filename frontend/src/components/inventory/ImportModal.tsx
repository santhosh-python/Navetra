import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { Check, Download, FileSpreadsheet, UploadCloud } from "lucide-react";
import { parseInventoryCsv, type InventoryCsvMapping } from "../../lib/csv";
import { useAppState } from "../../hooks/useAppState";
import { useToast } from "../../hooks/useToast";
import type { InventoryItem } from "../../types/inventory";
import { Button } from "../common/Button";
import { EmptyState } from "../common/EmptyState";
import { Modal } from "../common/Modal";
import { StatusBadge } from "../common/StatusBadge";

interface ImportModalProps {
  onClose: () => void;
}

const columns: { key: keyof InventoryItem; label: string; required: boolean }[] = [
  { key: "id", label: "Record ID", required: true },
  { key: "sku", label: "SKU", required: true },
  { key: "name", label: "Item name", required: true },
  { key: "category", label: "Category", required: true },
  { key: "location", label: "Location", required: true },
  { key: "unit", label: "Stock unit", required: true },
  { key: "currentStock", label: "Available stock", required: true },
  { key: "averageDailyUsage", label: "Average daily usage", required: true },
  { key: "minimumStock", label: "Minimum stock", required: true },
  { key: "safetyStock", label: "Safety stock", required: true },
  { key: "supplierName", label: "Supplier name", required: true },
  { key: "leadTimeDays", label: "Lead time (days)", required: true },
  { key: "expectedDeliveryDate", label: "Expected delivery date", required: false },
  { key: "incomingQuantity", label: "Incoming quantity", required: true },
  { key: "unitCost", label: "Unit cost (INR)", required: true },
  { key: "criticality", label: "Criticality", required: true },
];

function initialMapping(headers: string[]): InventoryCsvMapping {
  return Object.fromEntries(
    columns.map(({ key }) => [key, headers.includes(key) ? key : ""]),
  ) as InventoryCsvMapping;
}

export function ImportModal({ onClose }: ImportModalProps) {
  const { replaceInventoryItems } = useAppState();
  const showToast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const hasSelectedFile = useRef(false);
  const [csvText, setCsvText] = useState<string | null>(null);
  const [fileName, setFileName] = useState("inventory-sample.csv");
  const [isSample, setIsSample] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [mapping, setMapping] = useState<InventoryCsvMapping>({});
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showMapping, setShowMapping] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/sample-data/inventory-sample.csv")
      .then((response) => {
        if (!response.ok) throw new Error("The sample CSV could not be loaded.");
        return response.text();
      })
      .then((text) => {
        if (!active || hasSelectedFile.current) return;
        const parsed = parseInventoryCsv(text);
        setMapping(initialMapping(parsed.headers));
        setCsvText(text);
        setIsLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setFileError("The sample file is unavailable. You can choose a CSV file to continue.");
        setIsLoading(false);
      });
    return () => { active = false; };
  }, []);

  const preview = useMemo(
    () => (csvText === null ? null : parseInventoryCsv(csvText, mapping)),
    [csvText, mapping],
  );

  const loadFile = async (file: File) => {
    hasSelectedFile.current = true;
    setFileError(null);
    setFileName(file.name);
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (extension === "xlsx" || extension === "xls") {
      setCsvText(null);
      setFileName(file.name);
      setFileError("Excel workbook parsing is not enabled in this demo. Save the sheet as CSV, or connect workbook parsing in the backend stage.");
      setIsSample(false);
      return;
    }
    if (extension !== "csv" && file.type !== "text/csv") {
      setCsvText(null);
      setFileError("Choose a CSV file. Excel workbooks are not processed in this browser demo.");
      setIsSample(false);
      return;
    }

    try {
      const text = await file.text();
      const parsed = parseInventoryCsv(text);
      setFileName(file.name);
      setMapping(initialMapping(parsed.headers));
      setCsvText(text);
      setIsSample(false);
      setShowMapping(false);
    } catch {
      setCsvText(null);
      setFileError("The selected file could not be read. Try exporting it as UTF-8 CSV.");
    }
  };

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void loadFile(file);
    event.target.value = "";
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) void loadFile(file);
  };

  const handleImport = () => {
    if (!preview?.isValid) return;
    replaceInventoryItems(preview.rows, "imported");
    showToast({
      tone: "success",
      title: `${preview.rows.length} records loaded for this session`,
      description: "The CSV was parsed and validated in this browser. Nothing has been sent to a server or saved permanently.",
    });
    onClose();
  };

  const mappedHeaderCount = columns.filter(({ key }) => Boolean(mapping[key])).length;
  const canImport = Boolean(preview?.isValid && !fileError && !isLoading);

  return (
    <Modal
      title="Upload inventory data"
      description="Review the sample or validate a CSV before replacing the current local demo records."
      onClose={onClose}
      size="wide"
      footer={
        <>
          <span className="modal-footer-note">
            {preview ? `${preview.rows.length} valid of ${preview.rowCount} rows` : "Choose a CSV to preview"}
          </span>
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="button" variant="primary" disabled={!canImport} onClick={handleImport}>
            <Check size={16} /> Load validated data
          </Button>
        </>
      }
    >
      <div className="import-layout">
        <div
          className={`upload-dropzone${isDragging ? " upload-dropzone--dragging" : ""}`}
          onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
        >
          <span className="upload-dropzone__icon"><UploadCloud size={22} /></span>
          <div>
            <strong>Drop a CSV file here, or <button className="inline-action" type="button" onClick={() => fileInput.current?.click()}>browse files</button></strong>
            <p>UTF-8 CSV is parsed and validated in your browser. Excel workbooks are not parsed in this demo.</p>
          </div>
          <input ref={fileInput} className="visually-hidden" type="file" accept=".csv,text/csv,.xlsx,.xls" onChange={onFileChange} aria-label="Choose inventory data file" />
        </div>

        <div className="import-file-row">
          <span className="import-file-row__file"><FileSpreadsheet size={17} /><strong>{fileName}</strong><span>{isSample ? "Sample preview" : "Selected file"}</span></span>
          <a className="quiet-link" href="/sample-data/inventory-sample.csv" download>
            <Download size={15} /> Download sample CSV
          </a>
        </div>

        {fileError ? <div className="inline-alert inline-alert--error" role="alert">{fileError}</div> : null}
        {isLoading ? <p className="loading-state" role="status">Loading sample preview…</p> : null}

        <div className="import-section-heading">
          <div><h3>Column mapping</h3><p>Match file headers to Navetra fields before validation.</p></div>
          <Button type="button" variant="text" onClick={() => setShowMapping((current) => !current)} aria-expanded={showMapping}>
            {showMapping ? "Hide mapping" : "Review mapping"}
          </Button>
        </div>
        {showMapping ? (
          <div className="mapping-grid">
            {columns.map(({ key, label, required }) => (
              <label className="mapping-row" key={key}>
                <span>{label}{required ? <b> *</b> : <small> (optional)</small>}</span>
                <select value={mapping[key] ?? ""} onChange={(event) => setMapping((current) => ({ ...current, [key]: event.target.value }))}>
                  <option value="">Not mapped</option>
                  {preview?.headers.map((header) => <option key={`${key}-${header}`} value={header}>{header}</option>)}
                </select>
              </label>
            ))}
          </div>
        ) : null}

        <div className="import-section-heading import-section-heading--preview">
          <div><h3>Validation preview</h3><p>{preview ? `${preview.rowCount} row${preview.rowCount === 1 ? "" : "s"} found · ${mappedHeaderCount} fields mapped` : "No file parsed yet"}</p></div>
          {preview ? <StatusBadge tone={preview.isValid ? "low" : "high"}>{preview.isValid ? "Ready to load" : `${preview.issues.length} issue${preview.issues.length === 1 ? "" : "s"}`}</StatusBadge> : null}
        </div>

        {preview && preview.rows.length ? (
          <div className="preview-table-wrap">
            <table className="preview-table">
              <thead><tr><th>Item</th><th>SKU</th><th>Stock</th><th>Daily use</th><th>Delivery date</th><th>Validation</th></tr></thead>
              <tbody>
                {preview.rows.slice(0, 5).map((row) => (
                  <tr key={row.id}><td>{row.name}</td><td className="mono-cell">{row.sku}</td><td>{row.currentStock} {row.unit}</td><td>{row.averageDailyUsage} {row.unit}/day</td><td>{row.expectedDeliveryDate || "Not scheduled"}</td><td><span className="validation-ok"><Check size={13} /> Valid</span></td></tr>
                ))}
              </tbody>
            </table>
            {preview.rows.length > 5 ? <p className="table-footnote">Showing the first 5 valid rows of {preview.rows.length}.</p> : null}
          </div>
        ) : preview && preview.issues.length === 0 ? (
          <EmptyState title="No data rows" description="The CSV has column headers but no inventory records." />
        ) : null}

        {preview?.issues.length ? (
          <div className="validation-issues" role="alert">
            <strong>Review these issues before loading</strong>
            <ul>{preview.issues.slice(0, 6).map((issue, index) => <li key={`${issue.rowNumber}-${issue.column}-${index}`}><span>Row {issue.rowNumber}{issue.column ? ` · ${issue.column}` : ""}</span>{issue.message}</li>)}</ul>
            {preview.issues.length > 6 ? <small>And {preview.issues.length - 6} more issue(s).</small> : null}
          </div>
        ) : null}

        {isSample ? <p className="sample-data-note">The included sample is synthetic. Loading it replaces the in-memory inventory for this browser session only.</p> : null}
      </div>
    </Modal>
  );
}
