import { useEffect, useMemo, useRef, useState } from "react";
import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BookmarkPlus, RotateCcw, Save, Trash2 } from "lucide-react";
import { Button } from "../components/common/Button";
import { EmptyState } from "../components/common/EmptyState";
import { StatusBadge } from "../components/common/StatusBadge";
import { PageHeader } from "../components/layout/PageHeader";
import { useAppState } from "../hooks/useAppState";
import { useToast } from "../hooks/useToast";
import { formatDate, formatNumber } from "../lib/formatters";
import { getRiskLabel } from "../lib/inventoryMetrics";
import { simulateInventoryScenario, type ScenarioControls } from "../lib/simulator";
import type { InventoryItem } from "../types/inventory";

const defaultControls = (item: InventoryItem): ScenarioControls => ({
  demandChangePercent: 0,
  deliveryDelayDays: 0,
  additionalOrderQuantity: 0,
  safetyStock: item.safetyStock,
});

const riskRank = { critical: 0, high: 1, medium: 2, low: 3 } as const;

function RangeControl({
  label,
  value,
  min,
  max,
  step = 1,
  format = (next: number) => String(next),
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  format?: (value: number) => string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="range-field">
      <div className="range-field__top"><label>{label}</label><output>{format(value)}</output></div>
      <input type="range" min={min} max={max} step={step} value={value} aria-label={label} onChange={(event) => onChange(Number(event.target.value))} />
      <div className="range-field__bounds"><span>{format(min)}</span><span>{format(max)}</span></div>
    </div>
  );
}

