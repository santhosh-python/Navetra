import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  ReferenceLine,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { BarChart3, CircleHelp, Database, Info, TrendingUp } from "lucide-react";
import { CategoryRiskChart } from "../components/charts/CategoryRiskChart";
import { DateRangePills } from "../components/common/DateRangePills";
import { EmptyState } from "../components/common/EmptyState";
import { SelectFilter } from "../components/common/SelectFilter";
import { StatusBadge } from "../components/common/StatusBadge";
import { PageHeader } from "../components/layout/PageHeader";
import { demoHistory } from "../data/demoHistory";
import { DEMO_AS_OF_DATE } from "../data/demoInventory";
import { useAppState } from "../hooks/useAppState";
import { calculateUsageVariability } from "../lib/analytics";
import { formatDate, formatNumber } from "../lib/formatters";
import { getInventoryMetrics, getRiskGroup } from "../lib/inventoryMetrics";
import { selectInventory } from "../lib/inventorySelectors";

const criticalityNumber = { low: 1, medium: 2, high: 3, critical: 4 } as const;
const riskGroups = ["critical", "warning", "safe"] as const;
type RiskGroup = (typeof riskGroups)[number];
interface ScatterPoint {
  id: string;
  criticality: number;
  days: number;
  item: string;
  sku: string;
}

