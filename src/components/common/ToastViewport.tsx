import { CircleAlert, CircleCheck, X } from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';

/** Short confirmations after actions. Only shown after the action has really completed. */
export function ToastViewport() {
  const { toasts, dismissToast } = useNotifications();
  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast--${toast.tone}`}>
          {toast.tone === 'error' ? <CircleAlert size={16} aria-hidden="true" /> : <CircleCheck size={16} aria-hidden="true" />}
          <span>{toast.message}</span>
          <button type="button" className="btn btn--ghost btn--icon btn--sm toast__close" aria-label="Dismiss message" onClick={() => dismissToast(toast.id)}>
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}
