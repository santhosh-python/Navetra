import { useEffect, useMemo, useState } from "react";
import { Alert } from "../components/common/Alert";
import { Button } from "../components/common/Button";
import { EmptyState, LoadingState } from "../components/common/EmptyState";
import { MetricCard } from "../components/common/MetricCard";
import { SectionCard } from "../components/common/SectionCard";
import { PageHeader } from "../components/layout/PageHeader";
import {
  getResearchBacktest,
  getResearchFacilities,
  getResearchForecast,
  getResearchHealth,
  getResearchHistory,
  getResearchMlForecast,
  getResearchProducts,
  getResearchSummary,
  type ResearchBacktest,
  type ResearchForecast,
  type ResearchFacility,
  type ResearchHistory,
  type ResearchMlForecast,
  type ResearchProduct,
  type ResearchSummary,
  type ResearchHealth,
} from "../services/researchService";
import { ResearchBarChart, ResearchDemandForecastChart, ResearchForecastChart, ResearchHistoryChart, ResearchScenarioChart } from "../components/charts/ResearchCharts";
import { buildHistoricalProductBars, buildQuarterBars, buildResearchDemandForecastSeries, buildResearchForecastSeries, buildResearchHistorySeries, buildResearchScenarioSeries } from "../lib/researchCharts";

export type ResearchExperienceKind =
  | "overview"
  | "inventory"
  | "forecasts"
  | "recommendations"
  | "simulator"
  | "analytics"
  | "reports";

const TITLES: Record<ResearchExperienceKind, string> = {
  overview: "Overview",
  inventory: "Historical inventory",
  forecasts: "Research forecasts",
  recommendations: "Historical recommendations",
  simulator: "What-if scenario explorer",
  analytics: "Historical analytics",
  reports: "Research reports",
};

function number(value: number | undefined): string {
  return value == null ? "—" : value.toLocaleString();
}

function percent(value: number | undefined): string {
  return value == null ? "—" : `${value.toFixed(2)}%`;
}

function ErrorState({ message, retry }: { message: string; retry: () => void }) {
  return (
    <SectionCard title="Research API unavailable">
      <Alert tone="error">{message}</Alert>
      <Button onClick={retry}>Retry connection</Button>
    </SectionCard>
  );
}

function HistoricalNotice() {
  return (
    <Alert tone="info">
      <strong>Historical research data.</strong> These Sierra Leone records are
      not live Indian inventory and do not represent current availability,
      suppliers, purchase orders, or delivery commitments.
    </Alert>
  );
}

function SummaryCards({ summary }: { summary: ResearchSummary }) {
  return (
    <div className="grid grid--metrics">
      <MetricCard label="Historical records" value={number(summary.rows)} context="Source observations" />
      <MetricCard label="Facilities" value={number(summary.facilities)} context="Unique facility identifiers" />
      <MetricCard label="Products" value={number(summary.products)} context="Unique product identifiers" />
      <MetricCard label="Recorded stockout rate" value={percent(summary.stockout_rate_percent)} context={`${number(summary.stockout_rows)} source labels`} tone="critical" />
    </div>
  );
}

function BacktestCard({ backtest }: { backtest: ResearchBacktest }) {
  return (
    <SectionCard title="Held-out evaluation" description={`${backtest.test_from} through ${backtest.test_to}; ${backtest.methodology}`}>
      <div className="grid grid--metrics">
        <MetricCard label="Evaluations" value={number(backtest.evaluations)} context={`${number(backtest.eligible_facility_product_series)} facility-product series`} />
        <MetricCard label="Stock-rule F1" value={percent(backtest.stock_based_rule.f1_percent)} context={`Precision ${percent(backtest.stock_based_rule.precision_percent)} · Recall ${percent(backtest.stock_based_rule.recall_percent)}`} />
        <MetricCard label="Persistence F1" value={percent(backtest.previous_month_persistence_baseline.f1_percent)} context={`Precision ${percent(backtest.previous_month_persistence_baseline.precision_percent)} · Recall ${percent(backtest.previous_month_persistence_baseline.recall_percent)}`} />
        <MetricCard label="Target" value="stockout = 1" context={`${number(backtest.actual_stockouts)} positive labels`} />
      </div>
    </SectionCard>
  );
}

