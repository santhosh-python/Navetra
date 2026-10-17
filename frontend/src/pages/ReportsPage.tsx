import { useMemo, useState } from "react";
import { Download, FileText, Printer } from "lucide-react";
import { DateRangePills } from "../components/common/DateRangePills";
import { EmptyState } from "../components/common/EmptyState";
import { SelectFilter } from "../components/common/SelectFilter";
import { StatusBadge } from "../components/common/StatusBadge";
import { PageHeader } from "../components/layout/PageHeader";
import { demoHistory } from "../data/demoHistory";
import { DEMO_AS_OF_DATE } from "../data/demoInventory";
import { useAppState } from "../hooks/useAppState";
import { useToast } from "../hooks/useToast";
import { downloadTextFile, inventoryToCsv } from "../lib/csvExport";
import { formatCurrency, formatDate, formatNumber } from "../lib/formatters";
import { getInventoryMetrics, getRiskLabel } from "../lib/inventoryMetrics";
import type { AppSettings } from "../types/app";
import type { InventoryItem } from "../types/inventory";

type ReportType = "inventory" | "shortages" | "replenishment" | "reorder" | "consumption" | "assumptions";
type ReportRow = ReturnType<typeof reportRows>[number];

const reportOptions: { value: ReportType; label: string; title: string; description: string }[] = [
  { value: "inventory", label: "Inventory status", title: "Current inventory status", description: "Stock records and their current rule-based risk classification." },
  { value: "shortages", label: "Critical shortage report", title: "Critical shortage report", description: "Items at critical risk or projected to deplete before expected replenishment." },
  { value: "replenishment", label: "Upcoming replenishment", title: "Upcoming replenishment", description: "Expected inbound deliveries within the selected horizon." },
  { value: "reorder", label: "Reorder recommendations", title: "Reorder recommendations", description: "Illustrative reorder-up-to quantities from the configured starter rule." },
  { value: "consumption", label: "Consumption summary", title: "Consumption summary", description: "Average daily usage by item from the synthetic history sample." },
  { value: "assumptions", label: "Forecast assumptions", title: "Forecast assumptions", description: "Current usage, lead time, thresholds, and delivery assumptions used in rule-based forecasts." },
];

function reportRows(type: ReportType, items: readonly InventoryItem[], rangeDays: number, thresholds: AppSettings["riskThresholds"]) {
  return items.map((item) => {
    const metrics = getInventoryMetrics(item, DEMO_AS_OF_DATE, thresholds);
    const history = demoHistory.filter((entry) => entry.inventoryItemId === item.id).slice(-rangeDays);
    const averageHistory = history.length
      ? history.reduce((sum, entry) => sum + entry.consumption, 0) / history.length
      : item.averageDailyUsage;
    return { item, metrics, averageHistory, historyDays: history.length };
  }).filter(({ item, metrics }) => {
    if (type === "shortages") return metrics.shortageGapDays > 0 || metrics.riskLevel === "critical";
    if (type === "replenishment") return item.incomingQuantity > 0 && metrics.daysUntilDelivery <= rangeDays;
    if (type === "reorder") return metrics.reorderQuantity > 0;
    return true;
  });
}

function buildReportCsv(type: ReportType, rows: readonly ReportRow[], rangeDays: number, settings: AppSettings): string {
  if (type === "inventory") return inventoryToCsv(rows.map(({ item }) => item));
  const head = type === "consumption"
    ? ["sku", "item", "category", "location", "averageDailyUsage", "unit", "historyDays", "requestedWindowDays"]
    : type === "replenishment"
      ? ["sku", "item", "supplier", "category", "location", "incomingQuantity", "unit", "expectedDeliveryDate", "dateSource", "leadTimeDays"]
      : type === "reorder"
      ? ["sku", "item", "priorityBand", "reorderQuantity", "unit", "estimatedValueINR", "projectedStockOutDate"]
      : type === "assumptions"
        ? ["sku", "item", "currentStock", "unit", "averageDailyUsage", "minimumStock", "safetyStock", "leadTimeDays", "deliveryDate", "deliveryDateSource", "criticalBufferDays", "warningBufferDays", "safeBufferDays", "forecastHorizonDays"]
        : ["sku", "item", "category", "location", "risk", "daysOfStock", "projectedStockOutDate", "expectedDeliveryDate", "potentialGapDays"];
  const escape = (value: string | number | null) => {
    const text = value === null ? "" : String(value);
    return /[\r\n,"]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  const body = rows.map(({ item, metrics, averageHistory, historyDays }) => {
    if (type === "consumption") return [item.sku, item.name, item.category, item.location, averageHistory, item.unit, historyDays, rangeDays];
    if (type === "replenishment") return [item.sku, item.name, item.supplierName, item.category, item.location, item.incomingQuantity, item.unit, formatDate(metrics.expectedDeliveryDate), metrics.expectedDeliveryDateIsEstimated ? "estimated from lead time" : "demo schedule", item.leadTimeDays];
    if (type === "reorder") return [item.sku, item.name, getRiskLabel(metrics.riskLevel), metrics.reorderQuantity, item.unit, metrics.reorderValue, metrics.projectedStockOutDate ? formatDate(metrics.projectedStockOutDate) : ""];
    if (type === "assumptions") return [item.sku, item.name, item.currentStock, item.unit, item.averageDailyUsage, item.minimumStock, item.safetyStock, item.leadTimeDays, formatDate(metrics.expectedDeliveryDate), metrics.expectedDeliveryDateIsEstimated ? "estimated from lead time" : "demo schedule", settings.riskThresholds.criticalBufferDays, settings.riskThresholds.warningBufferDays, settings.riskThresholds.safeBufferDays, settings.forecastHorizonDays];
    return [item.sku, item.name, item.category, item.location, getRiskLabel(metrics.riskLevel), metrics.daysOfStock ?? "", metrics.projectedStockOutDate ? formatDate(metrics.projectedStockOutDate) : "", formatDate(metrics.expectedDeliveryDate), metrics.shortageGapDays];
  }).map((row) => row.map((value) => escape(typeof value === "number" || typeof value === "string" ? value : null)).join(","));
  return [head.join(","), ...body].join("\r\n");
}

