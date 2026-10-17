import type { KeyboardEvent } from 'react';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}

/** Radio group styled as a segmented control. Keyboard users move with the arrow keys. */
export function SegmentedControl<T extends string>({ options, value, onChange, label }: SegmentedControlProps<T>) {
  const handleKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const step = event.key === 'ArrowRight' ? 1 : -1;
    const next = options[(index + step + options.length) % options.length];
    onChange(next.value);
    const group = event.currentTarget.parentElement;
    group?.querySelector<HTMLButtonElement>(`[data-value="${next.value}"]`)?.focus();
  };

  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((option, index) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          data-value={option.value}
          aria-checked={value === option.value}
          tabIndex={value === option.value ? 0 : -1}
          className="segmented__option"
          onClick={() => onChange(option.value)}
          onKeyDown={(event) => handleKey(event, index)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