function ResearchCoverageCharts({ summary, products }: { summary: ResearchSummary; products: ResearchProduct[] }) {
  const quarters = buildQuarterBars(summary.quarters);
  const productBars = buildHistoricalProductBars(products);
  return (
    <div className="grid grid--two" style={{ marginTop: 16 }}>
      <SectionCard title="Records by quarter" description="Historical source observations returned by the summary endpoint.">
        {quarters.length === 0 ? <EmptyState compact title="No quarter data returned" /> : <ResearchBarChart data={quarters} label="Historical records by quarter" valueLabel="Records" layout="vertical" />}
      </SectionCard>
      <SectionCard title="Observed stockout rate by product" description="Source stockout labels, not a forecast or current risk ranking.">
        {productBars.length === 0 ? <EmptyState compact title="No product rates returned" /> : <ResearchBarChart data={productBars} label="Observed stockout rate by product" valueLabel="Stockout rate (%)" color="#C83D43" />}
      </SectionCard>
    </div>
  );
}

function InventoryView() {
  const [facilities, setFacilities] = useState<ResearchFacility[]>([]);
  const [products, setProducts] = useState<ResearchProduct[]>([]);
  const [query, setQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const limit = 25;

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [facilityResult, productResult] = await Promise.all([
        getResearchFacilities(limit, offset),
        getResearchProducts(100),
      ]);
      setFacilities(facilityResult.items);
      setProducts(productResult.items);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load historical records.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, [offset]);
  const filteredFacilities = useMemo(
    () => facilities.filter((item) => `${item.hf_pk} ${item.district} ${item.facility_type}`.toLowerCase().includes(query.toLowerCase())),
    [facilities, query],
  );
  if (loading) return <SectionCard title="Loading historical records"><LoadingState label="Loading facilities and products" /></SectionCard>;
  if (error) return <ErrorState message={error} retry={() => void load()} />;
  return (
    <>
      <HistoricalNotice />
      <SectionCard title="Facilities" description="Paginated facilities from the source dataset." actions={<input className="input" aria-label="Search facilities" placeholder="Search facility or district" value={query} onChange={(event) => setQuery(event.target.value)} />}>
        {filteredFacilities.length === 0 ? <EmptyState title="No facilities match" description="Try a different search term." /> : <div className="table-wrap"><table className="table table--compact"><thead><tr><th>Facility</th><th>Type</th><th>District</th><th className="num">Records</th><th className="num">Products</th><th>Last observed</th></tr></thead><tbody>{filteredFacilities.map((item) => <tr key={item.hf_pk}><td>{item.hf_pk}</td><td>{item.facility_type}</td><td>{item.district}</td><td className="num">{number(item.observations)}</td><td className="num">{number(item.product_count)}</td><td>{item.last_observed}</td></tr>)}</tbody></table></div>}
        <div className="row row--wrap" style={{ marginTop: 12 }}><Button size="sm" onClick={() => setOffset(Math.max(0, offset - limit))} disabled={offset === 0}>Previous</Button><span className="text-muted">Showing {offset + 1}–{offset + facilities.length}</span><Button size="sm" onClick={() => setOffset(offset + limit)} disabled={facilities.length < limit}>Next</Button></div>
      </SectionCard>
      <SectionCard title="Products" description="Product summaries are historical observations, not current stock." flush>{products.length === 0 ? <EmptyState title="No products returned" description="The research API returned no product records." /> : <div className="table-wrap"><table className="table table--compact"><thead><tr><th>Product</th><th>ID</th><th className="num">Facilities</th><th className="num">Stockout rate</th></tr></thead><tbody>{products.map((item) => <tr key={item.productID}><td>{item.name1}</td><td>{item.productID}</td><td className="num">{number(item.facility_count)}</td><td className="num">{percent(item.stockout_rate_percent)}</td></tr>)}</tbody></table></div>}</SectionCard>
    </>
  );
}

