import { useMemo, useState } from 'react';
import { Save, Trash2, Play } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { SectionCard } from '../components/common/SectionCard';
import { Button } from '../components/common/Button';
import { Alert } from '../components/common/Alert';
import { EmptyState, LoadingState } from '../components/common/EmptyState';
import { FormField } from '../components/common/FormField';
import { ScenarioControls } from '../components/simulator/ScenarioControls';
import { ScenarioResults } from '../components/simulator/ScenarioResults';
import { useInventory } from '../hooks/useInventory';
import { useSettings } from '../hooks/useSettings';
import { useNotifications } from '../hooks/useNotifications';
import { useSavedScenarios } from '../hooks/useSavedScenarios';
import { createDefaultScenario, SCENARIO_PRESETS, simulateScenario } from '../lib/scenarios';
import { sortInventoryRows } from '../lib/inventoryQuery';
import type { ScenarioSettings } from '../types/simulator';

export function SimulatorPage() {
  const { rows, getItemById, asOfDate, status, errorMessage } = useInventory();
  const { settings, riskThresholds } = useSettings();
  const { savedScenarios, saveScenario, deleteScenario } = useSavedScenarios();
  const { showToast } = useNotifications();
  const urgentRows = useMemo(() => sortInventoryRows(rows, 'urgency', 'asc'), [rows]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Record<string, ScenarioSettings>>({});
  const [scenarioName, setScenarioName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);

  const activeId = selectedId ?? urgentRows[0]?.item.id ?? null;
  const item = activeId ? getItemById(activeId) : undefined;

  if (status === 'loading') {
    return (
      <>
        <PageHeader title="What-if simulator" />
        <SectionCard>
          <LoadingState label="Loading items" />
        </SectionCard>
      </>
    );
  }
  if (status === 'error') {
    return (
      <>
        <PageHeader title="What-if simulator" />
        <Alert tone="error">{errorMessage ?? 'Items could not be loaded.'}</Alert>
      </>
    );
  }
  if (!item || !activeId) {
    return (
      <>
        <PageHeader title="What-if simulator" />
        <SectionCard>
          <EmptyState title="No items to simulate" description="Add an item in Inventory first." />
        </SectionCard>
      </>
    );
  }

  const current: ScenarioSettings = overrides[activeId] ?? createDefaultScenario(item);
  const comparison = simulateScenario(item, current, asOfDate, riskThresholds, settings.forecastHorizonDays, settings.targetCoverDays);

  const update = (patch: Partial<ScenarioSettings>) => {
    setOverrides((existing) => ({ ...existing, [activeId]: { ...current, ...patch } }));
  };

  const applyPreset = (presetId: string) => {
    const preset = SCENARIO_PRESETS.find((candidate) => candidate.id === presetId);
    if (!preset) return;
    setOverrides((existing) => ({ ...existing, [activeId]: preset.apply(item, current) }));
    showToast(`Applied “${preset.label}” to the simulation. Nothing in Inventory changed.`, 'info');
  };

  const reset = () => {
    setOverrides((existing) => {
      const next = { ...existing };
      delete next[activeId];
      return next;
    });
  };

  const save = () => {
    const name = scenarioName.trim() || `${item.name}: scenario ${savedScenarios.length + 1}`;
    if (name.length > 80) {
      setNameError('Keep the name under 80 characters.');
      return;
    }
    setNameError(null);
    saveScenario(name, current);
    setScenarioName('');
    showToast(`Saved “${name}” for this session.`);
  };

  const load = (scenarioId: string) => {
    const scenario = savedScenarios.find((candidate) => candidate.id === scenarioId);
    if (!scenario) return;
    setSelectedId(scenario.settings.itemId);
    setOverrides((existing) => ({ ...existing, [scenario.settings.itemId]: { ...scenario.settings } }));
    showToast(`Loaded “${scenario.name}”.`, 'info');
  };

  return (
    <>
      <PageHeader
        title="What-if simulator"
        subtitle="Change the assumptions for one item and compare with the current plan. Results are estimates from demo values, not operational outcomes."
      />

      <div className="page-toolbar" style={{ marginBottom: 20 }}>
        <FormField id="sim-item" label="Item">
          <select id="sim-item" className="select" style={{ width: 300 }} value={activeId} onChange={(event) => setSelectedId(event.target.value)}>
            {urgentRows.map((row) => (
              <option key={row.item.id} value={row.item.id}>
                {row.item.name} ({row.item.sku})
              </option>
            ))}
          </select>
        </FormField>
        <span className="text-small text-muted" style={{ marginLeft: 'auto', paddingBottom: 8 }}>
          {Object.keys(overrides).includes(activeId) ? 'Scenario changed from actual values' : 'Showing actual values'}
        </span>
      </div>

      <div className="scenario-layout">
        <div>
          <ScenarioControls item={item} settings={current} horizonDays={settings.forecastHorizonDays} onChange={update} onApplyPreset={applyPreset} onReset={reset} />

          <div style={{ marginTop: 16 }}>
          <SectionCard title="Save scenario" description="Kept in this browser session only. Saved scenarios are lost when the page is closed.">
            <div className="stack-3">
              <FormField id="scenario-name" label="Name" error={nameError ?? undefined} hint="Optional. A name is created if left blank.">
                <input id="scenario-name" className="input" value={scenarioName} onChange={(event) => setScenarioName(event.target.value)} placeholder={`${item.name}: scenario`} maxLength={120} />
              </FormField>
              <Button variant="primary" icon={<Save size={14} aria-hidden="true" />} onClick={save}>
                Save scenario
              </Button>
            </div>
            {savedScenarios.length > 0 && (
              <ul className="saved-list" style={{ marginTop: 16 }} aria-label="Saved scenarios">
                {savedScenarios.map((scenario) => (
                  <li key={scenario.id}>
                    <span>
                      <strong style={{ fontWeight: 500 }}>{scenario.name}</strong>
                      <span className="text-subtle text-xs" style={{ display: 'block' }}>
                        {getItemById(scenario.settings.itemId)?.name ?? 'Item removed'}
                      </span>
                    </span>
                    <span className="row">
                      <Button size="sm" icon={<Play size={13} aria-hidden="true" />} onClick={() => load(scenario.id)}>
                        Load
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        iconOnly
                        aria-label={`Delete ${scenario.name}`}
                        icon={<Trash2 size={14} aria-hidden="true" />}
                        onClick={() => {
                          deleteScenario(scenario.id);
                          showToast('Scenario deleted.', 'info');
                        }}
                      />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
          </div>
        </div>

        <div>
          <ScenarioResults item={item} comparison={comparison} asOfDate={asOfDate} />
        </div>
      </div>
    </>
  );
}
