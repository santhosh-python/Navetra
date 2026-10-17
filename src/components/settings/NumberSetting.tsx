import { useEffect, useState } from 'react';
import { FormField, fieldAria } from '../common/FormField';

interface NumberSettingProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  hint?: string;
  /** Cross-field rule checked before a value is saved. Return a message to block the save. */
  validate?: (value: number) => string | undefined;
  onCommit: (value: number) => void;
}

/**
 * Number input that only saves valid values. Invalid text shows a message and leaves the
 * current setting untouched, so calculations never receive a half-typed number.
 */
export function NumberSetting({ id, label, value, min, max, step = 1, hint, validate, onCommit }: NumberSettingProps) {
  const [draft, setDraft] = useState(String(value));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(String(value));
    setError(null);
  }, [value]);

  const shownError = error ?? undefined;

  return (
    <FormField id={id} label={label} hint={hint} error={shownError}>
      <input
        type="number"
        className="input"
        min={min}
        max={max}
        step={step}
        value={draft}
        {...fieldAria(id, hint, shownError)}
        onChange={(event) => {
          const text = event.target.value;
          setDraft(text);
          const parsed = Number(text);
          if (text.trim() === '' || Number.isNaN(parsed)) {
            setError('Enter a number.');
          } else if (parsed < min || parsed > max) {
            setError(`Enter a number from ${min} to ${max}.`);
          } else {
            const ruleMessage = validate?.(parsed);
            if (ruleMessage) {
              setError(ruleMessage);
            } else {
              setError(null);
              if (parsed !== value) onCommit(parsed);
            }
          }
        }}
      />
    </FormField>
  );
}
