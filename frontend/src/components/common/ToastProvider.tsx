import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Check, CircleAlert, Info, X } from "lucide-react";

export type ToastTone = "success" | "error" | "info";

export interface ToastMessage {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
}

interface ToastContextValue {
  showToast: (message: Omit<ToastMessage, "id">) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismissToast = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    setToast(null);
  }, []);

  const showToast = useCallback((message: Omit<ToastMessage, "id">) => {
    if (timer.current) {
      clearTimeout(timer.current);
    }
    const nextToast: ToastMessage = { ...message, id: Date.now() };
    setToast(nextToast);
    timer.current = setTimeout(() => setToast(null), 4_500);
  }, []);

  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    },
    [],
  );

  const value = useMemo(() => ({ showToast }), [showToast]);
  const Icon = toast?.tone === "success" ? Check : toast?.tone === "error" ? CircleAlert : Info;

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-viewport" aria-live="polite" aria-atomic="true">
        {toast ? (
          <div
            key={toast.id}
            className={`toast toast--${toast.tone}`}
            role={toast.tone === "error" ? "alert" : "status"}
          >
            <Icon size={18} aria-hidden="true" />
            <div className="toast__copy">
              <strong>{toast.title}</strong>
              {toast.description ? <p>{toast.description}</p> : null}
            </div>
            <button className="icon-button toast__close" type="button" onClick={dismissToast} aria-label="Dismiss message">
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </div>
    </ToastContext.Provider>
  );
}
