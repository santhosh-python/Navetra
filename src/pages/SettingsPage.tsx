import { useState, type KeyboardEvent } from 'react';
import { RotateCcw, X, RefreshCw } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { SectionCard } from '../components/common/SectionCard';
import { Button } from '../components/common/Button';
import { SegmentedControl } from '../components/common/SegmentedControl';
import { Alert } from '../components/common/Alert';
import { FormField, fieldAria } from '../components/common/FormField';
import { NumberSetting } from '../components/settings/NumberSetting';
import { useSettings } from '../hooks/useSettings';
import { useInventory } from '../hooks/useInventory';
import { useNotifications } from '../hooks/useNotifications';
import { DEFAULT_SETTINGS } from '../state/SettingsContext';
import { getApiBaseUrl, isBackendConfigured } from '../services/apiClient';
import { DEMO_AS_OF_DATE, formatLongDate } from '../lib/dates';
import type { DensityPreference } from '../types/settings';

const SECTIONS = [
  { id: 'organisation', label: 'Organisation' },
  { id: 'thresholds', label: 'Risk thresholds' },
  { id: 'policy', label: 'Reorder policy' },
  { id: 'lists', label: 'Locations and categories' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'display', label: 'Display' },
  { id: 'data', label: 'Data source' },
];

/** Editable list of short labels (locations or categories). Empty and duplicate entries are rejected. */
function TagEditor({ id, label, hint, values, onChange }: { id: string; label: string; hint: string; values: string[]; onChange: (values: string[]) => void }) {
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  const add = () => {
    const text = draft.trim();
    if (!text) {
      setError('Type a name first.');
      return;
    }
    if (text.length > 60) {
      setError('Keep names under 60 characters.');
      return;
    }
    if (values.some((existing) => existing.toLowerCase() === text.toLowerCase())) {
      setError('That name is already in the list.');
      return;
    }
    onChange([...values, text]);
    setDraft('');
    setError(null);
  };

  const handleKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      add();
    }
  };

  return (
    <div className="field">
      <span className="field__label" id={`${id}-label`}>
        {label}
      </span>
      <ul className="tag-list" aria-labelledby={`${id}-label`}>
        {values.map((value) => (
          <li key={value}>
            {value}
            <button type="button" aria-label={`Remove ${value}`} onClick={() => onChange(values.filter((existing) => existing !== value))}>
              <X size={12} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      <div className="row">
        <input className="input" value={draft} placeholder="Add a name" onChange={(event) => setDraft(event.target.value)} onKeyDown={handleKey} {...fieldAria(`${id}-input`, hint, error ?? undefined)} />
        <Button size="sm" onClick={add}>
          Add
        </Button>
      </div>
      <span className={error ? 'field__error' : 'field__hint'} id={`${id}-input-${error ? 'error' : 'hint'}`}>
        {error ?? hint}
      </span>
    </div>
  );
}

export function SettingsPage() {
  const { settings, updateSettings, resetSettings, riskThresholds } = useSettings();
  const { resetDemo, dataSourceLabel } = useInventory();
  const { showToast } = useNotifications();
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const handleResetDemo = async () => {
    setResetting(true);
    setResetError(null);
    try {
      await resetDemo();
      showToast('Demo inventory restored to the original synthetic data.');
    } catch (error) {
      setResetError(error instanceof Error ? error.message : 'The demo data could not be restored.');
    } finally {
      setResetting(false);
    }
  };

  return (
    <>
      <PageHeader title="Settings" subtitle="Changes apply across the app immediately and are saved in this browser. Organisation details are not sent to a server." />

      <div className="settings-layout">
        <nav className="settings-nav" aria-label="Settings sections">
          {SECTIONS.map((section) => (
            <a key={section.id} href={`#${section.id}`}>
              {section.label}
            </a>
          ))}
        </nav>

        <div>
          <div id="organisation" className="settings-section">
            <SectionCard title="Organisation" description="Shown in the header and on reports. Stored in this browser only; server storage is planned.">
              <div className="form-grid">
                <FormField id="org-name" label="Organisation name">
                  <input id="org-name" className="input" value={settings.organizationName} maxLength={100} onChange={(event) => updateSettings({ organizationName: event.target.value })} />
                </FormField>
                <FormField id="org-email" label="Contact email" hint="Used for display only. Navetra does not send email.">
                  <input id="org-email" type="email" className="input" value={settings.organizationContactEmail} onChange={(event) => updateSettings({ organizationContactEmail: event.target.value })} />
                </FormField>
              </div>
            </SectionCard>
          </div>

          <div id="thresholds" className="settings-section">
            <SectionCard title="Risk thresholds" description="These drive every risk label, count, notification and priority score.">
              <div className="form-grid">
                <NumberSetting
                  id="critical-days"
                  label="Critical: days of stock at or below"
                  value={settings.criticalDaysThreshold}
                  min={1}
                  max={60}
                  hint="Stock lasting this long or less is Critical. Items also become Critical when they run out before delivery."
                  validate={(value) =>
                    value < settings.warningDaysThreshold ? undefined : `Must be less than the warning threshold (${settings.warningDaysThreshold} days).`
                  }
                  onCommit={(value) => updateSettings({ criticalDaysThreshold: value })}
                />
                <NumberSetting
                  id="warning-days"
                  label="Warning: days of stock at or below"
                  value={settings.warningDaysThreshold}
                  min={2}
                  max={120}
                  hint="Stock lasting this long or less (and not Critical) is Warning. Items below minimum stock are also Warning."
                  validate={(value) =>
                    value > settings.criticalDaysThreshold ? undefined : `Must be more than the critical threshold (${settings.criticalDaysThreshold} days).`
                  }
                  onCommit={(value) => updateSettings({ warningDaysThreshold: value })}
                />
              </div>
              <p className="form-note" style={{ marginTop: 16 }}>
                Current rule: Critical at {riskThresholds.criticalDays} days or fewer, Warning at {riskThresholds.warningDays} days or fewer. A value that would put Critical at or above Warning is not saved.
              </p>
            </SectionCard>
          </div>

          <div id="policy" className="settings-section">
            <SectionCard title="Reorder policy and forecasting" description="Used for suggested order quantities, forecast horizon and simulator defaults.">
              <div className="form-grid">
                <NumberSetting id="target-cover" label="Target cover after lead time (days)" value={settings.targetCoverDays} min={7} max={120} hint="Days of use the policy aims to hold after lead time." onCommit={(value) => updateSettings({ targetCoverDays: value })} />
                <NumberSetting id="default-safety" label="Default safety stock (days of use)" value={settings.defaultSafetyStockDays} min={0} max={30} hint="Pre-fills new items. Stored for reference; each item keeps its own safety stock." onCommit={(value) => updateSettings({ defaultSafetyStockDays: value })} />
                <NumberSetting id="default-lead" label="Default supplier lead time (days)" value={settings.defaultLeadTimeDays} min={1} max={90} hint="Pre-fills the lead-time field for new items." onCommit={(value) => updateSettings({ defaultLeadTimeDays: value })} />
                <FormField id="horizon" label="Forecast horizon" hint="How far ahead projections and the timeline look.">
                  <select id="horizon" className="select" value={settings.forecastHorizonDays} onChange={(event) => updateSettings({ forecastHorizonDays: Number(event.target.value) })}>
                    <option value={14}>14 days</option>
                    <option value={30}>30 days</option>
                    <option value={60}>60 days</option>
                  </select>
                </FormField>
              </div>
            </SectionCard>
          </div>

          <div id="lists" className="settings-section">
            <SectionCard title="Locations and categories" description="These appear as choices in the item form and filters. Items already using a removed name keep it.">
              <div className="form-grid">
                <TagEditor id="locations" label="Locations" hint="For example: Central Store, Ward A Dispensary." values={settings.locations} onChange={(locations) => updateSettings({ locations })} />
                <TagEditor id="categories" label="Categories" hint="For example: Essential medicines." values={settings.categories} onChange={(categories) => updateSettings({ categories })} />
              </div>
            </SectionCard>
          </div>

          <div id="notifications" className="settings-section">
            <SectionCard title="Notifications" description="Choose which notices appear in the header bell. They are generated from current figures.">
              <div className="stack-3">
                <label className="check">
                  <input type="checkbox" checked={settings.notifyCriticalShortages} onChange={(event) => updateSettings({ notifyCriticalShortages: event.target.checked })} />
                  Critical shortages
                </label>
                <label className="check">
                  <input type="checkbox" checked={settings.notifyWarnings} onChange={(event) => updateSettings({ notifyWarnings: event.target.checked })} />
                  Warning-level items
                </label>
                <label className="check">
                  <input type="checkbox" checked={settings.notifyMissingCounts} onChange={(event) => updateSettings({ notifyMissingCounts: event.target.checked })} />
                  Stock counts older than 30 days
                </label>
              </div>
            </SectionCard>
          </div>

          <div id="display" className="settings-section">
            <SectionCard title="Display" description="Appearance preferences saved in this browser.">
              <div className="stack-4">
                <div className="field">
                  <span className="field__label" id="density-label">
                    Density
                  </span>
                  <SegmentedControl<DensityPreference>
                    label="Table density"
                    options={[
                      { value: 'comfortable', label: 'Comfortable' },
                      { value: 'compact', label: 'Compact' },
                    ]}
                    value={settings.density}
                    onChange={(density) => updateSettings({ density })}
                  />
                  <span className="field__hint">Compact reduces padding in tables.</span>
                </div>
                <label className="check">
                  <input type="checkbox" checked={settings.showDemoBanner} onChange={(event) => updateSettings({ showDemoBanner: event.target.checked })} />
                  Show the demo data notice on every page
                </label>
              </div>
            </SectionCard>
          </div>

          <div id="data" className="settings-section">
            <SectionCard title="Data source" description="Where the inventory numbers come from.">
              <dl className="key-value-list">
                <dt>Current source</dt>
                <dd>{dataSourceLabel}</dd>
                <dt>As-of date</dt>
                <dd>{formatLongDate(DEMO_AS_OF_DATE)}</dd>
                <dt>Backend connection</dt>
                <dd>{isBackendConfigured() ? `Configured: ${getApiBaseUrl()} (endpoints not implemented yet)` : 'Not configured (demo data)'}</dd>
              </dl>
              <div className="row row--wrap" style={{ marginTop: 16 }}>
                <Button icon={<RefreshCw size={14} aria-hidden="true" />} onClick={handleResetDemo} disabled={resetting}>
                  {resetting ? 'Restoring…' : 'Restore demo inventory'}
                </Button>
                <Button variant="ghost" icon={<RotateCcw size={14} aria-hidden="true" />} onClick={() => { resetSettings(); showToast('Settings reset to defaults.', 'info'); }}>
                  Reset settings to defaults
                </Button>
              </div>
              {resetError && (
                <div style={{ marginTop: 12 }}>
                  <Alert tone="error">{resetError}</Alert>
                </div>
              )}
              <p className="card__footer">
                Defaults: {DEFAULT_SETTINGS.criticalDaysThreshold} and {DEFAULT_SETTINGS.warningDaysThreshold} days thresholds. Restoring the demo inventory discards items added or edited in this session.
              </p>
            </SectionCard>
          </div>
        </div>
      </div>
    </>
  );
}
