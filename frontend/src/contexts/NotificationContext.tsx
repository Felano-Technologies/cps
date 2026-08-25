import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';
import type { Notification } from '../types/models';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const POLL_INTERVAL_MS = 30000;

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get<{ notifications: Notification[]; unreadCount: number }>('/notifications');
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // silent — polling will retry
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isAuthenticated, refresh]);

  const markRead = useCallback(async (id: string) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)));
    setUnreadCount(prev => Math.max(0, prev - 1));
    try {
      await api.patch(`/notifications/${id}/read`);
    } catch {
      refresh();
    }
  }, [refresh]);

  const markAllRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    setUnreadCount(0);
    try {
      await api.patch('/notifications/read-all');
    } catch {
      refresh();
    }
  }, [refresh]);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markRead, markAllRead }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}
