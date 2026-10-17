import { useId } from 'react';
import { RotateCcw } from 'lucide-react';
import type { InventoryItem } from '../../types/inventory';
import type { ScenarioSettings as Settings } from '../../types/simulator';
import { SCENARIO_LIMITS, SCENARIO_PRESETS } from '../../lib/scenarios';
import { formatSignedPercent } from '../../lib/formatters';
import { Button } from '../common/Button';
import { InfoTooltip } from '../common/InfoTooltip';

interface ScenarioControlsProps {
  item: InventoryItem;
  settings: Settings;
  horizonDays: number;
  onChange: (patch: Partial<Settings>) => void;
  onApplyPreset: (presetId: string) => void;
  onReset: () => void;
}

type NumericKey = Exclude<keyof Settings, 'itemId'>;

interface SliderRowProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  display: string;
  tooltip?: string;
  onChange: (value: number) => void;
  unitLabel?: string;
}

/** A slider with a matching number box, so people can drag or type. */
function SliderRow({ id, label, value, min, max, step = 1, display, tooltip, onChange, unitLabel }: SliderRowProps) {
  return (
    <div className="control-group">
      <div className="control-group__label">
        <label htmlFor={id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {label}
          {tooltip && <InfoTooltip text={tooltip} label={`About ${label}`} />}
        </label>
        <span className="control-group__value">{display}</span>
      </div>
      <div className="range-field">
        <input id={id} type="range" className="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
        <input
          type="number"
          className="input range-field__input"
          aria-label={`${label} value${unitLabel ? ` (${unitLabel})` : ''}`}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => {
            const parsed = Number(event.target.value);
            if (!Number.isNaN(parsed)) onChange(Math.min(max, Math.max(min, parsed)));
          }}
        />
      </div>
    </div>
  );
}

/** Scenario inputs. Changing them only changes the simulation, never the stored inventory. */
export function ScenarioControls({ item, settings, horizonDays, onChange, onApplyPreset, onReset }: ScenarioControlsProps) {
  const groupId = useId();
  const numberField = (key: NumericKey, label: string, min: number, max: number, unitLabel: string, tooltip?: string, step = 1) => (
    <div className="control-group" key={key}>
      <label className="control-group__label" htmlFor={`${groupId}-${key}`} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {label}
        {tooltip && <InfoTooltip text={tooltip} label={`About ${label}`} />}
      </label>
      <div className="row">
        <input
          id={`${groupId}-${key}`}
          type="number"
          className="input"
          min={min}
          max={max}
          step={step}
          value={settings[key] as number}
          onChange={(event) => {
            const parsed = Number(event.target.value);
            if (!Number.isNaN(parsed)) onChange({ [key]: Math.max(min, parsed) } as Partial<Settings>);
          }}
        />
        <span className="text-small text-muted" style={{ whiteSpace: 'nowrap' }}>
          {unitLabel}
        </span>
      </div>
    </div>
  );

  return (
    <div className="scenario-controls">
      <div className="card" style={{ padding: 16 }}>
        <div className="control-group__label" style={{ marginBottom: 8 }}>
          <span>Quick scenarios</span>
        </div>
        <div className="preset-list" role="group" aria-label="Preset scenarios">
          {SCENARIO_PRESETS.map((preset) => (
            <button key={preset.id} type="button" className="preset-button" onClick={() => onApplyPreset(preset.id)}>
              <span className="preset-button__label">{preset.label}</span>
              <span className="preset-button__description">{preset.description}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 16 }}>
        <div className="stack-4">
          <SliderRow
            id={`${groupId}-demand`}
            label="Change in daily demand"
            value={settings.demandChangePercent}
            min={SCENARIO_LIMITS.demandChangePercent.min}
            max={SCENARIO_LIMITS.demandChangePercent.max}
            display={formatSignedPercent(settings.demandChangePercent)}
            tooltip="Raises or lowers daily use for the whole horizon, as a percentage of the recorded average."
            onChange={(value) => onChange({ demandChangePercent: value })}
            unitLabel="percent"
          />
          <SliderRow
            id={`${groupId}-reduction`}
            label="Rationing (demand reduction)"
            value={settings.demandReductionPercent}
            min={SCENARIO_LIMITS.demandReductionPercent.min}
            max={SCENARIO_LIMITS.demandReductionPercent.max}
            display={`${settings.demandReductionPercent}% less`}
            tooltip="Reduces use further, for example by limiting non-urgent use."
            onChange={(value) => onChange({ demandReductionPercent: value })}
            unitLabel="percent"
          />
          <SliderRow
            id={`${groupId}-delay`}
            label="Delivery delay"
            value={settings.deliveryDelayDays}
            min={SCENARIO_LIMITS.deliveryDelayDays.min}
            max={SCENARIO_LIMITS.deliveryDelayDays.max}
            display={`${settings.deliveryDelayDays} ${settings.deliveryDelayDays === 1 ? 'day' : 'days'} later`}
            tooltip="Moves the expected replenishment date later by this many days."
            onChange={(value) => onChange({ deliveryDelayDays: value })}
            unitLabel="days"
          />
          {numberField('additionalOrderQuantity', 'Extra order quantity', 0, 100000, item.unit, 'An additional order in this scenario only. Nothing is ordered.')}
          {numberField('additionalOrderArrivalDay', 'Extra order arrives on day', 0, Math.max(0, horizonDays - 1), 'day from today', 'Counted from the as-of date. Day 0 is today.')}
          {numberField('transferQuantity', 'Transfer from another location', 0, 100000, item.unit, 'Stock moved in from another location, arriving tomorrow in this scenario only.')}
          {numberField('safetyStockTarget', 'Safety stock target', 0, 100000, item.unit, 'The buffer the order rules aim to keep above lead-time demand.')}
        </div>
        <div className="row row--between" style={{ marginTop: 16 }}>
          <span className="text-xs text-subtle">Quantities are in {item.unit}.</span>
          <Button size="sm" variant="ghost" icon={<RotateCcw size={14} aria-hidden="true" />} onClick={onReset}>
            Reset to actual values
          </Button>
        </div>
      </div>
    </div>
  );
}
