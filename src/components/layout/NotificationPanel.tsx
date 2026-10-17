import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CircleAlert, CircleCheck, Clock, X } from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import { useDismissable } from '../../hooks/useDismissable';
import type { NotificationKind } from '../../lib/notifications';
import { EmptyState } from '../common/EmptyState';

const KIND_ICON: Record<NotificationKind, typeof Bell> = {
  'stock-out-before-delivery': CircleAlert,
  'critical-level': CircleAlert,
  'warning-level': Clock,
  'stock-count-overdue': Clock,
};

export function NotificationPanel() {
  const { notifications, unreadCount, isRead, markRead, markAllRead, dismiss } = useNotifications();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const containerRef = useDismissable<HTMLDivElement>(open, close);

  return (
    <div className="menu-anchor" ref={containerRef}>
      <button
        type="button"
        className="icon-button"
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <Bell size={18} aria-hidden="true" />
        {unreadCount > 0 && <span className="icon-button__dot">{unreadCount}</span>}
      </button>
      {open && (
        <div className="menu menu--wide" role="dialog" aria-label="Notifications">
          <div className="menu__header row row--between">
            <div>
              <div className="menu__header-title">Notifications</div>
              <div className="menu__header-meta">Generated from current stock figures. Dismissing hides a notice for this session.</div>
            </div>
          </div>
          {notifications.length === 0 ? (
            <EmptyState compact icon={<CircleCheck size={18} aria-hidden="true" />} title="No notifications" description="Nothing needs attention under the current settings." />
          ) : (
            <>
              <div className="row row--between" style={{ padding: '0 10px 6px' }}>
                <span className="text-small text-muted">{unreadCount} unread</span>
                <button type="button" className="btn btn--ghost btn--sm" onClick={markAllRead} disabled={unreadCount === 0}>
                  Mark all read
                </button>
              </div>
              <ul className="notification-list" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {notifications.map((notification) => {
                  const Icon = KIND_ICON[notification.kind];
                  const unread = !isRead(notification.id);
                  return (
                    <li key={notification.id} className={`notification-item ${unread ? 'notification-item--unread' : ''}`}>
                      <Icon size={16} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2, color: notification.severity === 'critical' ? 'var(--color-critical)' : notification.severity === 'warning' ? 'var(--color-warning)' : 'var(--color-info)' }} />
                      <div className="notification-item__body">
                        <div className="notification-item__title">{notification.title}</div>
                        <div className="notification-item__message">{notification.message}</div>
                        <div className="notification-item__actions">
                          <Link to={`/inventory/${encodeURIComponent(notification.itemId)}`} onClick={() => { markRead(notification.id); setOpen(false); }}>
                            View item
                          </Link>
                          {unread && (
                            <button type="button" onClick={() => markRead(notification.id)}>
                              Mark read
                            </button>
                          )}
                        </div>
                      </div>
                      <button type="button" className="btn btn--ghost btn--icon btn--sm" aria-label={`Dismiss: ${notification.title}`} onClick={() => dismiss(notification.id)}>
                        <X size={14} aria-hidden="true" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
