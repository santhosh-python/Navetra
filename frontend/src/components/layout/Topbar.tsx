import {
  Bell,
  ChevronDown,
  CircleHelp,
  Clock3,
  ExternalLink,
  Menu,
  Search,
  Settings2,
  UserRound,
  Upload,
  X,
} from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { DEMO_AS_OF_DATE } from "../../data/demoInventory";
import { useAppState } from "../../hooks/useAppState";
import { useToast } from "../../hooks/useToast";
import { formatDate, formatNumber } from "../../lib/formatters";
import { getInventoryMetrics, getRiskLabel } from "../../lib/inventoryMetrics";
import { selectInventory } from "../../lib/inventorySelectors";

interface TopbarProps {
  onOpenAdd: () => void;
  onOpenUpload: () => void;
  onOpenMobileMenu: () => void;
}

const pageNames: Record<string, string> = {
  "/": "Overview",
  "/inventory": "Inventory",
  "/forecasts": "Shortage Forecasts",
  "/recommendations": "Recommendations",
  "/simulator": "What-If Simulator",
  "/analytics": "Analytics",
  "/reports": "Reports",
  "/settings": "Settings",
};

type OpenMenu = "organization" | "profile" | "notifications" | null;

export function Topbar({ onOpenAdd, onOpenUpload, onOpenMobileMenu }: TopbarProps) {
  const {
    items,
    selectedOrganization,
    organizations,
    setSelectedOrganizationId,
    settings,
    readNotificationIds,
    markNotificationRead,
  } = useAppState();
  const showToast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchValue, setSearchValue] = useState("");
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  const pageContext = pageNames[location.pathname] ??
    (location.pathname.startsWith("/items/") ? "Item details" : "Navetra");
  const searchResults = useMemo(
    () =>
      searchValue.trim()
        ? selectInventory(items, {
            searchText: searchValue,
            sortBy: "daysOfStock",
            sortDirection: "asc",
            asOfDate: DEMO_AS_OF_DATE,
            riskThresholds: settings.riskThresholds,
          }).slice(0, 5)
        : [],
    [items, searchValue, settings.riskThresholds],
  );
  const notifications = useMemo(
    () =>
      items
        .map((item) => ({
          item,
          metrics: getInventoryMetrics(item, DEMO_AS_OF_DATE, settings.riskThresholds),
        }))
        .filter(({ metrics }) => metrics.riskLevel === "critical" || metrics.riskLevel === "high")
        .sort((left, right) => {
          const leftDays = left.metrics.daysOfStock ?? Number.POSITIVE_INFINITY;
          const rightDays = right.metrics.daysOfStock ?? Number.POSITIVE_INFINITY;
          return leftDays === rightDays ? 0 : leftDays < rightDays ? -1 : 1;
        })
        .slice(0, 6),
    [items, settings.riskThresholds],
  );
  const unreadCount = settings.notificationsEnabled
    ? notifications.filter(({ item }) => !readNotificationIds.includes(`inventory-${item.id}`)).length
    : 0;

  const goToSearchResults = () => {
    if (!searchValue.trim()) return;
    navigate(`/inventory?search=${encodeURIComponent(searchValue.trim())}`);
    setSearchOpen(false);
    setSearchValue("");
  };
  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    goToSearchResults();
  };
  const openItem = (itemId: string) => {
    navigate(`/items/${itemId}`);
    setSearchOpen(false);
    setSearchValue("");
    setOpenMenu(null);
  };
  const toggleMenu = (menu: OpenMenu) => {
    setOpenMenu((current) => (current === menu ? null : menu));
    setSearchOpen(false);
  };

  return (
    <header className="topbar">
      <div className="topbar__context">
        <button className="icon-button topbar__mobile-menu" type="button" onClick={onOpenMobileMenu} aria-label="Open navigation">
          <Menu size={20} />
        </button>
        <div className="breadcrumbs">
          <span className="breadcrumbs__root">Navetra</span>
          <span className="breadcrumbs__separator">/</span>
          <span className="breadcrumbs__current">{pageContext}</span>
        </div>
      </div>

      <div className="topbar__actions">
        <div className={`global-search${searchOpen ? " global-search--open" : ""}`}>
          <Search size={17} aria-hidden="true" />
          <form onSubmit={submitSearch} role="search">
            <input
              aria-label="Search inventory by item or SKU"
              placeholder="Search inventory…"
              value={searchValue}
              onFocus={() => { setSearchOpen(true); setOpenMenu(null); }}
              onChange={(event) => setSearchValue(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Escape") setSearchOpen(false); }}
            />
          </form>
          {searchValue ? (
            <button className="icon-button global-search__clear" type="button" onClick={() => setSearchValue("")} aria-label="Clear search"><X size={14} /></button>
          ) : null}
          {searchOpen && searchValue.trim() ? (
            <div className="search-results" role="listbox" aria-label="Inventory search results">
              {searchResults.length ? searchResults.map((item) => {
                const metrics = getInventoryMetrics(item, DEMO_AS_OF_DATE, settings.riskThresholds);
                return (
                  <button className="search-result" type="button" key={item.id} onClick={() => openItem(item.id)} role="option" aria-selected="false">
                    <span className="search-result__main"><strong>{item.name}</strong><span>{item.sku} · {item.location}</span></span>
                    <span className={`risk-dot risk-dot--${metrics.riskLevel}`} title={getRiskLabel(metrics.riskLevel)} />
                  </button>
                );
              }) : <p className="search-results__empty">No matching demo inventory found.</p>}
              <button className="search-results__all" type="button" onClick={goToSearchResults}>View all results <ExternalLink size={14} /></button>
            </div>
          ) : null}
        </div>

        <div className="topbar-menu-wrap">
          <button className={`organization-switcher${openMenu === "organization" ? " is-open" : ""}`} type="button" onClick={() => toggleMenu("organization")} aria-expanded={openMenu === "organization"} aria-haspopup="menu">
            <span className="organization-switcher__mark">{selectedOrganization.name.slice(0, 1)}</span>
            <span className="organization-switcher__name">{selectedOrganization.name}</span>
            <ChevronDown size={15} />
          </button>
          {openMenu === "organization" ? (
            <div className="menu-popover organization-menu" role="menu">
              <span className="menu-popover__eyebrow">ORGANIZATION</span>
              {organizations.map((organization) => (
                <button className={`organization-menu__item${organization.id === selectedOrganization.id ? " is-selected" : ""}`} key={organization.id} type="button" role="menuitemradio" aria-checked={organization.id === selectedOrganization.id} onClick={() => {
                  setSelectedOrganizationId(organization.id);
                  setOpenMenu(null);
                  showToast({ tone: "info", title: `Viewing ${organization.name}`, description: "Inventory and summaries now use this demo organization." });
                }}>
                  <span><strong>{organization.name}</strong><small>{organization.description}</small></span>
                  {organization.id === selectedOrganization.id ? <span className="menu-check">✓</span> : null}
                </button>
              ))}
              <div className="menu-popover__footnote">Sample organization data · local session</div>
            </div>
          ) : null}
        </div>

        <div className="topbar-menu-wrap topbar-menu-wrap--notifications">
          <button className={`icon-button topbar-icon-button${openMenu === "notifications" ? " is-active" : ""}`} type="button" onClick={() => toggleMenu("notifications")} aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`} aria-expanded={openMenu === "notifications"} aria-haspopup="dialog">
            <Bell size={19} />
            {unreadCount > 0 ? <span className="notification-count">{unreadCount > 9 ? "9+" : unreadCount}</span> : null}
          </button>
          {openMenu === "notifications" ? (
            <section className="notification-popover" aria-label="Notification centre" role="dialog">
              <header className="notification-popover__header">
                <div><strong>Notifications</strong><span>Demo-derived supply alerts</span></div>
                <button className="icon-button" type="button" onClick={() => setOpenMenu(null)} aria-label="Close notifications"><X size={17} /></button>
              </header>
              {!settings.notificationsEnabled ? (
                <div className="notification-empty"><Bell size={20} /><p>Notifications are paused in Settings.</p></div>
              ) : notifications.length ? (
                <div className="notification-list">
                  {notifications.map(({ item, metrics }) => {
                    const notificationId = `inventory-${item.id}`;
                    const isRead = readNotificationIds.includes(notificationId);
                    return (
                      <button className={`notification-item${isRead ? " notification-item--read" : ""}`} type="button" key={item.id} onClick={() => {
                        markNotificationRead(notificationId);
                        openItem(item.id);
                      }}>
                        <span className={`notification-item__icon notification-item__icon--${metrics.riskLevel}`}><Clock3 size={16} /></span>
                        <span className="notification-item__copy"><strong>{item.name}</strong><small>{getRiskLabel(metrics.riskLevel)} · {metrics.daysOfStock === null ? "Usage unavailable" : `${formatNumber(metrics.daysOfStock)} days of stock`}</small><small>Delivery {formatDate(metrics.expectedDeliveryDate)}</small></span>
                        {!isRead ? <span className="notification-unread-dot" aria-label="Unread" /> : null}
                      </button>
                    );
                  })}
                </div>
              ) : <div className="notification-empty"><Bell size={20} /><p>No active demo-derived alerts.</p></div>}
              <Link className="notification-popover__footer" to="/recommendations" onClick={() => setOpenMenu(null)}>Review recommendations <ExternalLink size={14} /></Link>
            </section>
          ) : null}
        </div>

        <div className="topbar-menu-wrap">
          <button className={`icon-button topbar-icon-button profile-button${openMenu === "profile" ? " is-active" : ""}`} type="button" onClick={() => toggleMenu("profile")} aria-label="Open profile menu" aria-expanded={openMenu === "profile"} aria-haspopup="menu"><span className="profile-avatar">AM</span></button>
          {openMenu === "profile" ? (
            <div className="menu-popover profile-menu" role="menu">
              <div className="profile-menu__identity"><span className="profile-avatar profile-avatar--large">AM</span><span><strong>Alex Morgan</strong><small>Operations manager · Demo</small></span></div>
              <Link to="/settings" role="menuitem" onClick={() => setOpenMenu(null)}><UserRound size={16} /> Profile and preferences</Link>
              <Link to="/settings" role="menuitem" onClick={() => setOpenMenu(null)}><Settings2 size={16} /> Application settings</Link>
              <button type="button" role="menuitem" onClick={() => { setOpenMenu(null); showToast({ tone: "info", title: "Help centre", description: "Help links will be connected in a later release." }); }}><CircleHelp size={16} /> Help and support</button>
              <div className="menu-popover__footnote">Demo profile · no account service connected</div>
            </div>
          ) : null}
        </div>

        <span className="topbar-divider" aria-hidden="true" />
        <button className="button button--secondary topbar-action topbar-action--upload" type="button" onClick={onOpenUpload}><Upload size={15} aria-hidden="true" /><span>Upload data</span></button>
        <button className="button button--primary topbar-action" type="button" onClick={onOpenAdd}><span className="topbar-action__plus">+</span><span>Add inventory</span></button>
      </div>
    </header>
  );
}
