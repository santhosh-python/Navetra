import { useEffect, useState, type FormEvent } from "react";
import { Button } from "../components/common/Button";
import { Building2, Database, PackageOpen, RotateCcw, Save, Settings2, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { Link } from "react-router-dom";
import { StatusBadge } from "../components/common/StatusBadge";
import { PageHeader } from "../components/layout/PageHeader";
import { DEFAULT_SETTINGS } from "../data/defaultSettings";
import { useAppState } from "../hooks/useAppState";
import { useToast } from "../hooks/useToast";
import { formatDate } from "../lib/formatters";
import type { AppSettings } from "../types/app";

interface SettingsDraft {
  criticalBufferDays: string;
  warningBufferDays: string;
  safeBufferDays: string;
  forecastHorizonDays: string;
  defaultSafetyStockDays: string;
  notificationsEnabled: boolean;
  compactTable: boolean;
}

function createDraft(settings: AppSettings): SettingsDraft {
  return {
    criticalBufferDays: String(settings.riskThresholds.criticalBufferDays),
    warningBufferDays: String(settings.riskThresholds.warningBufferDays),
    safeBufferDays: String(settings.riskThresholds.safeBufferDays),
    forecastHorizonDays: String(settings.forecastHorizonDays),
    defaultSafetyStockDays: String(settings.defaultSafetyStockDays),
    notificationsEnabled: settings.notificationsEnabled,
    compactTable: settings.compactTable,
  };
}

function parseNonNegative(value: string, label: string): number {
  const parsed = Number(value);
  if (value.trim() === "" || !Number.isFinite(parsed) || parsed < 0 || parsed > 365) {
    throw new Error(`${label} must be a number from 0 to 365.`);
  }
  return parsed;
}

export function SettingsPage() {
  const {
    items,
    dataset,
    settings,
    updateSettings,
    organizations,
    selectedOrganization,
    setSelectedOrganizationId,
    lastRefreshedAt,
    refresh,
  } = useAppState();
  const showToast = useToast();
  const [draft, setDraft] = useState(() => createDraft(settings));
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    setDraft(createDraft(settings));
  }, [settings]);

  const updateDraft = <K extends keyof SettingsDraft>(key: K, value: SettingsDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setValidationError("");
  };

  const saveSettings = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const criticalBufferDays = parseNonNegative(draft.criticalBufferDays, "Critical buffer");
      const warningBufferDays = parseNonNegative(draft.warningBufferDays, "Warning buffer");
      const safeBufferDays = parseNonNegative(draft.safeBufferDays, "Safe buffer");
      if (warningBufferDays < criticalBufferDays || safeBufferDays < warningBufferDays) {
        throw new Error("Risk buffers must be ordered: critical ≤ warning ≤ safe.");
      }
      const forecastHorizonDays = Number(draft.forecastHorizonDays);
      if (![7, 14, 30, 60].includes(forecastHorizonDays)) {
        throw new Error("Choose one of the available forecast horizons.");
      }
      const defaultSafetyStockDays = parseNonNegative(draft.defaultSafetyStockDays, "Default safety stock");
      updateSettings({
        riskThresholds: { criticalBufferDays, warningBufferDays, safeBufferDays },
        forecastHorizonDays,
        defaultSafetyStockDays,
        notificationsEnabled: draft.notificationsEnabled,
        compactTable: draft.compactTable,
      });
      showToast({ tone: "success", title: "Settings applied", description: "These demo settings now affect risk summaries and forecasts in this session." });
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : "Check the values and try again.");
    }
  };

  const resetSettings = () => {
    setDraft(createDraft(DEFAULT_SETTINGS));
    setValidationError("");
    updateSettings(DEFAULT_SETTINGS);
    showToast({ tone: "info", title: "Settings reset", description: "Default demo thresholds and preferences were restored." });
  };

  const changeOrganization = (id: string) => {
    setSelectedOrganizationId(id);
    const organization = organizations.find((entry) => entry.id === id);
    if (organization) showToast({ tone: "info", title: `Organization: ${organization.name}`, description: "Inventory and dashboard summaries now use this demo scope." });
  };

  const dataSource = dataset?.source ?? "loading";
  const sourceLabel = dataSource === "demo" ? "Synthetic demo data" : dataSource === "imported" ? "Imported CSV" : dataSource === "edited" ? "Locally edited" : dataSource === "api" ? "Connected API" : "Loading";
  const categories = Array.from(new Set(items.map((item) => item.category))).sort();
  const locations = Array.from(new Set(items.map((item) => item.location))).sort();
  const leadTimes = items.map((item) => item.leadTimeDays);
  const leadTimeRange = leadTimes.length
    ? `${Math.min(...leadTimes)}–${Math.max(...leadTimes)} days`
    : "No item lead times";

  return (
    <div className="page-content">
      <PageHeader eyebrow="PREFERENCES & CONFIGURATION" title="Settings" description="Adjust the demo organization, risk buffers, and how the interface presents sample data." actions={<StatusBadge tone="demo">Session-only settings</StatusBadge>} />
      <div className="settings-layout">
        <nav className="settings-nav" aria-label="Settings sections">
          <a href="#organization"><Building2 size={15} /> Organization</a>
          <a href="#inventory-defaults"><PackageOpen size={15} /> Inventory defaults</a>
          <a href="#risk-model"><ShieldCheck size={15} /> Risk model</a>
          <a href="#preferences"><SlidersHorizontal size={15} /> Preferences</a>
          <a href="#data-services"><Database size={15} /> Data & services</a>
        </nav>
        <form className="settings-panels" onSubmit={saveSettings}>
          <section className="settings-group" id="organization">
            <h2>Organization scope</h2>
            <p>Organization switching filters the shared demo inventory by location. No account or tenant service is connected.</p>
            <div className="settings-row">
              <div className="settings-row__copy"><strong>Current organization</strong><span>{selectedOrganization.description} · {items.length} item records in scope</span></div>
              <div className="settings-row__control"><select value={selectedOrganization.id} onChange={(event) => changeOrganization(event.target.value)} aria-label="Select demo organization">{organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}</select></div>
            </div>
            <div className="settings-row">
              <div className="settings-row__copy"><strong>Current risk policy</strong><span>Rule-based stock-cover comparison with editable coverage buffers.</span></div>
              <StatusBadge tone="neutral">No weighted score</StatusBadge>
            </div>
          </section>

          <section className="settings-group" id="inventory-defaults">
            <h2>Locations, categories & item defaults</h2>
            <p>These values are derived from the selected organization’s inventory records. They are not separate master-data settings in this frontend demo.</p>
            <div className="settings-row">
              <div className="settings-row__copy"><strong>Inventory locations</strong><span>{locations.length ? locations.join(" · ") : "No locations in scope"}</span></div>
              <StatusBadge tone="neutral">{locations.length} in scope</StatusBadge>
            </div>
            <div className="settings-row">
              <div className="settings-row__copy"><strong>Supply categories</strong><span>{categories.length ? categories.join(" · ") : "No categories in scope"}</span></div>
              <StatusBadge tone="neutral">{categories.length} in scope</StatusBadge>
            </div>
            <div className="settings-row">
              <div className="settings-row__copy"><strong>Criticality labels</strong><span>Low, Medium, High, and Critical are assigned per inventory item; they are not a scoring policy.</span></div>
              <StatusBadge tone="neutral">Per item</StatusBadge>
            </div>
            <div className="settings-row">
              <div className="settings-row__copy"><strong>Minimum stock levels</strong><span>Configured on each item record · {items.length} records currently in scope.</span></div>
              <StatusBadge tone="neutral">Per item</StatusBadge>
            </div>
            <div className="settings-row">
              <div className="settings-row__copy"><strong>Supplier lead times</strong><span>Configured on each item record; these values feed the rule-based risk and delivery estimates.</span></div>
              <StatusBadge tone="neutral">{leadTimeRange}</StatusBadge>
            </div>
            <Link className="button button--secondary settings-inventory-link" to="/inventory"><PackageOpen size={14} /> Review inventory records</Link>
          </section>

          <section className="settings-group" id="risk-model">
            <h2>Risk & forecast assumptions</h2>
            <p>These thresholds are transparent demo rules, not a validated clinical or operational policy. Changes are applied across charts, inventory, forecasts, and recommendations.</p>
            <div className="settings-row">
              <div className="settings-row__copy"><strong>Critical buffer</strong><span>Critical when stock cover is at or below supplier lead time plus this buffer.</span></div>
              <label className="settings-row__control"><span className="visually-hidden">Critical buffer in days</span><input type="number" min="0" max="365" step="1" value={draft.criticalBufferDays} onChange={(event) => updateDraft("criticalBufferDays", event.target.value)} /></label>
            </div>
            <div className="settings-row">
              <div className="settings-row__copy"><strong>Warning buffer</strong><span>Elevated warning band after the critical threshold; must be at least the critical buffer.</span></div>
              <label className="settings-row__control"><span className="visually-hidden">Warning buffer in days</span><input type="number" min="0" max="365" step="1" value={draft.warningBufferDays} onChange={(event) => updateDraft("warningBufferDays", event.target.value)} /></label>
            </div>
            <div className="settings-row">
              <div className="settings-row__copy"><strong>Safe buffer</strong><span>Coverage beyond this threshold is classified as safe; must be at least the warning buffer.</span></div>
              <label className="settings-row__control"><span className="visually-hidden">Safe buffer in days</span><input type="number" min="0" max="365" step="1" value={draft.safeBufferDays} onChange={(event) => updateDraft("safeBufferDays", event.target.value)} /></label>
            </div>
            <div className="settings-row">
              <div className="settings-row__copy"><strong>Default forecast horizon</strong><span>Initial horizon used by overview and scenario projections.</span></div>
              <label className="settings-row__control"><span className="visually-hidden">Default forecast horizon</span><select value={draft.forecastHorizonDays} onChange={(event) => updateDraft("forecastHorizonDays", event.target.value)}><option value="7">7 days</option><option value="14">14 days</option><option value="30">30 days</option><option value="60">60 days</option></select></label>
            </div>
            <div className="settings-row">
              <div className="settings-row__copy"><strong>Default safety stock</strong><span>Number of days of usage used to seed safety-stock values when adding items.</span></div>
              <label className="settings-row__control"><span className="visually-hidden">Default safety stock days</span><input type="number" min="0" max="365" step="1" value={draft.defaultSafetyStockDays} onChange={(event) => updateDraft("defaultSafetyStockDays", event.target.value)} /></label>
            </div>
            {validationError ? <p className="settings-validation-error" role="alert">{validationError}</p> : null}
          </section>

          <section className="settings-group" id="preferences">
            <h2>Display & notifications</h2>
            <p>Local browser preferences for this demo session.</p>
            <div className="settings-row">
              <div className="settings-row__copy"><strong>Demo-derived notifications</strong><span>Show local alerts for records in the high-risk or critical band. No email or push service is connected.</span></div>
              <label className="toggle-control"><input type="checkbox" checked={draft.notificationsEnabled} onChange={(event) => updateDraft("notificationsEnabled", event.target.checked)} aria-label="Enable demo-derived notifications" /><span /></label>
            </div>
            <div className="settings-row">
              <div className="settings-row__copy"><strong>Compact inventory table</strong><span>Reduce row spacing in the inventory list for denser review.</span></div>
              <label className="toggle-control"><input type="checkbox" checked={draft.compactTable} onChange={(event) => updateDraft("compactTable", event.target.checked)} aria-label="Use compact inventory table" /><span /></label>
            </div>
          </section>

          <section className="settings-group" id="data-services">
            <h2>Data & services</h2>
            <p>See what currently powers this interface and whether a backend is configured.</p>
            <div className="settings-row">
              <div className="settings-row__copy"><strong>Active dataset</strong><span>{items.length} inventory items · {sourceLabel}{lastRefreshedAt ? ` · refreshed ${formatDate(lastRefreshedAt)}` : ""}</span></div>
              <StatusBadge tone={dataSource === "api" ? "safe" : "demo"}>{sourceLabel}</StatusBadge>
            </div>
            <div className="settings-row">
              <div className="settings-row__copy"><strong>Python API</strong><span>API calls are not implemented in this frontend. Configure VITE_API_BASE_URL when wiring the real service; no request is sent from this demo.</span></div>
              <StatusBadge tone="warning">Not connected</StatusBadge>
            </div>
            <div className="settings-row">
              <div className="settings-row__copy"><strong>Refresh demo snapshot</strong><span>Updates the local “last refreshed” timestamp; it does not fetch server data or replace your current edits/import.</span></div>
              <button className="button button--secondary" type="button" onClick={() => void refresh()}><RotateCcw size={14} /> Refresh status</button>
            </div>
          </section>

          <div className="settings-form-actions"><Button type="button" variant="secondary" onClick={resetSettings}><RotateCcw size={14} /> Restore defaults</Button><Button type="submit" variant="primary"><Save size={14} /> Apply settings</Button></div>
        </form>
      </div>
      <p className="page-footnote"><Settings2 size={14} /> Preferences and risk thresholds are held in browser memory only and reset when the page is reloaded.</p>
    </div>
  );
}
