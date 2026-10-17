import { Menu } from 'lucide-react';
import { GlobalSearch } from './GlobalSearch';
import { NotificationPanel } from './NotificationPanel';
import { useSettings } from '../../hooks/useSettings';
import { Button } from '../common/Button';

interface TopbarProps {
  onOpenMenu: () => void;
}

export function Topbar({ onOpenMenu }: TopbarProps) {
  const { settings } = useSettings();
  return (
    <header className="topbar">
      <Button variant="ghost" iconOnly className="topbar__menu-button" aria-label="Open navigation" onClick={onOpenMenu} icon={<Menu size={20} aria-hidden="true" />} />
      <div className="topbar__search">
        <GlobalSearch />
      </div>
      <div className="topbar__actions">
        <span className="org-chip" title="Organisation name (stored in this browser)">
          <span className="org-chip__name">{settings.organizationName}</span>
        </span>
        <NotificationPanel />
      </div>
    </header>
  );
}
