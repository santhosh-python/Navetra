import { useCallback, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { useDismissable } from '../../hooks/useDismissable';
import { Button, type ButtonVariant } from './Button';

export interface MenuAction {
  id: string;
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
}

interface DropdownMenuProps {
  label: ReactNode;
  icon?: ReactNode;
  items: MenuAction[];
  variant?: ButtonVariant;
  size?: 'md' | 'sm';
  align?: 'left' | 'right';
  ariaLabel: string;
}

export function DropdownMenu({ label, icon, items, variant = 'secondary', size = 'md', align = 'right', ariaLabel }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const containerRef = useDismissable<HTMLDivElement>(open, close);

  return (
    <div className="menu-anchor" ref={containerRef}>
      <Button
        variant={variant}
        size={size}
        icon={icon}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((current) => !current)}
      >
        {label}
        <ChevronDown size={14} aria-hidden="true" />
      </Button>
      {open && (
        <div className={`menu ${align === 'left' ? 'menu--left' : ''}`} role="menu" aria-label={ariaLabel}>
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              className={`menu__item ${item.danger ? 'menu__item--danger' : ''}`}
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
