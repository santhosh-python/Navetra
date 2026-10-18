import { Building2, Menu, Settings, Upload, UserRound, Info } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { GlobalSearch } from './GlobalSearch';
import { NotificationPanel } from './NotificationPanel';
import { useSettings } from '../../hooks/useSettings';
import { Button, buttonClasses } from '../common/Button';
import { DropdownMenu } from '../common/DropdownMenu';

interface TopbarProps {
  onOpenMenu: () => void;
}

export function Topbar({ onOpenMenu }: TopbarProps) {
  const { settings } = useSettings();
  const navigate = useNavigate();
  return (
    <header className="topbar">
      <Button variant="ghost" iconOnly className="topbar__menu-button" aria-label="Open navigation" onClick={onOpenMenu} icon={<Menu size={20} aria-hidden="true" />} />
      <div className="topbar__search">
        <GlobalSearch />
      </div>
      <div className="topbar__actions">
        <DropdownMenu
          ariaLabel="Organisation menu"
          variant="ghost"
          size="sm"
          icon={<Building2 size={15} aria-hidden="true" />}
          label={<span className="topbar__org-name">{settings.organizationName}</span>}
          items={[
            { id: 'org-settings', label: 'Organisation settings', icon: <Settings size={14} aria-hidden="true" />, onSelect: () => navigate('/settings#organisation') },
            { id: 'org-switch', label: 'Switching organisations needs the backend', onSelect: () => undefined, disabled: true },
          ]}
        />
        <Link className={buttonClasses({ variant: 'primary', size: 'sm' })} to="/inventory?import=1" aria-label="Import CSV file">
          <Upload size={15} aria-hidden="true" />
          <span className="topbar__upload-label">Import CSV</span>
        </Link>
        <DropdownMenu
          ariaLabel="Account menu"
          variant="ghost"
          size="sm"
          icon={<UserRound size={15} aria-hidden="true" />}
          label={<span className="topbar__org-name">Inventory operator</span>}
          items={[
            { id: 'account', label: 'Sign-in is not configured', onSelect: () => undefined, disabled: true },
            { id: 'settings', label: 'Settings', icon: <Settings size={14} aria-hidden="true" />, onSelect: () => navigate('/settings') },
            { id: 'data-source', label: 'About the data source', icon: <Info size={14} aria-hidden="true" />, onSelect: () => navigate('/settings#data') },
          ]}
        />
        <NotificationPanel />
      </div>
    </header>
  );
}