function ForecastView() {
  const [facility, setFacility] = useState("0");
  const [product, setProduct] = useState("43");
  const [result, setResult] = useState<ResearchMlForecast | null>(null);
  const [history, setHistory] = useState<ResearchHistory | null>(null);
  const [forecast, setForecast] = useState<ResearchForecast | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const run = async () => {
    setLoading(true); setError(null);
    try {
      const [modelResult, series, projection] = await Promise.all([
        getResearchMlForecast(facility, product),
        getResearchHistory(facility, product, 12),
        getResearchForecast(facility, product, 3),
      ]);
      setResult(modelResult); setHistory(series); setForecast(projection);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to calculate the model estimate.");
    } finally { setLoading(false); }
  };
  useEffect(() => { void run(); }, []);
  const historySeries = history ? buildResearchHistorySeries(history.items) : [];
  const forecastSeries = history && forecast ? buildResearchForecastSeries(history.items, forecast.projection) : [];
  const demandForecastSeries = history && forecast ? buildResearchDemandForecastSeries(history.items, forecast.projection) : [];
  return (
    <>
      <HistoricalNotice />
      <SectionCard title="Next-month model estimate" description="Enter identifiers from the historical dataset. The model uses six prior consecutive calendar months.">
        <div className="row row--wrap" style={{ alignItems: "end" }}>
          <label className="control-group">Facility ID<input className="input" value={facility} onChange={(event) => setFacility(event.target.value)} /></label>
          <label className="control-group">Product ID<input className="input" value={product} onChange={(event) => setProduct(event.target.value)} /></label>
          <Button onClick={() => void run()} disabled={loading}>{loading ? "Loading…" : "Run model estimate"}</Button>
        </div>
        {error && <Alert tone="error">{error}</Alert>}
        {result && <div className="grid grid--metrics" style={{ marginTop: 16 }}><MetricCard label="Predicted month" value={result.prediction_for_month} context={`Last observed ${result.last_observed_date}`} /><MetricCard label="Model score" value={percent(result.stockout_probability * 100)} context={`Threshold ${percent(result.decision_threshold * 100)}`} tone={result.stockout_risk ? "critical" : "default"} /><MetricCard label="Risk classification" value={result.stockout_risk ? "Higher risk" : "Below threshold"} context={result.model_version} /></div>}
      </SectionCard>
      {history && <SectionCard title={`Recent history: ${history.product_name}`} description="Observed records returned by the API." flush>{history.items.length === 0 ? <EmptyState title="No historical records returned" description="Try another facility and product identifier." /> : <div className="table-wrap"><table className="table table--compact"><thead><tr><th>Date</th><th className="num">Consumption</th><th className="num">Closing balance</th><th>Source stockout</th></tr></thead><tbody>{history.items.map((item) => <tr key={item.date}><td>{item.date}</td><td className="num">{number(item.consumption)}</td><td className="num">{number(item.closeBalance)}</td><td>{item.stockout === 1 ? "Yes" : "No"}</td></tr>)}</tbody></table></div>}</SectionCard>}
      {history && (history.items.length === 0 || historySeries.length === 0) && <SectionCard title="Observed history"><EmptyState title="No chartable historical records returned" description="The API returned no records with valid numeric values for this chart." /></SectionCard>}
      {history && historySeries.length > 0 && <SectionCard title="Observed history" description="Consumption and closing balance from the same historical records."><ResearchHistoryChart data={historySeries} productName={history.product_name} /></SectionCard>}
      {history && forecast && forecastSeries.length === 0 && <SectionCard title="Historical baseline projection"><EmptyState title="No chartable projection returned" description="The API returned no projected points with valid numeric values for this chart." /></SectionCard>}
      {history && forecast && forecastSeries.length > 0 && <SectionCard title="Historical baseline projection" description={`${forecast.method}; future receipts assumed: ${forecast.future_receipts_assumed}.`}><ResearchForecastChart data={forecastSeries} productName={history.product_name} /></SectionCard>}
      {history && forecast && demandForecastSeries.length > 0 && <SectionCard title="Consumption forecast" description={`${forecast.method}; observed history through ${forecast.last_observed_date}, then predicted demand for ${forecast.projection.length} month${forecast.projection.length === 1 ? "" : "s"}.`}><ResearchDemandForecastChart data={demandForecastSeries} productName={history.product_name} /></SectionCard>}
    </>
  );
}

function SimulatorView() {
  const [consumption, setConsumption] = useState(10);
  const [stock, setStock] = useState(100);
  const [change, setChange] = useState(0);
  const projected = Math.max(0, stock - consumption * (1 + change / 100));
  const scenarioSeries = buildResearchScenarioSeries(stock, consumption, consumption * (1 + change / 100));
  return <><HistoricalNotice /><SectionCard title="Transparent scenario explorer" description="This is an arithmetic scenario using only values you supply. It is not a live inventory simulation and does not create an order."><div className="row row--wrap"><label className="control-group">Starting stock<input className="input" type="number" min="0" value={stock} onChange={(event) => setStock(Number(event.target.value))} /></label><label className="control-group">One-period consumption<input className="input" type="number" min="0" value={consumption} onChange={(event) => setConsumption(Number(event.target.value))} /></label><label className="control-group">Demand change %<input className="input" type="number" value={change} onChange={(event) => setChange(Number(event.target.value))} /></label></div><div className="grid grid--metrics" style={{ marginTop: 16 }}><MetricCard label="Adjusted consumption" value={number(consumption * (1 + change / 100))} context="User-supplied scenario input" /><MetricCard label="Projected closing stock" value={number(projected)} context="No receipts assumed" tone={projected === 0 ? "critical" : "default"} /></div><div style={{ marginTop: 16 }}><ResearchScenarioChart data={scenarioSeries} /></div></SectionCard></>;
}

