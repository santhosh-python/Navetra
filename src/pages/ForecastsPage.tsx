import { useMemo, useState } from 'react';
import { Info } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { SectionCard } from '../components/common/SectionCard';
import { Alert } from '../components/common/Alert';
import { RiskBadge } from '../components/common/StatusBadge';
import { LoadingState } from '../components/common/EmptyState';
import { ForecastPanel } from '../components/forecasts/ForecastPanel';
import { useInventory } from '../hooks/useInventory';
import { useSettings } from '../hooks/useSettings';
import { sortInventoryRows } from '../lib/inventoryQuery';
import { formatLongDate, formatShortDate } from '../lib/dates';
import { formatWholeDaysRemaining } from '../lib/formatters';
import { MetricCard } from '../components/common/MetricCard';

export function ForecastsPage() {
  const { rows, status, errorMessage, asOfDate } = useInventory();
  const { settings } = useSettings();
  const sortedRows = useMemo(() => sortInventoryRows(rows, 'stockOutDate', 'asc'), [rows]);
  const defaultId = sortedRows.find((row) => row.analysis.gapDays > 0)?.item.id ?? sortedRows[0]?.item.id ?? null;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const activeId = selectedId ?? defaultId;
  const selectedRow = rows.find((row) => row.item.id === activeId) ?? null;

  if (status === 'loading') {
    return (
      <>
        <PageHeader title="Shortage forecasts" subtitle="Loading…" />
        <SectionCard>
          <LoadingState label="Loading forecasts" />
        </SectionCard>
      </>
    );
  }
  if (status === 'error') {
    return (
      <>
        <PageHeader title="Shortage forecasts" />
        <Alert tone="error">{errorMessage ?? 'Forecasts could not be loaded.'}</Alert>
      </>
    );
  }

  const shortItems = rows.filter((row) => row.analysis.gapDays > 0).length;
  const earliest = sortedRows.find((row) => row.analysis.stockOutDate !== null);
  const noUsage = rows.filter((row) => row.item.averageDailyUsage <= 0).length;

  return (
    <>
      <PageHeader
        title="Shortage forecasts"
        subtitle={`Projected stock at current use, as of ${formatLongDate(asOfDate)}. Rule-based estimates, not machine-learning predictions.`}
      />

      <Alert tone="info">
        <strong>How these estimates work.</strong> Current stock is divided by the recorded average daily use to find when stock runs out. Scheduled deliveries are included. Usage is assumed to stay the same. Use the what-if simulator to test other assumptions.
      </Alert>

      <div className="grid grid--metrics" style={{ marginTop: 16 }}>
        <MetricCard label="Items short before delivery" value={shortItems} tone={shortItems > 0 ? 'critical' : 'default'} context="Stock runs out before the next replenishment date" />
        <MetricCard
          label="Earliest stock-out"
          value={earliest?.analysis.stockOutDate ? formatShortDate(earliest.analysis.stockOutDate) : '—'}
          context={earliest ? `${earliest.item.name} · ${formatWholeDaysRemaining(earliest.analysis.daysOfStock ?? 0)}` : 'No stock-out in the current figures'}
        />
        <MetricCard label="Forecast horizon" value={`${settings.forecastHorizonDays} days`} context="Change in Settings" />
        <MetricCard label="Items without usage data" value={noUsage} context="No estimate is possible until usage is recorded" tooltip="Items with zero average daily use cannot have a stock-out estimated." />
      </div>

      <div className="grid grid--split" style={{ marginTop: 16, alignItems: 'start' }}>
        <SectionCard title="All items" description="Select an item to see its projection. Sorted by earliest stock-out." flush>
          <div className="table-wrap" style={{ border: 0, borderRadius: 0 }}>
            <table className="table table--compact">
              <caption className="visually-hidden">Forecast summary for each item</caption>
              <thead>
                <tr>
                  <th scope="col">Item</th>
                  <th scope="col">Risk</th>
                  <th scope="col">Runs out</th>
                  <th scope="col">Delivery</th>
                  <th scope="col" className="num">
                    Gap
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map(({ item, analysis }) => (
                  <tr key={item.id} className={item.id === activeId ? 'is-selected' : undefined}>
                    <td>
                      <button type="button" className="table-row-button" aria-pressed={item.id === activeId} onClick={() => setSelectedId(item.id)}>
                        {item.name}
                      </button>
                      <div className="table__secondary">{item.sku}</div>
                    </td>
                    <td>
                      <RiskBadge risk={analysis.risk} />
                    </td>
                    <td>{analysis.stockOutDate ? formatShortDate(analysis.stockOutDate) : <span className="text-subtle">No usage</span>}</td>
                    <td>{formatShortDate(analysis.replenishmentDate)}</td>
                    <td className={`num ${analysis.gapDays > 0 ? 'text-critical' : ''}`}>{analysis.gapDays > 0 ? `${analysis.gapDays} d` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <div>
          {selectedRow ? (
            <div className="stack-4">
              <div className="row" style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
                <Info size={14} aria-hidden="true" /> Showing {selectedRow.item.name}
              </div>
              <ForecastPanel item={selectedRow.item} row={selectedRow} />
            </div>
          ) : (
            <SectionCard>
              <p className="text-muted">No items to forecast.</p>
            </SectionCard>
          )}
        </div>
      </div>
    </>
  );
}
