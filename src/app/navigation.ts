import type { LucideIcon } from 'lucide-react';
import { BarChart3, Database, FileText, LayoutDashboard, ListChecks, Package, Settings, SlidersHorizontal, TrendingDown } from 'lucide-react';

export interface NavigationItem {
  path: string;
  label: string;
  icon: LucideIcon;
  /** Matches the path exactly (used for the overview page). */
  end?: boolean;
}

/** Primary navigation. Order here is the order in the sidebar. */
export const NAVIGATION_ITEMS: NavigationItem[] = [
  { path: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { path: '/inventory', label: 'Inventory', icon: Package },
  { path: '/forecasts', label: 'Shortage forecasts', icon: TrendingDown },
  { path: '/recommendations', label: 'Recommendations', icon: ListChecks },
  { path: '/simulator', label: 'What-if simulator', icon: SlidersHorizontal },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/research-data', label: 'Research data', icon: Database },
  { path: '/reports', label: 'Reports', icon: FileText },
  { path: '/settings', label: 'Settings', icon: Settings },
];