export function AnalyticsPage() {
  const { items, settings } = useAppState();
  const navigate = useNavigate();
  const [rangeDays, setRangeDays] = useState(14);
  const [consumptionView, setConsumptionView] = useState<"trend" | "variability">("trend");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [selectedItemId, setSelectedItemId] = useState(items[0]?.id ?? "");

  const filteredItems = useMemo(
    () => selectInventory(items, {
      ...(category ? { category } : {}),
      ...(location ? { location } : {}),
      asOfDate: DEMO_AS_OF_DATE,
      riskThresholds: settings.riskThresholds,
    }),
    [items, category, location, settings.riskThresholds],
  );
  const selectedItem = filteredItems.find((item) => item.id === selectedItemId) ?? filteredItems[0];
  const history = selectedItem
    ? demoHistory.filter((entry) => entry.inventoryItemId === selectedItem.id).slice(-rangeDays)
    : [];
  const averageConsumption = history.length
    ? history.reduce((sum, entry) => sum + entry.consumption, 0) / history.length
    : 0;
  const demandRange = history.length
    ? Math.max(...history.map((entry) => entry.consumption)) - Math.min(...history.map((entry) => entry.consumption))
    : 0;
  const variabilityData = calculateUsageVariability(history);
  const categories = Array.from(new Set(items.map((item) => item.category))).sort();
  const locations = Array.from(new Set(items.map((item) => item.location))).sort();

  const supplierSummary = useMemo(() => {
    const grouped = new Map<string, { totalDays: number; count: number }>();
    filteredItems.forEach((item) => {
      const record = grouped.get(item.supplierName) ?? { totalDays: 0, count: 0 };
      record.totalDays += item.leadTimeDays;
      record.count += 1;
      grouped.set(item.supplierName, record);
    });
    return Array.from(grouped, ([supplier, summary]) => ({
      supplier,
      averageLeadTime: summary.totalDays / summary.count,
      items: summary.count,
    })).sort((left, right) => right.averageLeadTime - left.averageLeadTime);
  }, [filteredItems]);

  const scatterGroups = useMemo(() => {
    const grouped: Record<RiskGroup, ScatterPoint[]> = { critical: [], warning: [], safe: [] };
    filteredItems.forEach((item) => {
      const metrics = getInventoryMetrics(item, DEMO_AS_OF_DATE, settings.riskThresholds);
      if (metrics.daysOfStock === null) return;
      const group = getRiskGroup(metrics.riskLevel);
      grouped[group].push({
        id: item.id,
        criticality: criticalityNumber[item.criticality],
        days: metrics.daysOfStock,
        item: item.name,
        sku: item.sku,
      });
    });
    return grouped;
  }, [filteredItems, settings.riskThresholds]);
  const plottedCount = riskGroups.reduce((sum, group) => sum + scatterGroups[group].length, 0);
  const omittedNoUsageCount = filteredItems.length - plottedCount;

  return (
    <div className="page-content">
      <PageHeader eyebrow="PATTERNS & TRENDS" title="Inventory Analytics" description="Explore illustrative consumption patterns, supplier lead times, and category-level exposure." actions={<StatusBadge tone="demo">Synthetic sample data</StatusBadge>} />
      <div className="overview-toolbar">
        <div className="overview-filterbar"><SelectFilter label="Category" value={category} options={categories} onChange={setCategory} /><SelectFilter label="Location" value={location} options={locations} onChange={setLocation} /></div>
        <DateRangePills value={rangeDays} onChange={setRangeDays} options={[7, 14, 30]} />
      </div>

      <div className="analytics-kpi-grid">
        <div className="analytics-kpi"><span><TrendingUp size={15} /> Items in scope</span><strong>{filteredItems.length}</strong><small>Current demo organization and filters</small></div>
        <div className="analytics-kpi"><span><BarChart3 size={15} /> Avg. daily use</span><strong>{selectedItem ? `${formatNumber(averageConsumption)} ${selectedItem.unit}` : "—"}</strong><small>{selectedItem ? selectedItem.name : "Select an item to inspect"}</small></div>
        <div className="analytics-kpi"><span><CircleHelp size={15} /> Consumption range</span><strong>{selectedItem ? `${formatNumber(demandRange)} ${selectedItem.unit}` : "—"}</strong><small>High-to-low spread · synthetic history</small></div>
      </div>

      <div className="dashboard-grid dashboard-grid--equal">
        <section className="panel">
          <div className="panel__header panel__header--align-center">
            <div>
              <h2>{consumptionView === "trend" ? "Daily consumption trend" : "Demand variability"}</h2>
              <p>{consumptionView === "trend" ? "Illustrative daily usage for the selected item." : "Daily change relative to the selected period’s average usage."}</p>
            </div>
            <div className="analytics-chart-controls">
              <div className="analytics-view-switch" aria-label="Consumption chart view">
                <button type="button" aria-pressed={consumptionView === "trend"} onClick={() => setConsumptionView("trend")}>Trend</button>
                <button type="button" aria-pressed={consumptionView === "variability"} onClick={() => setConsumptionView("variability")}>Variability</button>
              </div>
              {selectedItem ? <label className="compact-select"><span className="visually-hidden">Select item</span><select value={selectedItem.id} onChange={(event) => setSelectedItemId(event.target.value)} aria-label="Select item for consumption analytics">{filteredItems.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label> : null}
            </div>
          </div>
          <div className="panel__body panel__body--chart">
            {history.length && selectedItem ? (
              <div className="chart-container" role="region" aria-label={`${consumptionView === "trend" ? "Daily consumption trend" : "Demand variability"} for ${selectedItem.name}`}>
                <ResponsiveContainer width="100%" height="100%">
                  {consumptionView === "trend" ? (
                    <LineChart data={history} margin={{ top: 8, right: 7, bottom: 0, left: -13 }}>
                      <CartesianGrid stroke="var(--color-chart-grid)" vertical={false} />
                      <XAxis dataKey="date" tickFormatter={(value: string) => formatDate(value).replace(/, \d{4}/, "")} tick={{ fill: "#87909a", fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={26} />
                      <YAxis tick={{ fill: "#87909a", fontSize: 10 }} tickLine={false} axisLine={false} width={43} />
                      <Tooltip labelFormatter={(value) => formatDate(String(value))} formatter={(value) => [`${formatNumber(Number(value))} ${selectedItem.unit}/day`, "Consumption · synthetic"]} contentStyle={{ border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 11 }} />
                      <Line type="monotone" dataKey="consumption" name="Daily use" stroke="var(--color-chart-1)" strokeWidth={2.1} dot={false} activeDot={{ r: 4 }} />
                    </LineChart>
                  ) : (
                    <BarChart data={variabilityData} margin={{ top: 8, right: 7, bottom: 0, left: -13 }}>
                      <CartesianGrid stroke="var(--color-chart-grid)" vertical={false} />
                      <XAxis dataKey="date" tickFormatter={(value: string) => formatDate(value).replace(/, \d{4}/, "")} tick={{ fill: "#87909a", fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={26} />
                      <YAxis tickFormatter={(value) => `${value}%`} tick={{ fill: "#87909a", fontSize: 10 }} tickLine={false} axisLine={false} width={43} domain={["auto", "auto"]} />
                      <ReferenceLine y={0} stroke="var(--color-border-strong)" strokeDasharray="3 3" />
                      <Tooltip labelFormatter={(value) => formatDate(String(value))} formatter={(value) => [`${formatNumber(Number(value))}%`, "Change vs period average"]} contentStyle={{ border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 11 }} />
                      <Bar dataKey="deviationPercent" name="Change vs period average" radius={[3, 3, 0, 0]} barSize={15}>
                        {variabilityData.map((point) => <Cell key={point.date} fill={point.deviationPercent >= 0 ? "var(--color-chart-1)" : "var(--color-chart-2)"} />)}
                      </Bar>
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            ) : <EmptyState title="No consumption observations" description="There is no synthetic history for the selected item." />}
          </div>
          <div className="chart-legend"><span className="chart-legend__item"><i className="chart-legend__line" />{consumptionView === "trend" ? "Illustrative daily use" : "Daily deviation from period average"}</span>{consumptionView === "variability" ? <span className="chart-legend__item"><i className="chart-legend__line chart-legend__line--mean" />0% · selected-period average</span> : null}<span className="data-provenance"><Database size={13} /> Prior {rangeDays} synthetic observations · as of {formatDate(DEMO_AS_OF_DATE)}</span></div>
        </section>
        <section className="panel">
          <div className="panel__header"><div><h2>Category-level risk</h2><p>Select a row to open those supplies in Inventory.</p></div></div>
          <div className="panel__body"><CategoryRiskChart items={filteredItems} asOfDate={DEMO_AS_OF_DATE} thresholds={settings.riskThresholds} onSelectCategory={(selectedCategory) => navigate(`/inventory?category=${encodeURIComponent(selectedCategory)}${location ? `&location=${encodeURIComponent(location)}` : ""}`)} /></div>
          <div className="chart-legend"><span className="chart-legend__item"><i className="chart-legend__line chart-legend__line--critical" />Critical</span><span className="chart-legend__item"><i className="chart-legend__line chart-legend__line--warning" />Warning</span><span className="chart-legend__item"><i className="chart-legend__line chart-legend__line--safe" />Safe</span></div>
        </section>
      </div>

      <div className="dashboard-grid dashboard-grid--equal">
        <section className="panel">
          <div className="panel__header"><div><h2>Criticality vs. stock cover</h2><p>Select a point to open its item record; hover for exact values.</p></div></div>
          <div className="panel__body panel__body--chart">
            {plottedCount ? <div className="chart-container"><ResponsiveContainer width="100%" height="100%"><ScatterChart margin={{ top: 12, right: 12, bottom: 5, left: -10 }}><CartesianGrid stroke="var(--color-chart-grid)" /><XAxis type="number" dataKey="criticality" domain={[0.7, 4.3]} ticks={[1, 2, 3, 4]} tickFormatter={(value) => ["", "Low", "Medium", "High", "Critical"][Number(value)] ?? ""} name="Criticality" tick={{ fill: "#87909a", fontSize: 10 }} tickLine={false} axisLine={false} /><YAxis type="number" dataKey="days" name="Days of stock" unit="d" tick={{ fill: "#87909a", fontSize: 10 }} tickLine={false} axisLine={false} width={40} /><ZAxis type="number" dataKey="days" range={[55, 55]} /><Tooltip cursor={{ strokeDasharray: "3 3" }} formatter={(value, name) => [name === "Days of stock" ? `${formatNumber(Number(value))} days` : String(value), String(name)]} labelFormatter={(_, payload) => payload?.[0]?.payload?.item ?? "Inventory item"} contentStyle={{ border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 11 }} />
              {riskGroups.map((group) => <Scatter key={group} name={group === "critical" ? "Critical risk" : group === "warning" ? "Warning risk" : "Safe"} data={scatterGroups[group]} fill={group === "critical" ? "var(--color-chart-critical)" : group === "warning" ? "var(--color-chart-warning)" : "var(--color-chart-safe)"} cursor="pointer" onClick={(point) => { const itemId = point?.payload?.id; if (itemId) navigate(`/items/${encodeURIComponent(itemId)}`); }} />)}
            </ScatterChart></ResponsiveContainer></div> : filteredItems.length ? <EmptyState title="No computable stock cover" description="Daily usage is zero or unavailable for every item in this scope, so days of stock cannot be plotted." /> : <EmptyState title="No items in scope" description="Adjust the location or category filters to explore records." />}
          </div>
          {plottedCount && omittedNoUsageCount > 0 ? <div className="analytics-data-note"><Info size={14} /><span>{omittedNoUsageCount} item{omittedNoUsageCount === 1 ? " has" : "s have"} no positive usage rate and is omitted from the stock-cover axis.</span></div> : null}
          <div className="chart-legend"><span className="chart-legend__item"><i className="chart-legend__line chart-legend__line--critical" />Critical risk</span><span className="chart-legend__item"><i className="chart-legend__line chart-legend__line--warning" />Warning</span><span className="chart-legend__item"><i className="chart-legend__line chart-legend__line--safe" />Safe</span></div>
        </section>
        <section className="panel">
          <div className="panel__header"><div><h2>Supplier lead-time profile</h2><p>Configured expected lead time by supplier.</p></div><CircleHelp size={16} aria-label="Actual delivery timestamps are unavailable" /></div>
          <div className="panel__body">
            {supplierSummary.length ? <div className="lead-time-chart"><ResponsiveContainer width="100%" height={255}><BarChart data={supplierSummary} layout="vertical" margin={{ top: 4, right: 14, bottom: 2, left: 0 }}><CartesianGrid stroke="var(--color-chart-grid)" horizontal={false} /><XAxis type="number" unit=" days" tick={{ fill: "#87909a", fontSize: 10 }} tickLine={false} axisLine={false} /><YAxis type="category" dataKey="supplier" width={125} tick={{ fill: "#68717d", fontSize: 10 }} tickLine={false} axisLine={false} /><Tooltip formatter={(value) => [`${formatNumber(Number(value))} days`, "Configured lead time"]} contentStyle={{ border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 11 }} /><Bar dataKey="averageLeadTime" name="Average lead time" fill="var(--color-chart-2)" radius={[0, 3, 3, 0]} barSize={14} /></BarChart></ResponsiveContainer></div> : <EmptyState title="No supplier lead times" description="Supplier data is not available in this organization." />}
            <div className="analytics-data-note"><Info size={14} /><span>Actual delivery dates are unavailable, so on-time performance and lead-time variance are not calculated.</span></div>
          </div>
          <div className="chart-legend"><span className="chart-legend__item"><i className="chart-legend__line chart-legend__line--info" />Configured supplier lead time</span></div>
        </section>
      </div>

      <div className="dashboard-grid dashboard-grid--equal">
        <section className="panel unavailable-panel"><div className="panel__header"><div><h2>Inventory turnover</h2><p>Requires dated receipts and issues.</p></div></div><EmptyState title="Not calculated" description="The demo has no verified issue/receipt history or cost-of-goods flow, so a turnover figure would be unsupported." /></section>
        <section className="panel unavailable-panel"><div className="panel__header"><div><h2>Stock-out history</h2><p>Historical incidents and duration.</p></div></div><EmptyState title="No incident history" description="This synthetic dataset contains sample usage observations only; no real stock-out incidents are available." /></section>
      </div>
      <p className="page-footnote"><Database size={14} /> Consumption history is deterministically generated for this demo. No real performance gains, savings, or supplier outcomes are represented.</p>
    </div>
  );
}
