import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Pencil, Plus } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { SectionCard } from '../components/common/SectionCard';
import { Tabs, type TabDefinition } from '../components/common/Tabs';
import { Button, buttonClasses } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';
import { RiskBadge, CriticalityBadge, Badge } from '../components/common/StatusBadge';
import { ForecastPanel } from '../components/forecasts/ForecastPanel';
import { InventoryFormDialog } from '../components/inventory/InventoryFormDialog';
import { RecordActionDialog, type ActionTarget } from '../components/recommendations/RecordActionDialog';
import { useInventory } from '../hooks/useInventory';
import { useActivity } from '../hooks/useActivity';
import { useSettings } from '../hooks/useSettings';
import { formatCurrency, formatDailyRate, formatQuantity, formatWholeDaysRemaining } from '../lib/formatters';
import { formatLongDate, formatShortDate } from '../lib/dates';
import { summariseSupplierLeadTimes } from '../lib/deliveries';
import { PRIORITY_MAX_SCORE } from '../lib/priorityScoring';
import { Alert } from '../components/common/Alert';
import { FileSearch, Package } from 'lucide-react';
import type { InventoryItem } from '../types/inventory';

type ItemTab = 'overview' | 'forecast' | 'deliveries' | 'activity';

const TABS: TabDefinition<ItemTab>[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'forecast', label: 'Forecast' },
  { id: 'deliveries', label: 'Deliveries' },
  { id: 'activity', label: 'Activity' },
];

function isItemTab(value: string | null): value is ItemTab {
  return value === 'overview' || value === 'forecast' || value === 'deliveries' || value === 'activity';
}