export function SimulatorPage() {
  const { items, settings, savedScenarios, saveScenario, removeScenario } = useAppState();
  const showToast = useToast();
  const defaultItem = items.find((item) => item.currentStock / Math.max(item.averageDailyUsage, 0.001) <= item.leadTimeDays) ?? items[0];
  const [selectedItemId, setSelectedItemId] = useState(defaultItem?.id ?? "");
  const selectedItem = items.find((item) => item.id === selectedItemId) ?? items[0];
  const controlsInitialized = useRef(false);
  const [controls, setControls] = useState<ScenarioControls>(() => selectedItem ? defaultControls(selectedItem) : { demandChangePercent: 0, deliveryDelayDays: 0, additionalOrderQuantity: 0, safetyStock: 0 });
  const [scenarioName, setScenarioName] = useState("");

  useEffect(() => {
    if (!controlsInitialized.current && selectedItem) {
      setControls(defaultControls(selectedItem));
      controlsInitialized.current = true;
    }
  }, [selectedItem?.id]);

  const updateControl = <K extends keyof ScenarioControls>(key: K, value: ScenarioControls[K]) => {
    setControls((current) => ({ ...current, [key]: value }));
  };

  const projections = useMemo(() => selectedItem
    ? simulateInventoryScenario(selectedItem, controls, settings.riskThresholds, settings.forecastHorizonDays)
    : null, [selectedItem, controls, settings.riskThresholds, settings.forecastHorizonDays]);
  const baseline = useMemo(() => selectedItem
    ? simulateInventoryScenario(selectedItem, defaultControls(selectedItem), settings.riskThresholds, settings.forecastHorizonDays)
    : null, [selectedItem, settings.riskThresholds, settings.forecastHorizonDays]);

  const choosePreset = (preset: "demand" | "delay" | "order") => {
    if (preset === "demand") setControls((current) => ({ ...current, demandChangePercent: 20 }));
    if (preset === "delay") setControls((current) => ({ ...current, deliveryDelayDays: 3 }));
    if (preset === "order" && selectedItem) {
      setControls((current) => ({ ...current, additionalOrderQuantity: Math.max(20, Math.round(selectedItem.averageDailyUsage * 5)) }));
    }
  };

  const resetScenario = () => {
    if (selectedItem) setControls(defaultControls(selectedItem));
    setScenarioName("");
    showToast({ tone: "info", title: "Scenario reset", description: "Controls are back to the current demo baseline." });
  };

  const saveCurrentScenario = () => {
    if (!selectedItem || !scenarioName.trim()) {
      showToast({ tone: "error", title: "Name your scenario", description: "Enter a short name before saving." });
      return;
    }
    saveScenario({
      name: scenarioName.trim(),
      inventoryItemId: selectedItem.id,
      demandChangePercent: controls.demandChangePercent,
      deliveryDelayDays: controls.deliveryDelayDays,
      additionalOrderQuantity: controls.additionalOrderQuantity,
      safetyStock: controls.safetyStock,
    });
    showToast({ tone: "success", title: "Scenario saved", description: "Saved in frontend state for this session only." });
    setScenarioName("");
  };

  const loadSavedScenario = (scenarioId: string) => {
    const scenario = savedScenarios.find((entry) => entry.id === scenarioId);
    if (!scenario) return;
    if (!items.some((item) => item.id === scenario.inventoryItemId)) {
      showToast({ tone: "error", title: "Item outside current organization", description: "Switch to the organization containing this item before loading its scenario." });
      return;
    }
    setSelectedItemId(scenario.inventoryItemId);
    setControls({
      demandChangePercent: scenario.demandChangePercent,
      deliveryDelayDays: scenario.deliveryDelayDays,
      additionalOrderQuantity: scenario.additionalOrderQuantity,
      safetyStock: scenario.safetyStock,
    });
  };

  if (!selectedItem || !projections || !baseline) {
    return <div className="page-content"><PageHeader title="What-If Simulator" description="Test possible changes before they become shortages." /><EmptyState title="No inventory available" description="Add or import demo inventory to create a scenario." /></div>;
  }

  const riskImproved = riskRank[projections.simulatedRisk] > riskRank[projections.baselineRisk];
  const riskWorsened = riskRank[projections.simulatedRisk] < riskRank[projections.baselineRisk];
  const comparisonText = projections.simulatedGapDays < baseline.baselineGapDays
    ? `The scenario reduces the projected supply gap by ${baseline.baselineGapDays - projections.simulatedGapDays} days.`
    : projections.simulatedGapDays > baseline.baselineGapDays
      ? `The scenario extends the projected supply gap by ${projections.simulatedGapDays - baseline.baselineGapDays} days.`
      : projections.simulatedStockOutDate?.getTime() !== baseline.simulatedStockOutDate?.getTime()
        ? "The projected stock-out timing changes, while the estimated gap length remains the same."
        : "The selected changes do not alter the projected gap under this simple daily-use rule.";

  return (
    <div className="page-content">
      <PageHeader eyebrow="SCENARIO PLANNING" title="What-If Simulator" description="Test possible changes before they become shortages." actions={<StatusBadge tone="demo">Illustrative only · not an operational outcome</StatusBadge>} />

      <div className="simulator-layout">
        <section className="panel simulator-controls-panel">
          <div className="panel__header"><div><h2>Scenario controls</h2><p>Changes update the projection immediately.</p></div></div>
          <div className="panel__body scenario-controls">
            <label className="field"><span>Inventory item</span><select value={selectedItem.id} onChange={(event) => {
              const nextItem = items.find((item) => item.id === event.target.value);
              if (!nextItem) return;
              setSelectedItemId(nextItem.id);
              setControls(defaultControls(nextItem));
            }}>{items.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.sku}</option>)}</select></label>

            <RangeControl label="Daily demand change" value={controls.demandChangePercent} min={-50} max={100} step={5} format={(value) => `${value > 0 ? "+" : ""}${value}%`} onChange={(value) => updateControl("demandChangePercent", value)} />
            <RangeControl label="Additional delivery delay" value={controls.deliveryDelayDays} min={0} max={14} format={(value) => `${value} days`} onChange={(value) => updateControl("deliveryDelayDays", value)} />
            <div className="range-field">
              <div className="range-field__top"><label htmlFor="additional-order">Proposed additional order</label><output>{formatNumber(controls.additionalOrderQuantity)} {selectedItem.unit}</output></div>
              <input id="additional-order" type="number" min="0" max="500" step="1" value={controls.additionalOrderQuantity} onChange={(event) => updateControl("additionalOrderQuantity", Math.max(0, Number(event.target.value) || 0))} />
              <p className="form-hint">Added to the existing inbound quantity on the adjusted delivery date.</p>
            </div>
            <div className="range-field">
              <div className="range-field__top"><label htmlFor="safety-stock-target">Safety-stock target</label><output>{formatNumber(controls.safetyStock)} {selectedItem.unit}</output></div>
              <input id="safety-stock-target" type="number" min="0" max="500" step="1" value={controls.safetyStock} onChange={(event) => updateControl("safetyStock", Math.max(0, Number(event.target.value) || 0))} />
              <p className="form-hint">This changes the reorder estimate; it does not add physical stock.</p>
            </div>

            <div className="scenario-presets"><span className="eyebrow">QUICK SCENARIOS</span><div><button type="button" onClick={() => choosePreset("demand")}>Demand +20%</button><button type="button" onClick={() => choosePreset("delay")}>Delivery +3 days</button><button type="button" onClick={() => choosePreset("order")}>Add proposed quantity</button></div></div>
            <div className="scenario-controls__footer"><Button type="button" variant="secondary" onClick={resetScenario}><RotateCcw size={14} /> Reset scenario</Button></div>
          </div>
        </section>

        <div className="simulator-results">
          <div className="panel">
            <div className="panel__header"><div><h2>Stock path comparison</h2><p>{selectedItem.name} · daily stock after expected consumption and inbound delivery</p></div><StatusBadge tone="demo">{settings.forecastHorizonDays}-day horizon</StatusBadge></div>
            <div className="panel__body panel__body--chart">
              <div className="chart-container chart-container--tall">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={projections.points} margin={{ top: 10, right: 10, bottom: 0, left: -12 }}>
                    <CartesianGrid stroke="var(--color-chart-grid)" vertical={false} />
                    <XAxis dataKey="date" tickFormatter={(value: string) => formatDate(value).replace(/, \d{4}/, "")} tick={{ fill: "#87909a", fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={28} />
                    <YAxis tick={{ fill: "#87909a", fontSize: 10 }} tickLine={false} axisLine={false} width={42} domain={[0, "auto"]} />
                    <Tooltip labelFormatter={(value) => formatDate(String(value))} formatter={(value, name) => [`${formatNumber(Number(value))} ${selectedItem.unit}`, name === "baselineStock" ? "Baseline" : "Scenario"]} contentStyle={{ border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 11 }} />
                    <ReferenceLine y={selectedItem.minimumStock} stroke="var(--color-chart-warning)" strokeDasharray="4 4" label={{ value: "Minimum stock", fill: "var(--color-text-muted)", fontSize: 10, position: "insideTopRight" }} />
                    <Area type="monotone" dataKey="baselineStock" name="baselineStock" stroke="var(--color-chart-3)" fill="var(--color-chart-3)" fillOpacity={0.06} strokeWidth={1.8} strokeDasharray="5 4" />
                    <Line type="monotone" dataKey="simulatedStock" name="simulatedStock" stroke="var(--color-brand)" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="chart-legend"><span className="chart-legend__item"><i className="chart-legend__line chart-legend__line--baseline" />Baseline</span><span className="chart-legend__item"><i className="chart-legend__line" />Scenario</span><span className="chart-legend__item"><i className="chart-legend__line chart-legend__line--threshold" />Minimum stock</span></div>
          </div>

          <div className="scenario-comparison">
            <div className="scenario-comparison__side"><span>Baseline risk</span><div className="scenario-comparison__risk"><StatusBadge tone={projections.baselineRisk}>{getRiskLabel(projections.baselineRisk)}</StatusBadge></div><strong>{formatDate(projections.baselineStockOutDate)}</strong><small>first projected stock-out</small></div>
            <div className="scenario-comparison__side scenario-comparison__side--simulated"><span>Scenario risk</span><div className="scenario-comparison__risk"><StatusBadge tone={projections.simulatedRisk}>{getRiskLabel(projections.simulatedRisk)}</StatusBadge></div><strong>{formatDate(projections.simulatedStockOutDate)}</strong><small>first projected stock-out</small></div>
          </div>

          <div className="scenario-result-grid">
            <div className="scenario-result"><span>Baseline gap</span><strong>{baseline.baselineGapDays} days</strong></div>
            <div className="scenario-result"><span>Scenario gap</span><strong>{projections.simulatedGapDays} days</strong></div>
            <div className="scenario-result"><span>Reorder estimate</span><strong>{formatNumber(projections.simulatedReorderQuantity)} {selectedItem.unit}</strong></div>
          </div>

          <div className={`scenario-explanation${riskImproved ? " scenario-explanation--good" : riskWorsened ? " scenario-explanation--bad" : ""}`}>
            {comparisonText} The model assumes a constant daily consumption rate of {formatNumber(projections.simulatedDailyUsage)} {selectedItem.unit}/day and a delivery date of {formatDate(projections.adjustedDeliveryDate)}. It is a deterministic demo calculation, not a prediction of actual operations.
          </div>

          <section className="panel saved-scenarios-panel">
            <div className="panel__header"><div><h2>Saved scenarios</h2><p>Stored in frontend state for this session only.</p></div><BookmarkPlus size={17} color="var(--color-text-muted)" /></div>
            <div className="panel__body">
              <div className="save-scenario-form"><input value={scenarioName} onChange={(event) => setScenarioName(event.target.value)} placeholder="Name this scenario" aria-label="Scenario name" /><Button type="button" variant="secondary" onClick={saveCurrentScenario}><Save size={14} /> Save scenario</Button></div>
              {savedScenarios.length ? savedScenarios.map((scenario) => {
                const item = items.find((record) => record.id === scenario.inventoryItemId);
                return <div className="saved-scenario-row" key={scenario.id}><button className="saved-scenario-row__copy saved-scenario-row__load" type="button" onClick={() => loadSavedScenario(scenario.id)}><strong>{scenario.name}</strong><span>{item?.name ?? "Unavailable item"} · demand {scenario.demandChangePercent > 0 ? "+" : ""}{scenario.demandChangePercent}% · delay {scenario.deliveryDelayDays}d</span></button><button className="icon-button icon-button--small" type="button" onClick={() => { removeScenario(scenario.id); showToast({ tone: "info", title: "Scenario removed" }); }} aria-label={`Remove ${scenario.name}`}><Trash2 size={14} /></button></div>;
              }) : <p className="saved-scenarios-empty">Saved scenarios will appear here.</p>}
            </div>
          </section>
        </div>
      </div>
      <p className="page-footnote"><span className="demo-data-banner__dot" /> Demand and delivery changes are simulated. Safety-stock changes alter suggested reorder quantity, not the physical stock path. No order is placed.</p>
    </div>
  );
}
