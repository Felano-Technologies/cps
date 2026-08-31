import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, VolumeX } from 'lucide-react';
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
  const { notifications, unreadCount, markRead, markAllRead, isRinging, stopAlertRinging } = useNotifications();
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
    stopAlertRinging();
    if (!n.readAt) markRead(n.id);
    if (n.shipmentId) {
      if (user?.role === 'operations' || user?.role === 'admin') {
        navigate(`/ops/tracking/${n.shipmentId}`);
      } else if (user?.role === 'rider') {
        navigate('/route');
      } else {
        navigate(`/tracking/${n.shipmentId}`);
      }
    } else {
      navigate(dashboardPathFor(user?.role));
    }
    setOpen(false);
  };

  const handleToggleOpen = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isRinging) {
      stopAlertRinging();
    }
    setOpen(o => !o);
  };

  return (
    <div className="notification-bell" ref={rootRef}>
      <style>{`
        @keyframes bellRingPulse {
          0% { transform: rotate(0) scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
          15% { transform: rotate(14deg) scale(1.1); }
          30% { transform: rotate(-14deg) scale(1.1); }
          45% { transform: rotate(10deg) scale(1.1); }
          60% { transform: rotate(-10deg) scale(1.1); }
          75% { transform: rotate(0) scale(1.05); box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
          100% { transform: rotate(0) scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
        .bell-ringing {
          animation: bellRingPulse 1.2s infinite ease-in-out !important;
          background: #fee2e2 !important;
          color: #dc2626 !important;
          border-color: #ef4444 !important;
        }
      `}</style>

      <button
        type="button"
        className={`notification-bell-trigger ${isRinging ? 'bell-ringing' : ''}`}
        onClick={handleToggleOpen}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Notifications"
        title={isRinging ? "Active Alert Ringing - Click to view & silence" : "Notifications"}
      >
        <Bell size={18} />
        {unreadCount > 0 && <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>

      {open && (
        <div className="notification-panel">
          <div className="notification-panel-header">
            <span>Notifications</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isRinging && (
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); stopAlertRinging(); }}
                  style={{
                    background: '#fee2e2',
                    color: '#dc2626',
                    border: '1px solid #fca5a5',
                    borderRadius: '6px',
                    padding: '2px 8px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  title="Silence alert alarm"
                >
                  <VolumeX size={12} /> Silence
                </button>
              )}
              {unreadCount > 0 && (
                <button type="button" onClick={(e) => { e.preventDefault(); markAllRead(); }} className="notification-mark-all">
                  <CheckCheck size={14} /> Mark all read
                </button>
              )}
            </div>
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