export function ItemDetailPage() {
  const { itemId = '' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { getItemById, getRowById, recommendations, deliveries, incidents, asOfDate, status, errorMessage } = useInventory();
  const { events, recordedActions } = useActivity();
  const { settings } = useSettings();
  const [formOpen, setFormOpen] = useState(false);
  const [actionTarget, setActionTarget] = useState<ActionTarget | null>(null);

  const item = getItemById(itemId);
  const row = getRowById(itemId);
  const recommendation = recommendations.find((candidate) => candidate.itemId === itemId);
  const tabParam = searchParams.get('tab');
  const activeTab: ItemTab = isItemTab(tabParam) ? tabParam : 'overview';

  const setTab = (tab: ItemTab) => {
    const next = new URLSearchParams(searchParams);
    if (tab === 'overview') next.delete('tab');
    else next.set('tab', tab);
    setSearchParams(next, { replace: true });
  };

  const itemDeliveries = useMemo(() => deliveries.filter((delivery) => delivery.itemId === itemId).sort((a, b) => (a.deliveryDate < b.deliveryDate ? 1 : -1)), [deliveries, itemId]);
  const supplierSummary = useMemo(() => summariseSupplierLeadTimes(itemDeliveries), [itemDeliveries]);
  const itemIncidents = useMemo(() => incidents.filter((incident) => incident.itemId === itemId), [incidents, itemId]);
  const itemEvents = events.filter((event) => event.itemId === itemId);

  if (status === 'loading') {
    return <PageHeader title="Loading item…" />;
  }
  if (status === 'error') {
    return (
      <>
        <PageHeader title="Item" />
        <Alert tone="error">{errorMessage ?? 'The item could not be loaded.'}</Alert>
      </>
    );
  }

  if (!item || !row) {
    return (
      <>
        <PageHeader title="Item not found" breadcrumbs={[{ label: 'Inventory', to: '/inventory' }, { label: 'Not found' }]} />
        <SectionCard>
          <EmptyState
            icon={<FileSearch size={20} aria-hidden="true" />}
            title="This item is not in the inventory"
            description="It may have been deleted in this session, or the link is out of date."
            action={
              <Link className={buttonClasses({ variant: 'primary' })} to="/inventory">
                Back to inventory
              </Link>
            }
          />
        </SectionCard>
      </>
    );
  }

  const { analysis } = row;
  const itemTimeline = buildTimeline(item, itemDeliveries, itemIncidents, itemEvents, recordedActions.filter((action) => action.itemId === item.id), asOfDate);

  return (
    <>
      <PageHeader
        title={item.name}
        breadcrumbs={[{ label: 'Inventory', to: '/inventory' }, { label: item.name }]}
        subtitle={`${item.sku} · ${item.location} · ${item.category}`}
        actions={
          <>
            <Button icon={<Pencil size={14} aria-hidden="true" />} onClick={() => setFormOpen(true)}>
              Edit item
            </Button>
            <Button variant="primary" icon={<Plus size={14} aria-hidden="true" />} onClick={() => setActionTarget({ itemId: item.id, itemName: item.name })}>
              Record action
            </Button>
          </>
        }
      />

      <section className="item-hero" aria-label="Item summary">
        <div className="row row--wrap">
          <RiskBadge risk={analysis.risk} />
          <CriticalityBadge criticality={item.criticality} />
          <Badge tone="neutral">
            <Package size={12} aria-hidden="true" /> {item.supplierName}
          </Badge>
          <span className="text-small text-muted">Synthetic demo item</span>
        </div>
        <dl className="item-hero__facts" style={{ margin: 0 }}>
          <div>
            <dt>Stock on hand</dt>
            <dd>{formatQuantity(item.currentStock, item.unit)}</dd>
          </div>
          <div>
            <dt>Average daily use</dt>
            <dd>{formatDailyRate(item.averageDailyUsage, item.unit)}</dd>
          </div>
          <div>
            <dt>Stock lasts</dt>
            <dd>{analysis.daysOfStock === null ? 'No usage recorded' : formatWholeDaysRemaining(analysis.daysOfStock)}</dd>
          </div>
          <div>
            <dt>Runs out at current use</dt>
            <dd>{analysis.stockOutDate ? formatLongDate(analysis.stockOutDate) : '—'}</dd>
          </div>
          <div>
            <dt>Next replenishment</dt>
            <dd>{formatLongDate(analysis.replenishmentDate)}</dd>
          </div>
          <div>
            <dt>Gap before replenishment</dt>
            <dd className={analysis.gapDays > 0 ? 'text-critical' : undefined}>{analysis.gapDays > 0 ? `${analysis.gapDays} days` : 'None'}</dd>
          </div>
          <div>
            <dt>Suggested order</dt>
            <dd>{analysis.suggestedOrderQuantity > 0 ? `${formatQuantity(analysis.suggestedOrderQuantity, item.unit)} (${formatCurrency(analysis.suggestedOrderValue)})` : 'None needed'}</dd>
          </div>
          <div>
            <dt>Last stock count</dt>
            <dd>{formatShortDate(item.lastCountDate)}</dd>
          </div>
        </dl>
      </section>

      <Tabs tabs={TABS} value={activeTab} onChange={setTab} label="Item sections" />

      {activeTab === 'overview' && (
        <div role="tabpanel" id="panel-overview" aria-labelledby="tab-overview" className="grid grid--two">
          <SectionCard title="Stock and reorder rules" description="The figures behind the recommended order.">
            <dl className="key-value-list">
              <dt>Minimum stock</dt>
              <dd>{formatQuantity(item.minimumStock, item.unit)}</dd>
              <dt>Safety stock</dt>
              <dd>{formatQuantity(item.safetyStock, item.unit)}</dd>
              <dt>Lead time</dt>
              <dd>{item.leadTimeDays} days</dd>
              <dt>Demand during lead time</dt>
              <dd>{formatQuantity(analysis.demandDuringLeadTime, item.unit)}</dd>
              <dt>Reorder point</dt>
              <dd>{formatQuantity(analysis.reorderPoint, item.unit)}</dd>
              <dt>Inventory position</dt>
              <dd>{formatQuantity(analysis.inventoryPosition, item.unit)}</dd>
              <dt>Policy quantity</dt>
              <dd>{formatQuantity(analysis.policyReorderQuantity, item.unit)}</dd>
              <dt>Emergency quantity</dt>
              <dd>{formatQuantity(analysis.emergencyOrderQuantity, item.unit)}</dd>
              <dt>Unit cost</dt>
              <dd>{formatCurrency(item.unitCost)}</dd>
            </dl>
            <p className="chart-note">Suggested quantities are for review. Navetra does not place orders.</p>
          </SectionCard>

          <div className="stack-4">
            <SectionCard title="Recommendation" description="From the fixed reorder rules, in order.">
              {recommendation ? (
                <div className="stack-3">
                  <div className="recommendation__action" style={{ alignSelf: 'flex-start' }}>
                    {recommendation.action}
                  </div>
                  <p className="text-small" style={{ lineHeight: 1.6 }}>
                    {recommendation.reason}
                  </p>
                  <p className="text-small text-muted">
                    Priority score {recommendation.priorityScore} of {PRIORITY_MAX_SCORE}.{' '}
                    <Link to="/recommendations">See the ranking</Link>
                  </p>
                </div>
              ) : (
                <p className="text-small text-muted">No action is recommended. This item is safe under the current thresholds and usage.</p>
              )}
            </SectionCard>

            <SectionCard title="Dependencies and risk factors" description="Used for priority scoring and alerts.">
              <dl className="key-value-list">
                <dt>Services affected</dt>
                <dd>{item.servicesAffected}</dd>
                <dt>Alternative supplier</dt>
                <dd>{item.alternativeSupplierAvailable ? 'Available' : 'Not available'}</dd>
                <dt>Held at other locations</dt>
                <dd>{item.stockHeldElsewhere > 0 ? formatQuantity(item.stockHeldElsewhere, item.unit) : 'None recorded'}</dd>
                <dt>Scheduled delivery</dt>
                <dd>{item.expectedDeliveryDate && item.incomingQuantity > 0 ? `${formatQuantity(item.incomingQuantity, item.unit)} on ${formatShortDate(item.expectedDeliveryDate)}` : 'None scheduled'}</dd>
              </dl>
            </SectionCard>
          </div>
        </div>
      )}

      {activeTab === 'forecast' && (
        <div role="tabpanel" id="panel-forecast" aria-labelledby="tab-forecast">
          <ForecastPanel item={item} row={row} />
          <p className="chart-note" style={{ marginTop: 12 }}>
            Forecast horizon: {settings.forecastHorizonDays} days (set in Settings).
          </p>
        </div>
      )}

      {activeTab === 'deliveries' && (
        <div role="tabpanel" id="panel-deliveries" aria-labelledby="tab-deliveries" className="stack-4">
          <SectionCard title="Deliveries" description="Received deliveries from the 30-day record, and any scheduled arrival.">
            {itemDeliveries.length === 0 ? (
              <EmptyState compact title="No deliveries recorded" description="There are no received or scheduled deliveries for this item in the demo record." />
            ) : (
              <div className="table-wrap" style={{ border: 0, borderRadius: 0 }}>
                <table className="table table--compact">
                  <caption className="visually-hidden">Deliveries for {item.name}</caption>
                  <thead>
                    <tr>
                      <th scope="col">Delivery date</th>
                      <th scope="col">Status</th>
                      <th scope="col" className="num">
                        Quantity
                      </th>
                      <th scope="col" className="num">
                        Promised lead time
                      </th>
                      <th scope="col" className="num">
                        Actual lead time
                      </th>
                      <th scope="col">Supplier</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemDeliveries.map((delivery) => (
                      <tr key={delivery.id}>
                        <td>{formatLongDate(delivery.deliveryDate)}</td>
                        <td>{delivery.status === 'received' ? <Badge tone="safe">Received</Badge> : <Badge tone="info">Scheduled</Badge>}</td>
                        <td className="num">{formatQuantity(delivery.quantity, item.unit)}</td>
                        <td className="num">{delivery.expectedLeadTimeDays} days</td>
                        <td className="num">{delivery.actualLeadTimeDays === null ? '—' : `${delivery.actualLeadTimeDays} days`}</td>
                        <td>{delivery.supplierName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          {supplierSummary.length > 0 && (
            <SectionCard title="Supplier lead time" description="Promised against actual days, for received deliveries.">
              <ul className="turnover-list">
                {supplierSummary.map((summary) => (
                  <li key={summary.supplierName}>
                    <span>{summary.supplierName}</span>
                    <span>
                      Promised {summary.averageExpectedDays} days · Actual {summary.averageActualDays} days · Late {summary.lateCount} of {summary.receivedCount}
                    </span>
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}
        </div>
      )}

      {activeTab === 'activity' && (
        <div role="tabpanel" id="panel-activity" aria-labelledby="tab-activity">
          <SectionCard
            title="Activity"
            description="Stock-out history from the demo record, deliveries, and edits or actions recorded in this session."
          >
            {itemTimeline.length === 0 ? (
              <EmptyState compact title="No activity yet" description="Edits and recorded actions appear here during this session." />
            ) : (
              <ol className="timeline">
                {itemTimeline.map((entry) => (
                  <li key={entry.id}>
                    <div className="timeline__date">{formatLongDate(entry.date)}</div>
                    <div style={{ fontWeight: 500 }}>{entry.title}</div>
                    <div className="text-muted text-small">{entry.detail}</div>
                  </li>
                ))}
              </ol>
            )}
            <p className="card__footer">Session activity is not saved after you leave the page. The demo record is synthetic.</p>
          </SectionCard>
        </div>
      )}

      <InventoryFormDialog open={formOpen} onClose={() => setFormOpen(false)} item={item} />
      <RecordActionDialog open={actionTarget !== null} onClose={() => setActionTarget(null)} target={actionTarget} />
    </>
  );
}

interface TimelineEntry {
  id: string;
  date: string;
  title: string;
  detail: string;
}

function buildTimeline(
  item: InventoryItem,
  deliveries: { id: string; deliveryDate: string; status: string; quantity: number; supplierName: string }[],
  incidents: { id: string; startDate: string; endDate: string; durationDays: number; cause: string }[],
  events: { id: string; date: string; label: string; detail: string }[],
  actions: { id: string; recordedAt: string; actionTaken: string; note: string }[],
  asOfDate: string,
): TimelineEntry[] {
  const entries: TimelineEntry[] = [
    ...deliveries.map((delivery) => ({
      id: `delivery-${delivery.id}`,
      date: delivery.deliveryDate,
      title: delivery.status === 'received' ? `Delivery received: ${formatQuantity(delivery.quantity, item.unit)}` : `Delivery scheduled: ${formatQuantity(delivery.quantity, item.unit)}`,
      detail: delivery.supplierName,
    })),
    ...incidents.map((incident) => ({
      id: `incident-${incident.id}`,
      date: incident.startDate,
      title: `Stock-out for ${incident.durationDays} ${incident.durationDays === 1 ? 'day' : 'days'}`,
      detail: `${incident.cause}. Ended ${formatShortDate(incident.endDate)}.`,
    })),
    ...events.map((event) => ({ id: `event-${event.id}`, date: event.date, title: event.label, detail: event.detail })),
    ...actions.map((action) => ({ id: `action-${action.id}`, date: action.recordedAt, title: 'Action recorded', detail: `${action.actionTaken}${action.note ? `: ${action.note}` : ''}` })),
  ];
  return entries.sort((a, b) => (a.date === b.date ? (a.id < b.id ? 1 : -1) : a.date < b.date ? 1 : -1)).map((entry) => ({ ...entry, date: entry.date || asOfDate }));
}
