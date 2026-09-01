import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import api, { AUTH_TOKEN_STORAGE_KEY } from '../services/api';
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

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (!sharedAudioCtx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        sharedAudioCtx = new AudioCtx();
      }
    }
    if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  };
  window.addEventListener('click', unlockAudio, { passive: true });
  window.addEventListener('keydown', unlockAudio, { passive: true });
  window.addEventListener('touchstart', unlockAudio, { passive: true });
}

export function playNotificationAlertSound(volumeMultiplier = 1.0) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const vol = Math.min(2.0, Math.max(0.1, volumeMultiplier));

    // Dynamic compression to maximize perceived loudness without clipping
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-14, now);
    compressor.knee.setValueAtTime(30, now);
    compressor.ratio.setValueAtTime(10, now);
    compressor.attack.setValueAtTime(0.003, now);
    compressor.release.setValueAtTime(0.2, now);
    compressor.connect(ctx.destination);

    // Master volume boost stage
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(1.5 * vol, now);
    masterGain.connect(compressor);

    // Note 1: High-impact crystal chime tone (G5 - 783.99 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(783.99, now);
    gain1.gain.setValueAtTime(0.9, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);
    osc1.connect(gain1);
    gain1.connect(masterGain);
    osc1.start(now);
    osc1.stop(now + 0.38);

    // Note 2: Bright harmonic chime (C6 - 1046.50 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1046.50, now + 0.1);
    gain2.gain.setValueAtTime(0.95, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.58);
    osc2.connect(gain2);
    gain2.connect(masterGain);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.58);

    // Note 3: High bell overtone (E6 - 1318.5 Hz) for audibility
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(1318.51, now + 0.2);
    gain3.gain.setValueAtTime(0.9, now + 0.2);
    gain3.gain.exponentialRampToValueAtTime(0.0001, now + 0.68);
    osc3.connect(gain3);
    gain3.connect(masterGain);
    osc3.start(now + 0.2);
    osc3.stop(now + 0.68);
  } catch {
    // AudioContext blocked or not supported
  }
}

function resolveWebSocketUrl(): string {
  const apiUrl = import.meta.env.VITE_API_URL || `${window.location.origin}/api`;
  const base = apiUrl.replace(/\/api\/?$/, '').replace(/^http/, 'ws');
  // Cross-site cookies aren't reliable on some mobile browsers, and a
  // WebSocket handshake can't carry a custom Authorization header — so pass
  // the fallback Bearer token as a query param instead.
  let token: string | null = null;
  try {
    token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  } catch {
    // localStorage unavailable — connect cookie-only.
  }
  return `${base}/ws${token ? `?token=${encodeURIComponent(token)}` : ''}`;
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
    playNotificationAlertSound(0.95);

    // Re-play alert chime every 1.5 seconds during the 1-minute window
    ringIntervalRef.current = setInterval(() => {
      playNotificationAlertSound(0.95);
    }, 1500);

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
        // Operations, Admin, and Rider sides ring continuously for 1 minute (60s); customer role gets single chime
        if (user?.role === 'operations' || user?.role === 'admin' || user?.role === 'rider') {
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

  useEffect(() => {
    if (!isAuthenticated) return;

    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const connect = () => {
      if (cancelled) return;
      socket = new WebSocket(resolveWebSocketUrl());

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'notification' && payload.notification) {
            const incoming: Notification = payload.notification;
            if (!knownNotificationIdsRef.current.has(incoming.id)) {
              knownNotificationIdsRef.current.add(incoming.id);
              if (user?.role === 'operations' || user?.role === 'admin' || user?.role === 'rider') {
                startAlertRinging(60000);
              } else {
                playNotificationAlertSound();
              }
            }
            setNotifications(prev => [incoming, ...prev.filter(n => n.id !== incoming.id)]);
            setUnreadCount(prev => prev + 1);
          }
        } catch {
          // ignore malformed frames
        }
      };

      socket.onclose = () => {
        if (!cancelled) {
          reconnectTimer = setTimeout(connect, 3000);
        }
      };
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, [isAuthenticated, user?.role, startAlertRinging]);

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
