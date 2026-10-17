import type { ReactNode } from 'react';
import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react';

export type AlertTone = 'info' | 'success' | 'warning' | 'error';

const ICONS: Record<AlertTone, typeof Info> = {
  info: Info,
  success: CircleCheck,
  warning: TriangleAlert,
  error: CircleAlert,
};

export function Alert({ tone = 'info', children, action }: { tone?: AlertTone; children: ReactNode; action?: ReactNode }) {
  const Icon = ICONS[tone];
  return (
    <div className={`alert alert--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <Icon size={16} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
      {action}
    </div>
  );
}