function RecommendationsView() {
  const [products, setProducts] = useState<ResearchProduct[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getResearchProducts(5);
      setProducts(result.items);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load historical insights.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  return (
    <>
      <HistoricalNotice />
      {loading ? <SectionCard title="Loading historical insights"><LoadingState label="Loading product observations" /></SectionCard> : error ? <ErrorState message={error} retry={() => void load()} /> : <SectionCard title="Products with the highest observed stockout rate" description="This ranks historical source labels only; it is not a current reorder or supplier recommendation." flush>{products.length === 0 ? <EmptyState title="No product insights available" description="The research API returned no product records." /> : <div className="table-wrap"><table className="table table--compact"><thead><tr><th>Product</th><th>ID</th><th className="num">Observed stockout rate</th><th className="num">Facilities</th></tr></thead><tbody>{products.map((item) => <tr key={item.productID}><td>{item.name1}</td><td>{item.productID}</td><td className="num">{percent(item.stockout_rate_percent)}</td><td className="num">{number(item.facility_count)}</td></tr>)}</tbody></table></div>}</SectionCard>}
    </>
  );
}

export function ResearchExperiencePage({ kind }: { kind: ResearchExperienceKind }) {
  const [summary, setSummary] = useState<ResearchSummary | null>(null);
  const [backtest, setBacktest] = useState<ResearchBacktest | null>(null);
  const [products, setProducts] = useState<ResearchProduct[]>([]);
  const [health, setHealth] = useState<ResearchHealth | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (kind === "inventory" || kind === "forecasts" || kind === "simulator" || kind === "recommendations") return;
    let cancelled = false;
    Promise.all([getResearchSummary(), getResearchBacktest(), getResearchHealth(), getResearchProducts(10)])
      .then(([nextSummary, nextBacktest, nextHealth, nextProducts]) => { if (!cancelled) { setSummary(nextSummary); setBacktest(nextBacktest); setHealth(nextHealth); setProducts(nextProducts.items); } })
      .catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : "Unable to load research data."); });
    return () => { cancelled = true; };
  }, [kind, attempt]);
  const retry = () => setAttempt((value) => value + 1);
  return (
    <>
      <PageHeader title={TITLES[kind]} subtitle="Evidence from the historical Sierra Leone research dataset; not live inventory." />
      {error ? <ErrorState message={error} retry={retry} /> : kind === "inventory" ? <InventoryView /> : kind === "forecasts" ? <ForecastView /> : kind === "simulator" ? <SimulatorView /> : kind === "recommendations" ? <RecommendationsView /> : !summary || !backtest ? <SectionCard title="Loading research data"><LoadingState label="Loading research data" /></SectionCard> : <>
        <HistoricalNotice />
        {kind === "overview" && <><SummaryCards summary={summary} /><ResearchCoverageCharts summary={summary} products={products} /><SectionCard title="Model readiness" description="Readiness is reported by the backend health endpoint."><Alert tone={health?.ready ? "success" : "warning"}>{health?.ready ? "Dataset and model artifact are available." : "The model is not ready. Run the documented training command."}</Alert></SectionCard><BacktestCard backtest={backtest} /></>}
        {kind === "analytics" && <><BacktestCard backtest={backtest} /><SummaryCards summary={summary} /><ResearchCoverageCharts summary={summary} products={products} /></>}
        {kind === "reports" && <><SummaryCards summary={summary} /><BacktestCard backtest={backtest} /><SectionCard title="Model metadata"><p>Version: <strong>{health?.model_version ?? "Unavailable"}</strong></p><p>Validation-selected decision threshold: <strong>{health?.decision_threshold == null ? "Unavailable" : health.decision_threshold.toFixed(2)}</strong></p><p className="text-muted">The threshold was selected before the held-out January-November 2023 test period.</p></SectionCard><SectionCard title="Report scope"><p className="text-muted">This report is limited to source coverage and held-out evaluation metrics. Supplier, order, cost, and current-availability reports are unavailable for this dataset.</p></SectionCard></>}
      </>}
    </>
  );
}
