import { useEffect, useRef } from 'react';

/**
 * Calls `onDismiss` when the user clicks outside the referenced element or presses Escape.
 * Used by menus and popovers so they close the way people expect.
 */
export function useDismissable<T extends HTMLElement>(isOpen: boolean, onDismiss: () => void) {
  const containerRef = useRef<T | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointer = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onDismiss();
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDismiss();
    };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isOpen, onDismiss]);

  return containerRef;
}
