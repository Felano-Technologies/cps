import type { ReactNode } from 'react';
import { Clock, ShieldAlert } from 'lucide-react';
import type { BusinessProfile } from '../../types/models';

export function BusinessPage({ title, subtitle, actions, children }: { title: string; subtitle?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="page-shell light-shell" style={{ padding: '32px 24px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0 }}>{title}</h1>
          {subtitle && <p style={{ color: '#64748b', margin: '6px 0 0' }}>{subtitle}</p>}
        </div>
        {actions}
      </div>
      {children}
    </div>
  );
}

export function Panel({ title, description, children, actions }: { title?: string; description?: ReactNode; children: ReactNode; actions?: ReactNode }) {
  return (
    <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 20, marginBottom: 20 }}>
      {(title || actions) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: description ? 4 : 14 }}>
          {title && <h2 style={{ margin: 0, fontSize: 18 }}>{title}</h2>}
          {actions}
        </div>
      )}
      {description && <p style={{ color: '#64748b', margin: '0 0 14px', fontSize: 14 }}>{description}</p>}
      {children}
    </section>
  );
}

const PILL_COLORS: Record<string, { bg: string; fg: string }> = {
  green: { bg: '#dcfce7', fg: '#166534' },
  amber: { bg: '#fef3c7', fg: '#92400e' },
  red: { bg: '#fee2e2', fg: '#991b1b' },
  slate: { bg: '#f1f5f9', fg: '#475569' },
};

export function Pill({ color, children }: { color: keyof typeof PILL_COLORS; children: ReactNode }) {
  const c = PILL_COLORS[color]!;
  return (
    <span style={{ background: c.bg, color: c.fg, borderRadius: 999, padding: '3px 10px', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
      {children}
    </span>
  );
}

/** Shown on every business page until CPS approves the account. */
export function ApprovalBanner({ profile }: { profile: BusinessProfile | null }) {
  if (!profile || profile.status === 'approved') return null;
  const suspended = profile.status === 'suspended';
  return (
    <div style={{
      display: 'flex', gap: 12, alignItems: 'flex-start', padding: 16, borderRadius: 12, marginBottom: 20,
      background: suspended ? '#fef2f2' : '#fffbeb', border: `1px solid ${suspended ? '#fecaca' : '#fde68a'}`,
    }}>
      {suspended ? <ShieldAlert size={20} color="#b91c1c" /> : <Clock size={20} color="#b45309" />}
      <div style={{ fontSize: 14 }}>
        <strong>{suspended ? 'API access suspended' : 'Awaiting approval'}</strong>
        <div style={{ color: '#475569', marginTop: 2 }}>
          {suspended
            ? 'Your API keys are disabled. Contact CPS to restore access.'
            : 'CPS is reviewing your business. You can read the API docs now; API keys can be created once you are approved.'}
        </div>
      </div>
    </div>
  );
}

