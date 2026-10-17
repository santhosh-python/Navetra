import { useId } from 'react';
import { Info } from 'lucide-react';

/** Hover or keyboard-focus hint. The text is also linked to the button for screen readers. */
export function InfoTooltip({ text, label = 'More information' }: { text: string; label?: string }) {
  const id = useId();
  return (
    <span className="info-tip">
      <button type="button" className="info-tip__trigger" aria-label={label} aria-describedby={id}>
        <Info size={14} aria-hidden="true" />
      </button>
      <span role="tooltip" id={id} className="info-tip__bubble">
        {text}
      </span>
    </span>
  );
}
