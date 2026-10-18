import { Info, X } from 'lucide-react';
import { useInventory } from '../../hooks/useInventory';
import { useSettings } from '../../hooks/useSettings';

/** Reports the source and connection state for the legacy inventory sections. */
export function DemoBanner() {
  const { updateSettings } = useSettings();
  const { status, errorMessage, isDemoData } = useInventory();
  const message = isDemoData
    ? 'Local inventory dataset. The inventory API is not configured. Historical research data is available under Research data.'
    : status === 'error'
      ? `Inventory API unavailable. ${errorMessage ?? 'The inventory data could not be loaded.'}`
      : status === 'ready'
        ? 'Inventory API connected. Inventory, deliveries and history are loaded from the configured service.'
        : 'Connecting to the inventory API.';

  return (
    <div className="demo-banner" role="note">
      <Info size={16} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
      <div>
        <strong>{message}</strong>{' '}
        {isDemoData && 'The records are synthetic and not operational data. Changes stay in this browser session.'}
      </div>
      <button type="button" className="btn btn--ghost btn--icon btn--sm demo-banner__dismiss" aria-label="Hide this notice (you can turn it back on in Settings)" onClick={() => updateSettings({ showDemoBanner: false })}>
        <X size={14} aria-hidden="true" />
      </button>
    </div>
  );
}
