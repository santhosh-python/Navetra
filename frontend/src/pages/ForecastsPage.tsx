import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, CalendarDays, Clock3, Info, PackageOpen } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { StockForecastChart } from "../components/charts/StockForecastChart";
import { DateRangePills } from "../components/common/DateRangePills";
import { EmptyState } from "../components/common/EmptyState";
import { SelectFilter } from "../components/common/SelectFilter";
import { StatusBadge } from "../components/common/StatusBadge";
import { PageHeader } from "../components/layout/PageHeader";
import { DEMO_AS_OF_DATE } from "../data/demoInventory";
import { useAppState } from "../hooks/useAppState";
import { formatDate, formatNumber } from "../lib/formatters";
import { getInventoryMetrics, getRiskLabel } from "../lib/inventoryMetrics";
import { selectInventory } from "../lib/inventorySelectors";
import type { InventoryItem } from "../types/inventory";

export function ForecastsPage() {
  const { items, settings } = useAppState();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryItemId = searchParams.get("itemId") ?? "";
  const [selectedItemId, setSelectedItemId] = useState(queryItemId);
  const [horizonDays, setHorizonDays] = useState(settings.forecastHorizonDays);
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");

  useEffect(() => {
    setSelectedItemId(queryItemId);
  }, [queryItemId]);

  const filteredItems = useMemo(
    () => selectInventory(items, {
      ...(category ? { category } : {}),
      ...(location ? { location } : {}),
      sortBy: "daysOfStock",
      sortDirection: "asc",
      asOfDate: DEMO_AS_OF_DATE,
      riskThresholds: settings.riskThresholds,
    }),
    [items, category, location, settings.riskThresholds],
  );
  const selectedItem = filteredItems.find((item) => item.id === selectedItemId) ?? filteredItems[0];
  const metrics = selectedItem ? getInventoryMetrics(selectedItem, DEMO_AS_OF_DATE, settings.riskThresholds) : null;
  const categories = Array.from(new Set(items.map((item) => item.category))).sort();
  const locations = Array.from(new Set(items.map((item) => item.location))).sort();
  const rankedItems = filteredItems.slice(0, 8);

  const selectItem = (item: InventoryItem) => {
    setSelectedItemId(item.id);
    const next = new URLSearchParams(searchParams);
    next.set("itemId", item.id);
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="page-content">
      <PageHeader eyebrow="SUPPLY OUTLOOK" title="Shortage Forecasts" description="See which supplies may run out before replenishment arrives." actions={<StatusBadge tone="demo"><Info size={13} /> Rule-based demo estimates</StatusBadge>} />
      <div className="forecast-toolbar">
        <div className="forecast-selectors">
          <SelectFilter label="Category" value={category} options={categories} onChange={setCategory} />
          <SelectFilter label="Location" value={location} options={locations} onChange={setLocation} />
          {selectedItem ? <label className="forecast-item-select"><span>Selected item</span><select value={selectedItem.id} onChange={(event) => { const item = filteredItems.find((record) => record.id === event.target.value); if (item) selectItem(item); }} aria-label="Select forecast item">{filteredItems.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.sku}</option>)}</select></label> : null}
        </div>
        <div className="forecast-horizon-control"><span>Horizon</span><DateRangePills value={horizonDays} onChange={setHorizonDays} options={[7, 14, 30, 60]} /></div>
      </div>

      {selectedItem && metrics ? (
        <>
          <section className="detail-metric-grid">
            <div className="detail-metric"><span>Estimated stock-out</span><strong>{formatDate(metrics.projectedStockOutDate)}</strong><small>{metrics.daysOfStock === null ? "Usage unavailable" : `${formatNumber(metrics.daysOfStock)} days at current usage`}</small></div>
            <div className="detail-metric"><span>Expected replenishment</span><strong>{formatDate(metrics.expectedDeliveryDate)}</strong><small>{metrics.expectedDeliveryDateIsEstimated ? `Estimated from ${selectedItem.leadTimeDays}-day lead time` : `${formatNumber(selectedItem.incomingQuantity)} ${selectedItem.unit} inbound`}</small></div>
            <div className="detail-metric"><span>Lead-time demand</span><strong>{formatNumber(selectedItem.averageDailyUsage * selectedItem.leadTimeDays)} {selectedItem.unit}</strong><small>{formatNumber(selectedItem.averageDailyUsage)} {selectedItem.unit}/day × {selectedItem.leadTimeDays} days</small></div>
            <div className="detail-metric"><span>Potential supply gap</span><strong>{metrics.shortageGapDays > 0 ? `${metrics.shortageGapDays} days` : "None projected"}</strong><small>{metrics.shortageGapDays > 0 ? `${formatNumber(metrics.projectedShortageQuantity)} ${selectedItem.unit} potential shortfall` : "Delivery date is within current stock cover"}</small></div>
          </section>

          <div className="forecast-layout">
            <section className="panel">
              <div className="panel__header">
                <div><h2>{selectedItem.name}</h2><p>{selectedItem.sku} · {selectedItem.location} · {selectedItem.unit}</p></div>
                <StatusBadge tone={metrics.riskLevel}>{getRiskLabel(metrics.riskLevel)}</StatusBadge>
              </div>
              <div className="forecast-chart-title"><span>Stock depletion and expected consumption</span><span>{horizonDays}-day outlook · synthetic history</span></div>
              <StockForecastChart item={selectedItem} horizonDays={horizonDays} historicalDays={horizonDays} showConsumption />
              <div className="chart-legend"><span className="chart-legend__item"><i className="chart-legend__line" />Sample history / current stock</span><span className="chart-legend__item"><i className="chart-legend__line chart-legend__line--dashed" />Projected stock · estimate</span><span className="chart-legend__item"><i className="chart-legend__line chart-legend__line--usage" />Daily usage</span><span className="chart-legend__item"><i className="chart-legend__line chart-legend__line--threshold" />Minimum stock</span></div>
            </section>

            <aside className="forecast-aside">
              <div className="forecast-explanation">
                <span className="eyebrow">PLAIN-LANGUAGE OUTLOOK</span>
                {metrics.shortageGapDays > 0 ? (
                  <p>Current stock is estimated to last approximately <strong>{formatNumber(metrics.daysOfStock ?? 0)} days</strong>. Replenishment is expected in <strong>{metrics.daysUntilDelivery} days</strong>, creating a potential <strong>{metrics.shortageGapDays}-day supply gap</strong> if consumption remains unchanged.</p>
                ) : metrics.daysOfStock === null ? (
                  <p>Daily consumption is recorded as zero, so a stock-out date cannot be estimated from this rule. Confirm usage records and expected replenishment before relying on this outlook.</p>
                ) : (
                  <p>At the current illustrative usage rate, available stock is estimated to last <strong>{formatNumber(metrics.daysOfStock)} days</strong>. The expected delivery is scheduled in <strong>{metrics.daysUntilDelivery} days</strong>, before the current stock cover is exhausted.</p>
                )}
              </div>
              <section className="panel forecast-assumptions-panel">
                <div className="panel__header"><div><h3>Assumptions</h3><p>Values used in this estimate</p></div></div>
                <div className="panel__body">
                  <div className="forecast-assumption"><span>Usable stock</span><strong>{formatNumber(selectedItem.currentStock)} {selectedItem.unit}</strong></div>
                  <div className="forecast-assumption"><span>Average daily use</span><strong>{formatNumber(selectedItem.averageDailyUsage)} {selectedItem.unit}/day</strong></div>
                  <div className="forecast-assumption"><span>Expected delivery</span><strong>{formatDate(metrics.expectedDeliveryDate)}</strong></div>
                  <div className="forecast-assumption"><span>Delivery source</span><strong>{metrics.expectedDeliveryDateIsEstimated ? "Lead-time estimate" : "Demo schedule"}</strong></div>
                  <div className="forecast-assumption"><span>Selected horizon</span><strong>{horizonDays} days</strong></div>
                  <div className="forecast-assumption"><span>Method</span><strong>Constant usage rule</strong></div>
                </div>
              </section>
              <div className="forecast-quick-links"><Link to={`/items/${selectedItem.id}`}><PackageOpen size={15} /> Open item details <ArrowUpRight size={14} /></Link><Link to={`/recommendations?itemId=${selectedItem.id}`}><Clock3 size={15} /> Review recommended action <ArrowUpRight size={14} /></Link></div>
            </aside>
          </div>

          <section className="panel">
            <div className="panel__header"><div><h2>Items to review</h2><p>Sorted by estimated stock cover within the selected scope.</p></div><Link className="panel__header-action" to="/inventory">Open inventory <ArrowUpRight size={14} /></Link></div>
            <div className="forecast-summary-list">
              {rankedItems.map((item) => {
                const itemMetrics = getInventoryMetrics(item, DEMO_AS_OF_DATE, settings.riskThresholds);
                return <button className={`forecast-summary-row${selectedItem.id === item.id ? " is-selected" : ""}`} type="button" key={item.id} onClick={() => selectItem(item)}>
                  <span className={`risk-dot risk-dot--${itemMetrics.riskLevel}`} />
                  <span className="forecast-summary-row__name"><strong>{item.name}</strong><small>{item.sku} · {item.location}</small></span>
                  <span className="forecast-summary-row__metric">{itemMetrics.daysOfStock === null ? "—" : `${formatNumber(itemMetrics.daysOfStock)} days`}<small>estimated cover</small></span>
                  <span className="forecast-summary-row__metric">{formatDate(itemMetrics.expectedDeliveryDate)}<small>{itemMetrics.expectedDeliveryDateIsEstimated ? "lead-time estimate" : "expected"}</small></span>
                  <span className="forecast-summary-row__gap">{itemMetrics.shortageGapDays ? `${itemMetrics.shortageGapDays}d gap` : "No gap"}</span>
                </button>;
              })}
            </div>
          </section>
          <p className="page-footnote"><CalendarDays size={14} /> Forecasts use the synthetic snapshot dated {formatDate(DEMO_AS_OF_DATE)}. They are rule-based illustrations, not machine-learning predictions or live operational data.</p>
        </>
      ) : (
        <EmptyState title="No items to forecast" description="Change the organization or clear category and location filters to see available demo items." />
      )}
    </div>
  );
}
