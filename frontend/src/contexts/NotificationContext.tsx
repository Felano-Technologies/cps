import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';
import type { Notification } from '../types/models';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isRinging: boolean;
  markRead: (id: string) => void;
  markAllRead: () => void;
  playAlertSound: () => void;
  startAlertRinging: (durationMs?: number) => void;
  stopAlertRinging: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const POLL_INTERVAL_MS = 30000;

export function playNotificationAlertSound() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Harmonic chime tone 1 (G5 - 783.99 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(783.99, now);
    gain1.gain.setValueAtTime(0.25, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Harmonic chime tone 2 (C6 - 1046.50 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1046.50, now + 0.1);
    gain2.gain.setValueAtTime(0.3, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.55);
  } catch {
    // AudioContext blocked or not supported
  }
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isRinging, setIsRinging] = useState(false);

  const isInitialFetchRef = useRef(true);
  const knownNotificationIdsRef = useRef<Set<string>>(new Set());
  const ringIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ringTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopAlertRinging = useCallback(() => {
    if (ringIntervalRef.current) {
      clearInterval(ringIntervalRef.current);
      ringIntervalRef.current = null;
    }
    if (ringTimeoutRef.current) {
      clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = null;
    }
    setIsRinging(false);
  }, []);

  const startAlertRinging = useCallback((durationMs = 60000) => {
    stopAlertRinging();
    setIsRinging(true);
    playNotificationAlertSound();

    // Re-play alert chime every 2.5 seconds during the 1-minute window
    ringIntervalRef.current = setInterval(() => {
      playNotificationAlertSound();
    }, 2500);

    // Automatically stop ringing after durationMs (default 60 seconds)
    ringTimeoutRef.current = setTimeout(() => {
      stopAlertRinging();
    }, durationMs);
  }, [stopAlertRinging]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      stopAlertRinging();
    };
  }, [stopAlertRinging]);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get<{ notifications: Notification[]; unreadCount: number }>('/notifications');

      // Check if any incoming notification is newly received and unread
      const hasNewUnread = data.notifications.some(
        n => !n.readAt && !knownNotificationIdsRef.current.has(n.id)
      );

      if (!isInitialFetchRef.current && hasNewUnread) {
        // Operations & Admin side rings continuously for 1 minute (60s); other roles get single chime
        if (user?.role === 'operations' || user?.role === 'admin') {
          startAlertRinging(60000);
        } else {
          playNotificationAlertSound();
        }
      }

      data.notifications.forEach(n => knownNotificationIdsRef.current.add(n.id));
      isInitialFetchRef.current = false;

      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // silent — polling will retry
    }
  }, [user?.role, startAlertRinging]);

  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      isInitialFetchRef.current = true;
      knownNotificationIdsRef.current.clear();
      stopAlertRinging();
      return;
    }
    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isAuthenticated, refresh, stopAlertRinging]);

  const markRead = useCallback(async (id: string) => {
    stopAlertRinging();
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)));
    setUnreadCount(prev => Math.max(0, prev - 1));
    try {
      await api.patch(`/notifications/${id}/read`);
    } catch {
      refresh();
    }
  }, [refresh, stopAlertRinging]);

  const markAllRead = useCallback(async () => {
    stopAlertRinging();
    setNotifications(prev => prev.map(n => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    setUnreadCount(0);
    try {
      await api.patch('/notifications/read-all');
    } catch {
      refresh();
    }
  }, [refresh, stopAlertRinging]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isRinging,
        markRead,
        markAllRead,
        playAlertSound: playNotificationAlertSound,
        startAlertRinging,
        stopAlertRinging,
      }}
    >
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
