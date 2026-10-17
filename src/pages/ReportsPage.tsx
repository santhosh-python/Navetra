import { useMemo, useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { SectionCard } from '../components/common/SectionCard';
import { Button } from '../components/common/Button';
import { SegmentedControl } from '../components/common/SegmentedControl';
import { EmptyState, LoadingState } from '../components/common/EmptyState';
import { Alert } from '../components/common/Alert';
import { useInventory } from '../hooks/useInventory';
import { filterRowsByScope } from '../lib/inventoryQuery';
import { useSettings } from '../hooks/useSettings';
import { useNotifications } from '../hooks/useNotifications';
import { buildReport, REPORT_TYPES, reportToCsvRows, type ReportType } from '../lib/reports';
import { stringifyCsv, downloadTextFile } from '../lib/csv';
import { formatLongDate } from '../lib/dates';

const WINDOW_OPTIONS = [
  { value: '7', label: '7 days' },
  { value: '14', label: '14 days' },
  { value: '30', label: '30 days' },
] as const;

export function ReportsPage() {
  const { rows: allRows, recommendations: allRecommendations, historyByItemId, asOfDate, status, errorMessage, isDemoData, locations, categories } = useInventory();
  const { settings } = useSettings();
  const { showToast } = useNotifications();
  const [reportType, setReportType] = useState<ReportType>('inventory-status');
  const [windowDays, setWindowDays] = useState<'7' | '14' | '30'>('14');
  const [locationFilter, setLocationFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // The report covers only the chosen location and category. Recommendations are limited to the same items.
  const rows = useMemo(() => filterRowsByScope(allRows, { location: locationFilter, category: categoryFilter }), [allRows, locationFilter, categoryFilter]);
  const recommendations = useMemo(() => {
    const ids = new Set(rows.map((row) => row.item.id));
    return allRecommendations.filter((recommendation) => ids.has(recommendation.itemId));
  }, [allRecommendations, rows]);

  const table = useMemo(
    () =>
      buildReport(reportType, {
        rows,
        recommendations,
        historyByItemId,
        asOfDate,
        horizonDays: settings.forecastHorizonDays,
        replenishmentWindowDays: Number(windowDays),
      }),
    [reportType, rows, recommendations, historyByItemId, asOfDate, settings.forecastHorizonDays, windowDays],
  );

  const reportMeta = REPORT_TYPES.find((report) => report.id === reportType);

  if (status === 'loading') {
    return (
      <>
        <PageHeader title="Reports" />
        <SectionCard>
          <LoadingState label="Loading reports" />
        </SectionCard>
      </>
    );
  }
  if (status === 'error') {
    return (
      <>
        <PageHeader title="Reports" />
        <Alert tone="error">{errorMessage ?? 'Reports could not be built.'}</Alert>
      </>
    );
  }

  const exportCsv = () => {
    const csv = reportToCsvRows(table);
    downloadTextFile(`navetra-demo-${reportType}.csv`, stringifyCsv(csv.headers, csv.rows));
    showToast(`Exported ${table.rows.length} ${table.rows.length === 1 ? 'row' : 'rows'} to CSV.`);
  };

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="Build a report from the current figures, then print it or export CSV. Every report is generated from the same calculations as the other pages."
        actions={
          <>
            <Button icon={<Printer size={15} aria-hidden="true" />} onClick={() => window.print()}>
              Print
            </Button>
            <Button variant="primary" icon={<Download size={15} aria-hidden="true" />} onClick={exportCsv} disabled={table.rows.length === 0}>
              Export CSV
            </Button>
          </>
        }
      />

      <div className="stack-4">
        <SectionCard title="Report type" description="Choose a report, then limit it to a location or category.">
          <div role="radiogroup" aria-label="Report type" className="report-type-grid">
            {REPORT_TYPES.map((report) => {
              const checked = report.id === reportType;
              return (
                <button
                  key={report.id}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  className="preset-button"
                  style={checked ? { borderColor: 'rgba(217,119,50,0.55)', background: 'var(--color-accent-soft)' } : undefined}
                  onClick={() => setReportType(report.id)}
                >
                  <span className="preset-button__label">{report.label}</span>
                  <span className="preset-button__description">{report.description}</span>
                </button>
              );
            })}
          </div>
          <div className="report-filters">
            <label className="control-group">
              <span className="control-group__label">Location</span>
              <select className="select" value={locationFilter} onChange={(event) => setLocationFilter(event.target.value)}>
                <option value="all">All locations</option>
                {locations.map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
            </label>
            <label className="control-group">
              <span className="control-group__label">Category</span>
              <select className="select" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                <option value="all">All categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
            {reportType === 'upcoming-replenishment' && (
              <div className="control-group">
                <span className="control-group__label" id="window-label">
                  Replenishment window
                </span>
                <SegmentedControl label="Replenishment window" options={WINDOW_OPTIONS.map((option) => ({ value: option.value, label: option.label }))} value={windowDays} onChange={setWindowDays} />
              </div>
            )}
          </div>
        </SectionCard>

        <div>
          <article className="card" aria-labelledby="report-title">
            <div className="report-print-title">Navetra · {reportMeta?.label}</div>
            <div className="card__header">
              <div>
                <h2 className="card__title" id="report-title">
                  {reportMeta?.label}
                </h2>
                <p className="card__description">{reportMeta?.description}</p>
              </div>
            </div>
            <div className="report-meta">
              <span>As of {formatLongDate(asOfDate)}</span>
              <span>{settings.organizationName}</span>
              <span>{table.rows.length} {table.rows.length === 1 ? 'row' : 'rows'}</span>
              {isDemoData && <span>Synthetic demo data</span>}
            </div>

            {table.rows.length === 0 ? (
              <EmptyState compact title="No rows for this report" description="Nothing matches the current figures. For example, no items are critical or no delivery falls in the window." />
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <caption className="visually-hidden">{reportMeta?.label}</caption>
                  <thead>
                    <tr>
                      {table.columns.map((column) => (
                        <th key={column.key} scope="col" className={column.align === 'right' ? 'num' : undefined}>
                          {column.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {table.rows.map((row, index) => (
                      <tr key={index}>
                        {table.columns.map((column) => (
                          <td key={column.key} className={column.align === 'right' ? 'num' : undefined}>
                            {row[column.key]?.display ?? '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <p className="card__footer">
              Estimates use the rule-based method described in Shortage forecasts. Figures are synthetic demo data, not operational records.
            </p>
          </article>
        </div>
      </div>
    </>
  );
}
