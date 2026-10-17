import { useMemo, useState } from "react";
import { AlertTriangle, ArrowDownToLine, ArrowUpRight, Boxes, CircleHelp, Clock3, RefreshCw, ShieldCheck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { RiskDistributionChart, type RiskDistributionKey } from "../components/charts/RiskDistributionChart";
import { RiskTrendChart } from "../components/charts/RiskTrendChart";
import { StockForecastChart } from "../components/charts/StockForecastChart";
import { StockOutTimeline } from "../components/charts/StockOutTimeline";
import { ActionLogModal } from "../components/inventory/ActionLogModal";
import { DateRangePills } from "../components/common/DateRangePills";
import { EmptyState } from "../components/common/EmptyState";
import { MetricCard } from "../components/common/MetricCard";
import { SelectFilter } from "../components/common/SelectFilter";
import { StatusBadge } from "../components/common/StatusBadge";
import { PageHeader } from "../components/layout/PageHeader";
import { DEMO_AS_OF_DATE } from "../data/demoInventory";
import { useAppState } from "../hooks/useAppState";
import { useToast } from "../hooks/useToast";
import { formatCurrency, formatDate, formatNumber } from "../lib/formatters";
import { getInventoryMetrics } from "../lib/inventoryMetrics";
import { buildRecommendations } from "../lib/recommendations";
import { selectInventory } from "../lib/inventorySelectors";
import type { InventoryItem } from "../types/inventory";

export function OverviewPage() {
  const { items, settings, isLoading, lastRefreshedAt, refresh } = useAppState();
  const navigate = useNavigate();
  const showToast = useToast();
  const [rangeDays, setRangeDays] = useState(14);
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("");
  const [chartItemId, setChartItemId] = useState("");
  const [contactItem, setContactItem] = useState<InventoryItem | null>(null);

  const locations = useMemo(() => Array.from(new Set(items.map((item) => item.location)).values()).sort(), [items]);
  const categories = useMemo(() => Array.from(new Set(items.map((item) => item.category)).values()).sort(), [items]);
  const filteredItems = useMemo(
    () => selectInventory(items, { location, category, asOfDate: DEMO_AS_OF_DATE, riskThresholds: settings.riskThresholds }),
    [items, location, category, settings.riskThresholds],
  );
  const assessments = useMemo(
    () => filteredItems.map((item) => ({ item, metrics: getInventoryMetrics(item, DEMO_AS_OF_DATE, settings.riskThresholds) })),
    [filteredItems, settings.riskThresholds],
  );
  const criticalCount = assessments.filter(({ metrics }) => metrics.riskLevel === "critical").length;
  const beforeDeliveryCount = assessments.filter(({ metrics }) => metrics.shortageGapDays > 0).length;
  const reorderValue = assessments.reduce((sum, { metrics }) => sum + metrics.reorderValue, 0);
  const attention = useMemo(
    () => buildRecommendations(filteredItems, DEMO_AS_OF_DATE, settings.riskThresholds).slice(0, 5),
    [filteredItems, settings.riskThresholds],
  );
  const chartItem = filteredItems.find((item) => item.id === chartItemId) ??
    filteredItems.find((item) => item.averageDailyUsage > 0) ?? filteredItems[0];

  const chooseRisk = (risk: RiskDistributionKey) => {
    navigate(`/inventory?riskGroup=${risk}${location ? `&location=${encodeURIComponent(location)}` : ""}${category ? `&category=${encodeURIComponent(category)}` : ""}`);
  };

  const handleRefresh = async () => {
    await refresh();
    showToast({ tone: "success", title: "Demo snapshot refreshed", description: "This is local sample data; there is no live source to refresh yet." });
  };

  return (
    <div className="page-content">
      <PageHeader
        eyebrow="OPERATIONS SNAPSHOT"
        title="Inventory Overview"
        description="Know what is at risk. Act before supplies run out."
        actions={
          <>
            <DateRangePills value={rangeDays} onChange={setRangeDays} options={[7, 14, 30]} />
            <button className="button button--secondary" type="button" onClick={() => void handleRefresh()} disabled={isLoading}>
              <RefreshCw size={15} className={isLoading ? "spin-icon" : ""} /> Refresh
            </button>
          </>
        }
      />

      <div className="overview-toolbar">
        <div className="overview-filterbar">
          <SelectFilter label="Location" value={location} options={locations} onChange={setLocation} />
          <SelectFilter label="Category" value={category} options={categories} onChange={setCategory} />
          {(location || category) ? <button className="button button--text" type="button" onClick={() => { setLocation(""); setCategory(""); }}>Clear filters</button> : null}
        </div>
        <div className="demo-data-banner" title="Synthetic data is used throughout this preview.">
          <span className="demo-data-banner__dot" />
          <span>Illustrative demo data</span>
          <CircleHelp size={14} />
          <span>Snapshot {formatDate(DEMO_AS_OF_DATE)}{lastRefreshedAt ? ` · refreshed ${lastRefreshedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}</span>
        </div>
      </div>

      <section className="metric-grid" aria-label="Inventory key performance indicators">
        <MetricCard label="Items monitored" value={isLoading ? "—" : filteredItems.length} description="Active supply records in the selected scope" icon={Boxes} tooltip="Count of inventory items visible for the selected organization and filters." />
        <MetricCard label="Critical shortages" value={criticalCount} description="Items currently in the critical rule-based band" icon={AlertTriangle} tone="critical" context={<><span className="risk-dot risk-dot--critical" /> Includes stock at zero or within the critical lead-time buffer</>} tooltip="Uses stock coverage and configurable risk buffers. The separate delivery-gap KPI compares depletion date with expected replenishment." />
        <MetricCard label="At risk before delivery" value={beforeDeliveryCount} description="Projected stock-out occurs before expected replenishment" icon={Clock3} tone="warning" context={<><span className="risk-dot risk-dot--high" /> Based on current usage and delivery date</>} tooltip="Compares estimated stock-out date with the recorded or lead-time-estimated delivery date." />
        <MetricCard label="Estimated reorder value" value={formatCurrency(reorderValue)} description="Starter reorder-up-to estimate across selected items" icon={ArrowDownToLine} tooltip="Uses minimum stock + safety stock + lead-time demand, less on-hand and incoming stock. Values are illustrative INR estimates." />
      </section>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel__header"><div><h2>Inventory risk distribution</h2><p>Click a group to explore those items.</p></div><span className="panel-help" title="Risk is calculated from stock coverage, supplier lead time, minimum stock, and configured buffer days."><CircleHelp size={16} aria-hidden="true" /></span></div>
          <div className="panel__body">
            <RiskDistributionChart items={filteredItems} asOfDate={DEMO_AS_OF_DATE} thresholds={settings.riskThresholds} onSelectRisk={chooseRisk} />
          </div>
        </section>
        <section className="panel">
          <div className="panel__header"><div><h2>Projected stock-out timeline</h2><p>Stock cover compared with the expected delivery date · next {rangeDays} days.</p></div><Link className="panel__header-action" to="/forecasts">Open forecasts <ArrowUpRight size={14} /></Link></div>
          <div className="panel__body">
            <StockOutTimeline items={filteredItems} asOfDate={DEMO_AS_OF_DATE} thresholds={settings.riskThresholds} horizonDays={rangeDays} limit={5} />
          </div>
        </section>
      </div>

      <div className="dashboard-grid dashboard-grid--equal">
        <section className="panel">
          <div className="panel__header panel__header--align-center">
            <div><h2>Consumption vs available stock</h2><p>Observed synthetic stock and a constant-usage estimate.</p></div>
            {chartItem ? <label className="compact-select"><span className="visually-hidden">Select chart item</span><select value={chartItem.id} onChange={(event) => setChartItemId(event.target.value)} aria-label="Select item for consumption chart">{filteredItems.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label> : null}
          </div>
          <div className="panel__body panel__body--chart">
            {chartItem ? <StockForecastChart item={chartItem} horizonDays={rangeDays} historicalDays={rangeDays} showConsumption compact /> : <EmptyState title="No inventory matches" description="Change the location or category filter to see an item trend." />}
          </div>
          <div className="chart-legend"><span className="chart-legend__item"><i className="chart-legend__line" />Sample history / current stock</span><span className="chart-legend__item"><i className="chart-legend__line chart-legend__line--dashed" />Projected stock · estimate</span><span className="chart-legend__item"><i className="chart-legend__line chart-legend__line--usage" />Daily usage</span></div>
        </section>
        <section className="panel">
          <div className="panel__header"><div><h2>Shortage risk trend</h2><p>Items outside the Safe band across illustrative observations.</p></div><StatusBadge tone="demo">{rangeDays} days</StatusBadge></div>
          <div className="panel__body panel__body--chart">
            <RiskTrendChart items={filteredItems} rangeDays={rangeDays} thresholds={settings.riskThresholds} />
          </div>
          <div className="chart-legend"><span className="chart-legend__item"><i className="chart-legend__line chart-legend__line--warning" />At risk</span><span className="chart-legend__item"><i className="chart-legend__line chart-legend__line--critical" />Critical</span></div>
        </section>
      </div>

      <section className="panel">
        <div className="panel__header"><div><h2>Needs attention</h2><p>Highest-priority items based on transparent stock and lead-time rules.</p></div><Link className="panel__header-action" to="/recommendations">View all recommendations <ArrowUpRight size={14} /></Link></div>
        <div className="panel__body">
          {attention.length ? (
            <div className="attention-list">
              {attention.map(({ id, item, priority, reason, metrics }) => (
                <div className="attention-row" key={id}>
                  <div className="attention-item"><Link to={`/items/${item.id}`}>{item.name}</Link><span>{item.sku} · {item.criticality} criticality</span></div>
                  <StatusBadge tone={priority === "Critical" ? "critical" : priority === "High" ? "high" : "medium"}>{priority}</StatusBadge>
                  <div className="attention-meta"><strong>{metrics.daysOfStock === null ? "—" : `${formatNumber(metrics.daysOfStock)} days`}</strong><span>estimated cover</span></div>
                  <div className="attention-meta"><strong>{formatDate(metrics.expectedDeliveryDate)}</strong><span>{metrics.expectedDeliveryDateIsEstimated ? "estimated from lead time" : "expected delivery"}</span></div>
                  <div className="attention-actions">
                    <button className="attention-action" type="button" onClick={() => navigate(`/forecasts?itemId=${item.id}`)}>View forecast <ArrowUpRight size={13} /></button>
                    <button className="attention-action" type="button" onClick={() => setContactItem(item)}>Contact supplier <ArrowUpRight size={13} /></button>
                  </div>
                  <p className="attention-row__reason">{reason}</p>
                </div>
              ))}
            </div>
          ) : <EmptyState title="No items need attention" description="No inventory records match the selected filters." />}
        </div>
      </section>
      <p className="page-footnote"><ShieldCheck size={14} /> All estimates use synthetic demo data and transparent starter rules. No supplier orders or contacts are sent.</p>
      {contactItem ? <ActionLogModal item={contactItem} onClose={() => setContactItem(null)} /> : null}
    </div>
  );
}
