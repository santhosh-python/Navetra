import { useRef, type KeyboardEvent } from 'react';

export interface TabDefinition<T extends string> {
  id: T;
  label: string;
}

interface TabsProps<T extends string> {
  tabs: TabDefinition<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}

/** Tab list with arrow-key navigation (WAI-ARIA pattern). The page renders the matching panel. */
export function Tabs<T extends string>({ tabs, value, onChange, label }: TabsProps<T>) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number | null = null;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = tabs.length - 1;
    if (nextIndex === null) return;
    event.preventDefault();
    onChange(tabs[nextIndex].id);
    buttons.current[nextIndex]?.focus();
  };

  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {tabs.map((tab, index) => (
        <button
          key={tab.id}
          ref={(element) => {
            buttons.current[index] = element;
          }}
          type="button"
          role="tab"
          id={`tab-${tab.id}`}
          aria-selected={value === tab.id}
          aria-controls={`panel-${tab.id}`}
          tabIndex={value === tab.id ? 0 : -1}
          className="tab"
          onClick={() => onChange(tab.id)}
          onKeyDown={(event) => handleKey(event, index)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
