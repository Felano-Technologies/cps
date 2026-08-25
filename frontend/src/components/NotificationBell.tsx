import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
import type { Notification } from '../types/models';

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function dashboardPathFor(role?: string): string {
  switch (role) {
    case 'customer': return '/shipments';
    case 'rider': return '/route';
    case 'operations': return '/ops-board';
    case 'admin': return '/admin';
    default: return '/';
  }
}

export default function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleClickNotification = (n: Notification) => {
    if (!n.readAt) markRead(n.id);
    if (n.shipmentId) {
      navigate(dashboardPathFor(user?.role));
    }
    setOpen(false);
  };

  return (
    <div className="notification-bell" ref={rootRef}>
      <button
        type="button"
        className="notification-bell-trigger"
        onClick={(e) => { e.preventDefault(); setOpen(o => !o); }}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>

      {open && (
        <div className="notification-panel">
          <div className="notification-panel-header">
            <span>Notifications</span>
            {unreadCount > 0 && (
              <button type="button" onClick={(e) => { e.preventDefault(); markAllRead(); }} className="notification-mark-all">
                <CheckCheck size={14} /> Mark all read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="notification-empty">No notifications yet.</div>
          ) : (
            <div className="notification-list">
              {notifications.map(n => (
                <button
                  key={n.id}
                  type="button"
                  className={`notification-item${n.readAt ? '' : ' unread'}`}
                  onClick={(e) => { e.preventDefault(); handleClickNotification(n); }}
                >
                  <div className="notification-item-title">{n.title}</div>
                  <div className="notification-item-message">{n.message}</div>
                  <div className="notification-item-time">{timeAgo(n.createdAt)}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
