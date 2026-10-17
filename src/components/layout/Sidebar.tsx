import { NavLink } from 'react-router-dom';
import { ChevronsLeft, ChevronsRight } from 'lucide-react';
import { NAVIGATION_ITEMS } from '../../app/navigation';
import { useInventory } from '../../hooks/useInventory';
import { BrandMark } from './BrandMark';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  drawerOpen: boolean;
}

export function Sidebar({ collapsed, onToggleCollapsed, drawerOpen }: SidebarProps) {
  const { summary } = useInventory();
  const attentionCount = summary.critical;

  return (
    <aside className={`sidebar ${drawerOpen ? 'sidebar--open' : ''}`} aria-label="Application sidebar">
      <div className="row row--between" style={{ paddingRight: 2 }}>
        <div className="sidebar__brand" aria-label="Navetra home">
          <BrandMark />
          <span className="sidebar__brand-name">Navetra</span>
        </div>
        <button
          type="button"
          className="icon-button sidebar__collapse"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronsRight size={18} aria-hidden="true" /> : <ChevronsLeft size={18} aria-hidden="true" />}
        </button>
      </div>

      <nav className="sidebar__nav" aria-label="Main navigation">
        <span className="sidebar__section-label">Workspace</span>
        {NAVIGATION_ITEMS.map((item) => {
          const Icon = item.icon;
          const showCount = item.path === '/inventory' && attentionCount > 0;
          return (
            <NavLink key={item.path} to={item.path} end={item.end} className="nav-link" title={collapsed ? item.label : undefined}>
              <Icon size={18} aria-hidden="true" />
              <span className="nav-link__label">{item.label}</span>
              {showCount && (
                <span className="nav-link__count" aria-label={`${attentionCount} critical items`}>
                  {attentionCount}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar__footer">Synthetic demo data. Not for operational use.</div>
    </aside>
  );
}