export function ReportsPage() {
  const { items, settings } = useAppState();
  const showToast = useToast();
  const [reportType, setReportType] = useState<ReportType>("inventory");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [rangeDays, setRangeDays] = useState(14);
  const filteredItems = useMemo(() => items.filter((item) => (!category || item.category === category) && (!location || item.location === location)), [items, category, location]);
  const rows = useMemo(() => reportRows(reportType, filteredItems, rangeDays, settings.riskThresholds), [reportType, filteredItems, rangeDays, settings.riskThresholds]);
  const selectedReport = reportOptions.find((option) => option.value === reportType)!;
  const criticalCount = rows.filter(({ metrics }) => metrics.riskLevel === "critical").length;
  const gapCount = rows.filter(({ metrics }) => metrics.shortageGapDays > 0).length;
  const totalReorderValue = rows.reduce((sum, { metrics }) => sum + metrics.reorderValue, 0);

  const exportReport = () => {
    if (!rows.length) return;
    const csv = buildReportCsv(reportType, rows, rangeDays, settings);
    downloadTextFile(`navetra-${reportType}-${DEMO_AS_OF_DATE.toISOString().slice(0, 10)}.csv`, csv);
    showToast({ tone: "success", title: "Report CSV generated", description: "The file was built from the current filtered demo data." });
  };

  return (
    <div className="page-content">
      <PageHeader eyebrow="OPERATIONAL REPORTING" title="Reports" description="Build a focused view of stock status, replenishment, and the assumptions behind each estimate." actions={<StatusBadge tone="demo">Print-ready · synthetic data</StatusBadge>} />
      <div className="report-controls">
        <label className="report-type-select"><span>Report</span><select value={reportType} onChange={(event) => setReportType(event.target.value as ReportType)}>{reportOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <SelectFilter label="Category" value={category} options={Array.from(new Set(items.map((item) => item.category))).sort()} onChange={setCategory} />
        <SelectFilter label="Location" value={location} options={Array.from(new Set(items.map((item) => item.location))).sort()} onChange={setLocation} />
        <DateRangePills value={rangeDays} onChange={setRangeDays} options={[7, 14, 30]} />
        <div className="report-control-actions"><button className="button button--secondary" type="button" onClick={() => window.print()}><Printer size={15} /> Print report</button><button className="button button--primary" type="button" disabled={!rows.length} onClick={exportReport}><Download size={15} /> Export CSV</button></div>
      </div>

      <section className="report-preview" aria-label="Report preview">
        <div className="report-preview__header"><div><span className="eyebrow">NAVETRA · DEMO REPORT</span><h2>{selectedReport.title}</h2><p>{selectedReport.description} Snapshot: {formatDate(DEMO_AS_OF_DATE)} · {rangeDays}-day selected window.</p></div><span className="report-preview__mark"><FileText size={20} /></span></div>
        <div className="report-summary-grid">
          <div className="report-summary"><span>Rows in report</span><strong>{rows.length}</strong></div>
          <div className="report-summary"><span>Critical risk records</span><strong>{criticalCount}</strong></div>
          <div className="report-summary"><span>Potential delivery gaps</span><strong>{gapCount}</strong></div>
          <div className="report-summary"><span>Estimated reorder value</span><strong>{formatCurrency(totalReorderValue)}</strong></div>
        </div>
        {rows.length ? (
          <div className="table-scroll">
            <table className="inventory-table report-table">
              {reportType === "assumptions" ? <thead><tr><th>Item / SKU</th><th>Current stock</th><th>Daily use</th><th>Minimum</th><th>Safety stock</th><th>Lead time</th><th>Delivery source</th><th>Risk buffers</th></tr></thead>
                : reportType === "consumption" ? <thead><tr><th>Item / SKU</th><th>Category</th><th>Location</th><th>Average daily use</th><th>Sample observations</th><th>Window</th></tr></thead>
                  : reportType === "replenishment" ? <thead><tr><th>Item / SKU</th><th>Category</th><th>Location</th><th>Supplier</th><th>Incoming quantity</th><th>Expected delivery</th><th>Lead time</th></tr></thead>
                    : reportType === "reorder" ? <thead><tr><th>Item / SKU</th><th>Category</th><th>Location</th><th>Risk band</th><th>Suggested quantity</th><th>Estimated value</th><th>Stock-out estimate</th></tr></thead>
                    : <thead><tr><th>Item / SKU</th><th>Category</th><th>Location</th><th className="numeric-cell">Stock</th><th className="numeric-cell">Daily use</th><th className="numeric-cell">Days cover</th><th>Expected delivery</th><th>Risk / action</th></tr></thead>}
              <tbody>{rows.map(({ item, metrics, averageHistory, historyDays }) => {
                const itemCell = <div className="inventory-table__item"><strong>{item.name}</strong><span>{item.sku}</span></div>;
                if (reportType === "assumptions") return <tr key={item.id}><td>{itemCell}</td><td>{formatNumber(item.currentStock)} {item.unit}</td><td>{formatNumber(item.averageDailyUsage)} /day</td><td>{formatNumber(item.minimumStock)} {item.unit}</td><td>{formatNumber(item.safetyStock)} {item.unit}</td><td>{item.leadTimeDays} days</td><td>{formatDate(metrics.expectedDeliveryDate)}<small className="report-cell-note">{metrics.expectedDeliveryDateIsEstimated ? "Lead-time estimate" : "Synthetic schedule"}</small></td><td>{settings.riskThresholds.criticalBufferDays}/{settings.riskThresholds.warningBufferDays}/{settings.riskThresholds.safeBufferDays} days · {settings.forecastHorizonDays}d horizon</td></tr>;
                if (reportType === "consumption") return <tr key={item.id}><td>{itemCell}</td><td>{item.category}</td><td>{item.location}</td><td>{formatNumber(averageHistory)} {item.unit}/day</td><td>{historyDays}</td><td>{rangeDays} days</td></tr>;
                if (reportType === "replenishment") return <tr key={item.id}><td>{itemCell}</td><td>{item.category}</td><td>{item.location}</td><td>{item.supplierName}</td><td>{formatNumber(item.incomingQuantity)} {item.unit}</td><td>{formatDate(metrics.expectedDeliveryDate)}<small className="report-cell-note">{metrics.expectedDeliveryDateIsEstimated ? "Lead-time estimate" : "Synthetic schedule"}</small></td><td>{item.leadTimeDays} days</td></tr>;
                if (reportType === "reorder") return <tr key={item.id}><td>{itemCell}</td><td>{item.category}</td><td>{item.location}</td><td><span className="risk-label"><span className={`risk-dot risk-dot--${metrics.riskLevel}`} />{getRiskLabel(metrics.riskLevel)}</span></td><td>{formatNumber(metrics.reorderQuantity)} {item.unit}</td><td>{formatCurrency(metrics.reorderValue)}</td><td>{formatDate(metrics.projectedStockOutDate)}</td></tr>;
                return <tr key={item.id}><td>{itemCell}</td><td>{item.category}</td><td>{item.location}</td><td className="numeric-cell">{formatNumber(item.currentStock)} {item.unit}</td><td className="numeric-cell">{formatNumber(item.averageDailyUsage)} /day</td><td className="numeric-cell">{metrics.daysOfStock === null ? "—" : formatNumber(metrics.daysOfStock)}</td><td>{formatDate(metrics.expectedDeliveryDate)}</td><td><span className="risk-label"><span className={`risk-dot risk-dot--${metrics.riskLevel}`} />{getRiskLabel(metrics.riskLevel)}{metrics.shortageGapDays ? ` · ${metrics.shortageGapDays}d gap` : ""}</span></td></tr>;
              })}</tbody>
            </table>
          </div>
        ) : <EmptyState title="No rows in this report" description="Adjust the report type, date window, category, or location." />}
        <div className="report-preview__footer"><span>Illustrative sample data · no real operational outcomes</span><span>Generated in browser · {new Date().toLocaleString()}</span></div>
      </section>
      <p className="page-footnote"><FileText size={14} /> Reports can be printed from the browser or exported as CSV. PDF generation and scheduled reports are not connected.</p>
    </div>
  );
}
