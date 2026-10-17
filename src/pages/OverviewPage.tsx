import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Layers, OctagonAlert, Wallet } from 'lucide-react';
import { useInventory } from '../hooks/useInventory';
import { useSettings } from '../hooks/useSettings';
import { PageHeader } from '../components/layout/PageHeader';
import { MetricCard } from '../components/common/MetricCard';
import { SectionCard } from '../components/common/SectionCard';
import { Alert } from '../components/common/Alert';
import { LoadingState, EmptyState } from '../components/common/EmptyState';
import { RiskBadge } from '../components/common/StatusBadge';
import { Button, buttonClasses } from '../components/common/Button';
import { RiskDonut } from '../components/charts/RiskDonut';
import { StockOutTimeline } from '../components/charts/StockOutTimeline';
import { ConsumptionStockChart } from '../components/charts/ConsumptionStockChart';
import { AtRiskTrendChart } from '../components/charts/AtRiskTrendChart';
import { NeedsAttentionList } from '../components/dashboard/NeedsAttentionList';
import { buildAtRiskTrend, countByRisk } from '../lib/portfolio';
import { HISTORY_DAYS } from '../data/demoHistory';
import { sortInventoryRows, type InventoryRow } from '../lib/inventoryQuery';
import { formatCurrency, formatDailyRate, formatDecimal, formatQuantity, formatWholeDaysRemaining } from '../lib/formatters';
import { formatLongDate, formatShortDate } from '../lib/dates';
import type { RiskLevel } from '../types/inventory';
import { RISK_LABELS } from '../lib/riskClassification';

