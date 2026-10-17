import { useMemo } from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { SectionCard } from '../components/common/SectionCard';
import { MetricCard } from '../components/common/MetricCard';
import { EmptyState, LoadingState } from '../components/common/EmptyState';
import { Alert } from '../components/common/Alert';
import { SimpleBarChart } from '../components/charts/SimpleBarChart';
import { CategoryRiskChart, CriticalityScatterChart, LeadTimeChart } from '../components/charts/AnalyticsCharts';
import { useInventory } from '../hooks/useInventory';
import { formatDecimal, formatWholeDaysRemaining } from '../lib/formatters';
import { formatShortDate } from '../lib/dates';
import {
  averageIncidentDuration,
  buildCategoryRiskRows,
  buildCriticalityScatter,
  buildStockOutHistoryRows,
  buildTurnoverRows,
  buildVariabilityRows,
  countDeliveriesByStatus,
} from '../lib/analytics';
import { countRecordedStockOutDays } from '../lib/history';
import { summariseSupplierLeadTimes } from '../lib/deliveries';
import { PackageCheck, Truck, CalendarClock, Timer } from 'lucide-react';

export function AnalyticsPage() {
  const { rows, items, historyByItemId, incidents, deliveries, status, errorMessage } = useInventory();

  const categoryRows = useMemo(() => buildCategoryRiskRows(rows), [rows]);
  const scatterPoints = useMemo(() => buildCriticalityScatter(rows), [rows]);
  const turnover = useMemo(
    () =>
      buildTurnoverRows(rows)
        .filter((row): row is typeof row & { turnover: number } => row.turnover !== null)
        .sort((a, b) => b.turnover - a.turnover)
        .map((row) => ({ label: row.name, value: row.turnover })),
    [rows],
  );
  const variability = useMemo(
    () =>
      buildVariabilityRows(items, historyByItemId)
        .filter((row): row is typeof row & { variabilityPercent: number } => row.variabilityPercent !== null)
        .map((row) => ({ label: row.name, value: row.variabilityPercent })),
    [items, historyByItemId],
  );
  const incidentRows = useMemo(() => buildStockOutHistoryRows(incidents, items), [incidents, items]);
  const stockOutDays = useMemo(
    () =>
      items
        .map((item) => ({ label: item.name, value: countRecordedStockOutDays(historyByItemId[item.id] ?? []) }))
        .filter((row) => row.value > 0)
        .sort((a, b) => b.value - a.value),
    [items, historyByItemId],
  );
  const leadTimes = useMemo(() => summariseSupplierLeadTimes(deliveries), [deliveries]);
  const deliveryCounts = countDeliveriesByStatus(deliveries);
  const averageDuration = averageIncidentDuration(incidents);
  const totalStockOutDays = stockOutDays.reduce((sum, row) => sum + row.value, 0);

  if (status === 'loading') {
    return (
      <>
        <PageHeader title="Analytics" />
        <SectionCard>
          <LoadingState label="Loading analytics" />
        </SectionCard>
      </>
    );
  }
  if (status === 'error') {
    return (
      <>
        <PageHeader title="Analytics" />
        <Alert tone="error">{errorMessage ?? 'Analytics could not be loaded.'}</Alert>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Analytics"
        subtitle="Patterns across the inventory, drawn from the synthetic 30-day record, deliveries and stock-out history. Figures are demo data."
      />

      <div className="analytics-kpi">
        <MetricCard label="Average incident length" value={averageDuration === null ? '—' : formatWholeDaysRemaining(averageDuration)} icon={<Timer size={16} aria-hidden="true" />} context="Mean length of logged stock-out incidents, any date" />
        <MetricCard label="Zero-stock days (30-day history)" value={totalStockOutDays} icon={<CalendarClock size={16} aria-hidden="true" />} context="Daily records with no opening stock, summed across items" />
        <MetricCard label="Deliveries received" value={deliveryCounts.received} icon={<PackageCheck size={16} aria-hidden="true" />} context="In the demo delivery record" />
        <MetricCard label="Deliveries scheduled" value={deliveryCounts.scheduled} icon={<Truck size={16} aria-hidden="true" />} context="Expected arrivals, not yet received" />
      </div>

      <div className="grid grid--two">
        <SectionCard title="Risk by category" description="How each category's items are spread across risk levels.">
          <CategoryRiskChart data={categoryRows} />
        </SectionCard>
        <SectionCard title="Criticality and days of stock" description="Items with high criticality and few days of stock need the most attention.">
          <CriticalityScatterChart points={scatterPoints} />
        </SectionCard>

        <SectionCard
          title="Annualised turnover"
          description="Daily use × 365 ÷ stock on hand, in times per year. Indicative only: high values mean stock is used up quickly relative to what is held."
        >
          <SimpleBarChart data={turnover} label="Annualised turnover by item" valueLabel="Turnover" valueFormatter={(value) => `${formatDecimal(value)}×`} layout="vertical" height="tall" />
        </SectionCard>
        <SectionCard title="Demand variability" description="How much daily use moves around its average over the 30-day record (coefficient of variation).">
          <SimpleBarChart data={variability} label="Demand variability by item" valueLabel="Variability" valueFormatter={(value) => `${formatDecimal(value)}%`} layout="vertical" height="tall" color="#D97732" />
        </SectionCard>

        <SectionCard title="Stock-out history" description="Duration of each recorded stock-out, from the synthetic incident log.">
          {incidentRows.length === 0 ? (
            <EmptyState compact title="No stock-outs recorded" />
          ) : (
            <SimpleBarChart
              data={incidentRows.map((row) => ({ label: `${row.itemName} (${formatShortDate(row.startDate)})`, value: row.durationDays }))}
              label="Duration of recorded stock-outs"
              valueLabel="Duration"
              valueFormatter={(value) => `${value} ${value === 1 ? 'day' : 'days'}`}
              layout="vertical"
              color="#C83D43"
            />
          )}
        </SectionCard>
        <SectionCard title="Days with stock-out, by item" description="Days in the 30-day record where opening stock was zero.">
          {stockOutDays.length === 0 ? (
            <EmptyState compact title="No stock-out days in the 30-day record" />
          ) : (
            <SimpleBarChart data={stockOutDays} label="Recorded stock-out days by item" valueLabel="Days" valueFormatter={(value) => `${value} ${value === 1 ? 'day' : 'days'}`} layout="vertical" color="#C83D43" />
          )}
        </SectionCard>

        <SectionCard title="Supplier lead time" description="Promised against actual days, for received deliveries." className="span-12">
          {leadTimes.length === 0 ? <EmptyState compact title="No received deliveries to compare" /> : <LeadTimeChart data={leadTimes} />}
        </SectionCard>
      </div>
    </>
  );
}
