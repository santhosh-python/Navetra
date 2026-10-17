import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { DemoBanner } from './DemoBanner';
import { ToastViewport } from '../common/ToastViewport';
import { useSettings } from '../../hooks/useSettings';
import { useInventory } from '../../hooks/useInventory';

const SIDEBAR_STORAGE_KEY = 'navetra.sidebarCollapsed';

/** Page frame: sidebar, topbar, demo notice, and the routed page. */
export function AppShell() {
  const { settings } = useSettings();
  const { isDemoData } = useInventory();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, collapsed ? '1' : '0');
    } catch {
      // Storage unavailable: the preference lasts for this page only.
    }
  }, [collapsed]);

  // Close the mobile drawer after navigating, and move focus to the page heading for screen readers.
  useEffect(() => {
    setDrawerOpen(false);
    const heading = document.querySelector<HTMLElement>('#main-content h1');
    if (heading) {
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    }
  }, [location.pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDrawerOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [drawerOpen]);

  const classes = ['app', collapsed && 'app--sidebar-collapsed', settings.density === 'compact' && 'app--compact'].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <Sidebar collapsed={collapsed} onToggleCollapsed={() => setCollapsed((current) => !current)} drawerOpen={drawerOpen} />
      {drawerOpen && <button type="button" className="scrim" aria-label="Close navigation" onClick={() => setDrawerOpen(false)} />}
      <div className="main">
        <Topbar onOpenMenu={() => setDrawerOpen(true)} />
        <main id="main-content" className="content">
          {isDemoData && settings.showDemoBanner && <DemoBanner />}
          <Outlet />
        </main>
      </div>
      <ToastViewport />
    </div>
  );
}
