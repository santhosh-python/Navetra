import { Info, X } from 'lucide-react';
import { useSettings } from '../../hooks/useSettings';
import { DEMO_AS_OF_DATE } from '../../lib/dates';
import { formatLongDate } from '../../lib/dates';
import { isBackendConfigured } from '../../services/apiClient';

/** Shown on every page while the app runs on built-in synthetic data. Can be hidden in Settings. */
export function DemoBanner() {
  const { updateSettings } = useSettings();
  return (
    <div className="demo-banner" role="note">
      <Info size={16} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
      <div>
        <strong>Demo data, backend not connected.</strong> All items, deliveries and history are synthetic and generated for demonstration. Figures are as of {formatLongDate(DEMO_AS_OF_DATE)}.{' '}
        {!isBackendConfigured() && 'Changes stay in this browser session.'}
      </div>
      <button type="button" className="btn btn--ghost btn--icon btn--sm demo-banner__dismiss" aria-label="Hide this notice (you can turn it back on in Settings)" onClick={() => updateSettings({ showDemoBanner: false })}>
        <X size={14} aria-hidden="true" />
      </button>
    </div>
  );
}