export function OverviewPage() {
  const { rows, summary, items, historyByItemId, asOfDate, status, errorMessage, isDemoData } = useInventory();
  const { settings, riskThresholds } = useSettings();
  const [riskFilter, setRiskFilter] = useState<RiskLevel | 'all'>('all');
  const [consumptionItemId, setConsumptionItemId] = useState<string | null>(null);

  const urgentRows = useMemo(() => sortInventoryRows(rows, 'urgency', 'asc'), [rows]);
  const filteredRows: InventoryRow[] = useMemo(
    () => (riskFilter === 'all' ? urgentRows : urgentRows.filter((row) => row.analysis.risk === riskFilter)),
    [urgentRows, riskFilter],
  );
  const counts = useMemo(() => countByRisk(rows), [rows]);

  const trend = useMemo(
    () =>
      buildAtRiskTrend(items, historyByItemId, asOfDate, HISTORY_DAYS, settings.forecastHorizonDays, riskThresholds.warningDays, settings.targetCoverDays, riskThresholds),
    [items, historyByItemId, asOfDate, settings.forecastHorizonDays, riskThresholds, settings.targetCoverDays],
  );
  // Trend index 30 is today (first projected day); index 23 is seven days earlier (last 7 observed days).
  const todayCount = trend[HISTORY_DAYS]?.count ?? 0;
  const weekAgoCount = trend[HISTORY_DAYS - 7]?.count ?? 0;

  if (status === 'loading') {
    return (
      <>
        <PageHeader title="Overview" subtitle="Loading stock position…" />
        <SectionCard>
          <LoadingState label="Loading inventory" />
        </SectionCard>
      </>
    );
  }

  if (status === 'error') {
    return (
      <>
        <PageHeader title="Overview" />
        <Alert tone="error">{errorMessage ?? 'The inventory data could not be loaded.'}</Alert>
      </>
    );
  }

  const selectedConsumptionId = consumptionItemId ?? urgentRows[0]?.item.id ?? null;
  const consumptionRow = rows.find((row) => row.item.id === selectedConsumptionId);

  return (
    <>
      <PageHeader
        title="Overview"
        subtitle={`Stock position as of ${formatLongDate(asOfDate)} for ${settings.organizationName}. ${isDemoData ? 'Synthetic demo data.' : ''}`}
        actions={
          <>
            <Link className={buttonClasses({ variant: 'secondary' })} to="/recommendations">
              Recommendations
            </Link>
            <Link className={buttonClasses({ variant: 'primary' })} to="/inventory">
              Open inventory
            </Link>
          </>
        }
      />

      <div className="grid grid--metrics">
        <MetricCard label="Items tracked" value={summary.total} icon={<Layers size={16} aria-hidden="true" />} context={`${summary.critical} critical · ${summary.warning} warning · ${summary.safe} safe`} />
        <MetricCard
          label="Critical items"
          tone="critical"
          value={summary.critical}
          icon={<OctagonAlert size={16} aria-hidden="true" />}
          tooltip={`Critical when stock runs out before replenishment, or lasts ${riskThresholds.criticalDays} days or fewer.`}
          context={`Stock lasts ${riskThresholds.criticalDays} days or fewer, or runs out before delivery`}
          trend={{ text: `${todayCount} at warning level or below (was ${weekAgoCount} a week ago)`, direction: todayCount > weekAgoCount ? 'up' : todayCount < weekAgoCount ? 'down' : 'flat', goodWhen: 'down' }}
        />
        <MetricCard
          label="Stock-outs before delivery"
          value={summary.atRiskBeforeReplenishment}
          icon={<AlertTriangle size={16} aria-hidden="true" />}
          tooltip="Items whose stock runs out at current use before the next replenishment date."
          context="Stock runs out at current use before replenishment"
        />
        <MetricCard
          label="Suggested order value"
          value={formatCurrency(summary.suggestedReorderValue)}
          icon={<Wallet size={16} aria-hidden="true" />}
          context="For critical and warning items, from the reorder rules. Not an order: nothing has been placed."
        />
      </div>

      <div className="grid grid--dashboard" style={{ marginTop: 16 }}>
        <SectionCard title="Risk mix" description="Select a segment to filter the timeline and table below." className="span-4">
          <RiskDonut counts={counts} total={summary.total} selected={riskFilter} onSelect={setRiskFilter} />
        </SectionCard>
        <SectionCard
          title="Stock-out timeline"
          description={`Projected at current use over ${settings.forecastHorizonDays} days, with scheduled deliveries.`}
          className="span-8"
          actions={<span className="text-small text-muted">{filteredRows.length} shown</span>}
        >
          <StockOutTimeline rows={filteredRows} asOfDate={asOfDate} horizonDays={settings.forecastHorizonDays} limit={10} />
        </SectionCard>

        <SectionCard
          title="Consumption and stock"
          description="Observed daily use and closing stock for the last 30 days."
          className="span-6"
          actions={
            <label className="row" style={{ fontSize: 'var(--font-size-sm)' }}>
              <span className="visually-hidden">Choose item</span>
              <select className="select" style={{ width: 240, minHeight: 32, height: 32 }} value={selectedConsumptionId ?? ''} onChange={(event) => setConsumptionItemId(event.target.value)} aria-label="Item for consumption chart">
                {urgentRows.map((row) => (
                  <option key={row.item.id} value={row.item.id}>
                    {row.item.name}
                  </option>
                ))}
              </select>
            </label>
          }
        >
          {consumptionRow ? (
            <ConsumptionStockChart history={historyByItemId[consumptionRow.item.id] ?? []} unit={consumptionRow.item.unit} itemName={consumptionRow.item.name} />
          ) : (
            <EmptyState compact title="No items" description="Add an item to see its consumption." />
          )}
          {consumptionRow && (
            <p className="chart-note">
              Average use {formatDailyRate(consumptionRow.item.averageDailyUsage, consumptionRow.item.unit)}. Stock lasts {consumptionRow.analysis.daysOfStock === null ? 'an unknown time' : formatWholeDaysRemaining(consumptionRow.analysis.daysOfStock)}.
            </p>
          )}
        </SectionCard>

        <SectionCard
          title="Items at warning level or below"
          description={`Count per day: ${riskThresholds.warningDays} days of stock or fewer. Observed, then a rule-based estimate.`}
          className="span-6"
        >
          <AtRiskTrendChart points={trend} asOfDate={asOfDate} warningDays={riskThresholds.warningDays} />
        </SectionCard>

        <SectionCard
          title="Needs attention"
          description="The most urgent items, from the same ranking as the Recommendations page."
          className="span-12"
          actions={
            <Link className={buttonClasses({ size: 'sm' })} to="/recommendations">
              All recommendations
            </Link>
          }
        >
          <NeedsAttentionList limit={5} />
        </SectionCard>

        <SectionCard
          title="Stock position"
          description={riskFilter === 'all' ? 'All items, most urgent first.' : `Filtered: ${RISK_LABELS[riskFilter]} items. Select “All items” in the risk mix to clear.`}
          className="span-12"
          flush
          actions={
            riskFilter !== 'all' ? (
              <Button size="sm" variant="ghost" onClick={() => setRiskFilter('all')}>
                Clear filter
              </Button>
            ) : undefined
          }
        >
          {filteredRows.length === 0 ? (
            <div style={{ padding: '0 20px 20px' }}>
              <EmptyState compact title="No items in this risk level" description="Choose another segment in the risk mix." />
            </div>
          ) : (
            <div className="table-wrap" style={{ border: 0, borderRadius: 0 }}>
              <table className="table table--compact">
                <caption className="visually-hidden">Stock position for each item, filtered by risk</caption>
                <thead>
                  <tr>
                    <th scope="col">Item</th>
                    <th scope="col">Risk</th>
                    <th scope="col" className="num">
                      Stock
                    </th>
                    <th scope="col" className="num">
                      Days of stock
                    </th>
                    <th scope="col">Runs out at current use</th>
                    <th scope="col">Next replenishment</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map(({ item, analysis }) => (
                    <tr key={item.id}>
                      <td>
                        <Link to={`/inventory/${encodeURIComponent(item.id)}`} className="table__primary" style={{ textDecoration: 'none' }}>
                          {item.name}
                        </Link>
                        <div className="table__secondary">{item.location}</div>
                      </td>
                      <td>
                        <RiskBadge risk={analysis.risk} />
                      </td>
                      <td className="num">
                        {formatQuantity(item.currentStock, item.unit)}
                      </td>
                      <td className="num">{analysis.daysOfStock === null ? '—' : formatDecimal(analysis.daysOfStock)}</td>
                      <td>{analysis.stockOutDate ? formatShortDate(analysis.stockOutDate) : '—'}</td>
                      <td>{formatShortDate(analysis.replenishmentDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>
    </>
  );
}
