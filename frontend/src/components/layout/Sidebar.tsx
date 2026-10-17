import {
  Activity,
  Boxes,
  ChartNoAxesCombined,
  ChevronLeft,
  ChevronRight,
  FileText,
  LayoutDashboard,
  ListChecks,
  Settings2,
  SlidersHorizontal,
  Shield,
  type LucideIcon,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggleCollapse: () => void;
  onCloseMobile: () => void;
}

const navigationItems: { label: string; to: string; icon: LucideIcon; end?: boolean }[] = [
  { label: "Overview", to: "/", icon: LayoutDashboard, end: true },
  { label: "Inventory", to: "/inventory", icon: Boxes },
  { label: "Shortage Forecasts", to: "/forecasts", icon: Activity },
  { label: "Recommendations", to: "/recommendations", icon: ListChecks },
  { label: "What-If Simulator", to: "/simulator", icon: SlidersHorizontal },
  { label: "Analytics", to: "/analytics", icon: ChartNoAxesCombined },
  { label: "Reports", to: "/reports", icon: FileText },
  { label: "Settings", to: "/settings", icon: Settings2 },
];

export function Sidebar({
  collapsed,
  mobileOpen,
  onToggleCollapse,
  onCloseMobile,
}: SidebarProps) {
  const location = useLocation();

  return (
    <>
      {mobileOpen ? (
        <button
          className="sidebar-scrim"
          type="button"
          aria-label="Close navigation menu"
          onClick={onCloseMobile}
        />
      ) : null}
      <aside
        className={`sidebar${collapsed ? " sidebar--collapsed" : ""}${mobileOpen ? " sidebar--mobile-open" : ""}`}
        aria-label="Application sidebar"
      >
        <NavLink className="sidebar-brand" to="/" onClick={onCloseMobile} aria-label="Navetra overview">
          <span className="sidebar-brand__mark" aria-hidden="true">
            <Shield size={23} strokeWidth={1.7} />
            <span className="sidebar-brand__levels"><i /><i /><i /></span>
          </span>
          <span className="sidebar-brand__name">Navetra</span>
        </NavLink>

        <div className="sidebar-section-label">WORKSPACE</div>
        <nav className="sidebar-nav" aria-label="Main navigation">
          {navigationItems.map(({ label, to, icon: Icon, end }) => {
            const isItemDetail = to === "/inventory" && location.pathname.startsWith("/items/");
            return (
              <NavLink
                key={to}
                to={to}
                end={Boolean(end)}
                title={collapsed ? label : undefined}
                onClick={onCloseMobile}
                className={({ isActive }) =>
                  isActive || isItemDetail ? "sidebar-link sidebar-link--active" : "sidebar-link"
                }
                aria-current={isItemDetail ? "page" : undefined}
              >
                <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
                <span className="sidebar-link__label">{label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-demo-note">
            <span className="sidebar-demo-note__dot" />
            <span className="sidebar-link__label">Illustrative demo data</span>
          </div>
          <button
            className="sidebar-collapse-button"
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            <span className="sidebar-link__label">Collapse</span>
          </button>
        </div>
      </aside>
    </>
  );
}
