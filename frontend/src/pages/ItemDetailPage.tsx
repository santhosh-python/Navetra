import { useState } from "react";
import { Activity, ArrowLeft, Boxes, Clock3, Edit3, PackageCheck, Truck } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { InventoryFormModal } from "../components/inventory/InventoryFormModal";
import { StockForecastChart } from "../components/charts/StockForecastChart";
import { Button } from "../components/common/Button";
import { EmptyState } from "../components/common/EmptyState";
import { InfoTooltip } from "../components/common/InfoTooltip";
import { StatusBadge } from "../components/common/StatusBadge";
import { PageHeader } from "../components/layout/PageHeader";
import { demoDeliveries } from "../data/demoDeliveries";
import { demoHistory } from "../data/demoHistory";
import { DEMO_AS_OF_DATE } from "../data/demoInventory";
import { useAppState } from "../hooks/useAppState";
import { formatCurrency, formatDate, formatNumber } from "../lib/formatters";
import { getInventoryMetrics, getRiskLabel } from "../lib/inventoryMetrics";

const tabs = ["overview", "forecast", "deliveries", "activity"] as const;
type DetailTab = (typeof tabs)[number];

export function ItemDetailPage() {
  const { itemId } = useParams();
  const { items, allItems, settings, activity } = useAppState();
  const item = allItems.find((record) => record.id === itemId);
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");
  const [editOpen, setEditOpen] = useState(false);

  if (!item) {
    return (
      <section className="page-content">
        <PageHeader title="Item not found" description="This inventory record is not available in the current demo dataset." />
        <EmptyState title="No matching inventory item" description="It may have been removed or belongs to another selected organization." />
        <Link className="modal-back-link" to="/inventory"><ArrowLeft size={15} /> Back to inventory</Link>
      </section>
    );
  }

  const metrics = getInventoryMetrics(item, DEMO_AS_OF_DATE, settings.riskThresholds);
  const itemActivity = activity.filter((entry) => entry.inventoryItemId === item.id);
  const deliveries = demoDeliveries.filter((delivery) => delivery.inventoryItemId === item.id);
  const history = demoHistory.filter((entry) => entry.inventoryItemId === item.id).slice(-8).reverse();
  const visibleInOrganization = items.some((visibleItem) => visibleItem.id === item.id);

  return (
    <div className="page-content">
      <Link className="modal-back-link" to="/inventory"><ArrowLeft size={15} /> Inventory</Link>
      <div className="detail-hero">
        <div className="detail-hero__identity">
          <span className="detail-hero__icon"><Boxes size={23} strokeWidth={1.7} /></span>
          <div>
            <div className="eyebrow">{item.category} · {item.location}</div>
            <h1>{item.name}</h1>
            <p>{item.sku} <span aria-hidden="true">·</span> {item.unit} <span aria-hidden="true">·</span> {item.supplierName}</p>
          </div>
        </div>
        <div className="page-header__actions">
          <StatusBadge tone={metrics.riskLevel}>{getRiskLabel(metrics.riskLevel)}</StatusBadge>
          <Button type="button" variant="secondary" onClick={() => setEditOpen(true)}><Edit3 size={15} /> Edit item</Button>
        </div>
      </div>

      {!visibleInOrganization ? (
        <div className="inline-alert" role="status">This record is outside the currently selected organization. Item details remain available from its direct link.</div>
      ) : null}

      <div className="detail-metric-grid">
        <div className="detail-metric"><span>Available stock</span><strong>{formatNumber(item.currentStock)} {item.unit}</strong><small>Incoming: {formatNumber(item.incomingQuantity)} {item.unit}</small></div>
        <div className="detail-metric"><span>Estimated days remaining <InfoTooltip label="Days of stock" content="Current on-hand stock divided by the item's average daily usage. Incoming stock is not included in this simple coverage figure." /></span><strong>{metrics.daysOfStock === null ? "—" : formatNumber(metrics.daysOfStock)}</strong><small>{metrics.daysOfStock === null ? "No usage rate" : "Rule-based estimate"}</small></div>
        <div className="detail-metric"><span>Projected stock-out</span><strong>{formatDate(metrics.projectedStockOutDate)}</strong><small>At current average usage</small></div>
        <div className="detail-metric"><span>Estimated reorder value</span><strong>{formatCurrency(metrics.reorderValue)}</strong><small>{formatNumber(metrics.reorderQuantity)} {item.unit} suggested quantity</small></div>
      </div>

      {metrics.shortageGapDays > 0 ? (
        <div className="alert-explanation alert-explanation--critical">
          <Clock3 className="alert-explanation__icon" size={19} aria-hidden="true" />
          <p><strong>Potential supply gap.</strong> At {formatNumber(item.averageDailyUsage)} {item.unit}/day, current stock is estimated to deplete on {formatDate(metrics.projectedStockOutDate)}. Expected replenishment is {formatDate(metrics.expectedDeliveryDate)}{metrics.expectedDeliveryDateIsEstimated ? " (estimated from supplier lead time)" : ""}, a projected {metrics.shortageGapDays}-day gap if consumption is unchanged.</p>
        </div>
      ) : null}

      <div className="tabs" role="tablist" aria-label="Item detail sections">
        {tabs.map((tab) => <button key={tab} type="button" role="tab" aria-selected={activeTab === tab} onClick={() => setActiveTab(tab)}>{tab[0]!.toUpperCase() + tab.slice(1)}</button>)}
      </div>

      {activeTab === "overview" ? (
        <div className="dashboard-grid dashboard-grid--equal">
          <section className="panel">
            <div className="panel__header"><div><h2>Stock position</h2><p>Illustrative observations and a simple consumption projection.</p></div><StatusBadge tone="demo">Synthetic data</StatusBadge></div>
            <StockForecastChart item={item} horizonDays={settings.forecastHorizonDays} historicalDays={14} />
            <div className="chart-legend"><span className="chart-legend__item"><i className="chart-legend__line" />Sample history / current stock</span><span className="chart-legend__item"><i className="chart-legend__line chart-legend__line--dashed" />Projected stock · estimate</span></div>
          </section>
          <section className="panel">
            <div className="panel__header"><div><h2>Item profile</h2><p>Current record and supply assumptions.</p></div></div>
            <div className="panel__body">
              <div className="key-value-grid">
                <div className="key-value"><span>Criticality</span><strong><StatusBadge tone={item.criticality}>{item.criticality[0]!.toUpperCase() + item.criticality.slice(1)}</StatusBadge></strong></div>
                <div className="key-value"><span>Minimum stock</span><strong>{formatNumber(item.minimumStock)} {item.unit}</strong></div>
                <div className="key-value"><span>Safety stock</span><strong>{formatNumber(item.safetyStock)} {item.unit}</strong></div>
                <div className="key-value"><span>Average daily usage</span><strong>{formatNumber(item.averageDailyUsage)} {item.unit}/day</strong></div>
                <div className="key-value"><span>Supplier lead time</span><strong>{item.leadTimeDays} days</strong></div>
                <div className="key-value"><span>Expected delivery</span><strong>{formatDate(metrics.expectedDeliveryDate)}{metrics.expectedDeliveryDateIsEstimated ? " · estimated" : ""}</strong></div>
                <div className="key-value"><span>Unit cost</span><strong>{formatCurrency(item.unitCost)}</strong></div>
                <div className="key-value"><span>Reorder rule</span><strong>Minimum + safety + lead demand</strong></div>
                <div className="key-value"><span>Assessment</span><strong>Rule-based demo estimate</strong></div>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {activeTab === "forecast" ? (
        <section className="panel">
          <div className="panel__header"><div><h2>Shortage forecast</h2><p>Daily usage is held constant; the projection is illustrative, not machine learning.</p></div><StatusBadge tone="demo">Estimate</StatusBadge></div>
          <StockForecastChart item={item} horizonDays={settings.forecastHorizonDays} historicalDays={28} showConsumption />
          <div className="chart-legend"><span className="chart-legend__item"><i className="chart-legend__line" />Observed stock</span><span className="chart-legend__item"><i className="chart-legend__line chart-legend__line--dashed" />Projected stock</span><span className="chart-legend__item"><i className="chart-legend__line" style={{ background: "var(--color-chart-3)" }} />Daily usage</span></div>
        </section>
      ) : null}

      {activeTab === "deliveries" ? (
        <section className="panel">
          <div className="panel__header"><div><h2>Incoming deliveries</h2><p>Inbound records are illustrative and derived from this item's demo inventory fields.</p></div><Truck size={18} color="var(--color-text-muted)" /></div>
          <div className="panel__body">
            {deliveries.length ? (
              <div className="delivery-list">
                {deliveries.map((delivery) => <div className="delivery-row" key={delivery.id}><span className="delivery-row__icon"><PackageCheck size={17} /></span><span className="delivery-row__copy"><strong>{delivery.supplierName}</strong><small>{formatNumber(delivery.quantity)} {delivery.unit} · {formatDate(delivery.expectedDeliveryDate)}</small></span><StatusBadge tone={delivery.status === "in-transit" ? "low" : "neutral"}>{delivery.status === "in-transit" ? "In transit" : "Ordered"}</StatusBadge></div>)}
              </div>
            ) : (
              <EmptyState title="No incoming delivery recorded" description="This demo item has no scheduled inbound quantity. An expected date may be estimated from the supplier lead time." />
            )}
          </div>
        </section>
      ) : null}

      {activeTab === "activity" ? (
        <section className="panel">
          <div className="panel__header"><div><h2>Recent activity</h2><p>Local edits are kept for this browser session; there is no backend audit log.</p></div><Activity size={18} color="var(--color-text-muted)" /></div>
          <div className="panel__body">
            {itemActivity.length ? (
              <div className="activity-list">{itemActivity.map((entry) => <div className="activity-row" key={entry.id}><span className="activity-row__dot" /><p>{entry.description}</p><time>{formatDate(entry.createdAt)}</time></div>)}</div>
            ) : history.length ? (
              <div className="activity-list">{history.map((entry) => <div className="activity-row" key={entry.date}><span className="activity-row__dot" /><p>Illustrative consumption was {formatNumber(entry.consumption)} {item.unit}; closing stock was {formatNumber(entry.closingStock)} {item.unit}.</p><time>{formatDate(entry.date)}</time></div>)}</div>
            ) : <EmptyState title="No activity yet" description="Changes and actions recorded in this demo will appear here." />}
          </div>
        </section>
      ) : null}

      {editOpen ? <InventoryFormModal item={item} onClose={() => setEditOpen(false)} /> : null}
    </div>
  );
}
