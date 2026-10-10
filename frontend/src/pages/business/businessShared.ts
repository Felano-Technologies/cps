import { useEffect, useState } from 'react';
import axios from 'axios';
import api from '../../services/api';
import type { BusinessProfile } from '../../types/models';

export const STATUS_LABELS: Record<string, string> = {
  pending: 'Awaiting rider',
  picked_up: 'Picked up',
  in_transit: 'In transit',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  delayed: 'Delayed',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

export function errorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err) && typeof err.response?.data?.error === 'string') return err.response.data.error;
  return err instanceof Error ? err.message : fallback;
}

export function formatDateTime(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString() : '—';
}

export function useBusinessProfile() {
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const reload = () => api.get<BusinessProfile>('/business/me').then(r => setProfile(r.data)).finally(() => setLoading(false));
  useEffect(() => { void reload(); }, []);
  return { profile, loading, reload };
}

export const tableStyle = { width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 } as const;
export const thStyle = { padding: '10px 12px', color: '#64748b', fontSize: 12, textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' } as const;
export const tdStyle = { padding: '12px', borderTop: '1px solid #f1f5f9', verticalAlign: 'top' } as const;
export const inputStyle = { width: '100%', boxSizing: 'border-box', padding: '11px 12px', border: '1px solid #cbd5e1', borderRadius: 10, fontSize: 14 } as const;
export const primaryButton = { border: 0, borderRadius: 10, padding: '11px 16px', background: '#078c35', color: '#fff', fontWeight: 700, cursor: 'pointer' } as const;
export const secondaryButton = { border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 14px', background: '#fff', color: '#0f172a', fontWeight: 600, cursor: 'pointer' } as const;
export const dangerButton = { ...secondaryButton, color: '#b91c1c', borderColor: '#fecaca' } as const;

export const ghs = (amount: number) => `GHS ${amount.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** "1 Oct 2026" or "1 – 7 Oct 2026" for an invoice period whose end is exclusive. */
export function formatPeriod(start: string, endExclusive: string) {
  const from = new Date(start);
  const to = new Date(new Date(endExclusive).getTime() - 1);
  const day = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  return day(from) === day(to) ? day(from) : `${day(from)} – ${day(to)}`;
}
