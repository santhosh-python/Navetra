import { useEffect, useState } from "react";
import { Alert } from "../components/common/Alert";
import { MetricCard } from "../components/common/MetricCard";
import { SectionCard } from "../components/common/SectionCard";
import { PageHeader } from "../components/layout/PageHeader";
import {
  getResearchProducts,
  getResearchBacktest,
  getResearchHealth,
  getResearchSummary,
  type ResearchBacktest,
  type ResearchHealth,
  type ResearchProduct,
  type ResearchSummary,
} from "../services/researchService";

function formatNumber(value: number): string {
  return Number.isFinite(value) ? value.toLocaleString() : "—";
}

function formatPercent(value: number): string {
  return Number.isFinite(value) ? `${value.toFixed(2)}%` : "—";
}

export function ResearchDataPage() {
  const [summary, setSummary] = useState<ResearchSummary | null>(null);
  const [products, setProducts] = useState<ResearchProduct[]>([]);
  const [backtest, setBacktest] = useState<ResearchBacktest | null>(null);
  const [health, setHealth] = useState<ResearchHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadResearchData() {
      setLoading(true);
      setError(null);

      try {
        const [summaryResult, productResult, backtestResult, healthResult] =
          await Promise.all([
          getResearchSummary(),
          getResearchProducts(10),
          getResearchBacktest(),
          getResearchHealth(),
          ]);

        if (!cancelled) {
          setSummary(summaryResult);
          setProducts(productResult.items);
          setBacktest(backtestResult);
          setHealth(healthResult);
        }
      } catch (cause) {
        if (!cancelled) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Unable to load research data."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadResearchData();

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  return (
    <>
      <PageHeader
        title="Research Data"
        subtitle="Explore real historical medicine inventory records and observed stockout patterns."
      />

      <Alert tone="info">
        <strong>Historical research dataset.</strong> These records come from
        healthcare facilities in Sierra Leone, spanning October 2019 to
        November 2023. They are not live stock levels for Indian hospitals.
        Recorded stockout rates describe this dataset; they are not predictions
        of future stockouts.
      </Alert>

      {loading && (
        <SectionCard title="Loading research data">
          <p className="text-muted">
            Connecting to the historical inventory API…
          </p>
        </SectionCard>
      )}

      {!loading && error && (
        <SectionCard title="Research data unavailable">
          <Alert tone="error">{error}</Alert>
          <button
            type="button"
            className="button"
            onClick={() => setAttempt((current) => current + 1)}
          >
            Retry connection
          </button>
        </SectionCard>
      )}

      {!loading && !error && summary && (
        <>
          {health && !health.model_loadable && (
            <Alert tone="error">
              The research API is reachable, but the trained model is not
              loadable. Run the documented training command before using model
              predictions.
            </Alert>
          )}
          <div className="grid grid--metrics" style={{ marginTop: 16 }}>
            <MetricCard
              label="Historical records"
              value={formatNumber(summary.rows)}
              context="Inventory observations in the dataset"
            />
            <MetricCard
              label="Healthcare facilities"
              value={formatNumber(summary.facilities)}
              context="Unique facility identifiers"
            />
            <MetricCard
              label="Products"
              value={formatNumber(summary.products)}
              context="Unique product identifiers"
            />
            <MetricCard
              label="Recorded stockout rate"
              value={formatPercent(summary.stockout_rate_percent)}
              context={`${formatNumber(summary.stockout_rows)} records marked stockout`}
              tone="critical"
            />
          </div>

          <SectionCard
            title="Held-out backtest"
            description={backtest?.methodology ?? "Chronological model evaluation."}
          >
            {backtest ? (
              <>
                <div className="grid grid--metrics">
                  <MetricCard
                    label="Final test evaluations"
                    value={formatNumber(backtest.evaluations)}
                    context={`${backtest.test_from} to ${backtest.test_to}`}
                  />
                  <MetricCard
                    label="Stock-rule F1"
                    value={formatPercent(backtest.stock_based_rule.f1_percent)}
                    context={`Precision ${formatPercent(backtest.stock_based_rule.precision_percent)} · Recall ${formatPercent(backtest.stock_based_rule.recall_percent)}`}
                  />
                  <MetricCard
                    label="Persistence F1"
                    value={formatPercent(backtest.previous_month_persistence_baseline.f1_percent)}
                    context={`Precision ${formatPercent(backtest.previous_month_persistence_baseline.precision_percent)} · Recall ${formatPercent(backtest.previous_month_persistence_baseline.recall_percent)}`}
                  />
                  <MetricCard
                    label="Target"
                    value="stockout = 1"
                    context={`${formatNumber(backtest.actual_stockouts)} positive labels`}
                  />
                </div>
                <p className="text-muted" style={{ marginTop: 12 }}>
                  The final test remains separate from threshold selection. This
                  page reports historical evidence, not current inventory risk.
                </p>
              </>
            ) : (
              <p className="text-muted">No backtest result was returned.</p>
            )}
          </SectionCard>

          <SectionCard
            title="Dataset coverage"
            description="Date coverage and data-quality checks from the loaded source."
          >
            <div className="grid grid--metrics">
              <MetricCard
                label="First observation"
                value={summary.first_observation}
                context="Earliest recorded date"
              />
              <MetricCard
                label="Last observation"
                value={summary.last_observation}
                context="Most recent recorded date"
              />
              <MetricCard
                label="Observation dates"
                value={formatNumber(summary.unique_observation_dates)}
                context="Distinct dates in the dataset"
              />
              <MetricCard
                label="Balance mismatches"
                value={formatNumber(summary.balance_mismatches)}
                context={`Out of ${formatNumber(summary.balance_checks)} checked records`}
                tone={summary.balance_mismatches > 0 ? "critical" : "default"}
              />
            </div>
            <p className="text-muted" style={{ marginTop: 12 }}>
              The balance check compares opening balance + receipts −
              consumption against recorded closing balance. Mismatches are
              reported, not silently corrected.
            </p>
          </SectionCard>

          <SectionCard
            title="Products with the highest observed stockout rates"
            description="Top 10 products ranked by their recorded stockout rate. These are historical observations, not a forecast ranking."
            flush
          >
            {products.length === 0 ? (
              <p className="text-muted" style={{ padding: 16 }}>
                No product records were returned.
              </p>
            ) : (
              <div className="table-wrap">
                <table className="table table--compact">
                  <caption className="visually-hidden">
                    Products ranked by observed stockout rate
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Product</th>
                      <th scope="col">ID</th>
                      <th scope="col" className="num">Facilities</th>
                      <th scope="col" className="num">Records</th>
                      <th scope="col" className="num">Stockout rate</th>
                      <th scope="col" className="num">Mean recorded consumption</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => (
                      <tr key={product.productID}>
                        <td>{product.name1}</td>
                        <td>{product.productID}</td>
                        <td className="num">
                          {formatNumber(product.facility_count)}
                        </td>
                        <td className="num">
                          {formatNumber(product.observations)}
                        </td>
                        <td className="num">
                          {formatPercent(product.stockout_rate_percent)}
                        </td>
                        <td className="num">
                          {product.mean_recorded_consumption == null
                            ? "—"
                            : formatNumber(product.mean_recorded_consumption)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </>
      )}
    </>
  );
}
