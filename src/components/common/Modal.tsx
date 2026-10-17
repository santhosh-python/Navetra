import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  footer?: ReactNode;
  wide?: boolean;
  children: ReactNode;
}

/** Native <dialog>: focus is trapped, Escape closes it, and the page behind is inert while open. */
export function Modal({ open, onClose, title, description, footer, wide, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? 'modal--wide' : ''}`}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        // A click on the backdrop lands on the dialog element itself.
        if (event.target === ref.current) onClose();
      }}
    >
      {open && (
        <>
          <div className="modal__header">
            <div>
              <h2 className="modal__title" id={titleId}>
                {title}
              </h2>
              {description && <p className="modal__description">{description}</p>}
            </div>
            <button type="button" className="btn btn--ghost btn--icon" onClick={onClose} aria-label="Close dialog">
              <X size={18} aria-hidden="true" />
            </button>
          </div>
          <div className="modal__body">{children}</div>
          {footer && <div className="modal__footer">{footer}</div>}
        </>
      )}
    </dialog>
  );
}
