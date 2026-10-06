import { useEffect, useState } from 'react';
import { Copy, KeyRound } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import type { ApiKeySummary } from '../../types/models';
import { ApprovalBanner, BusinessPage, Panel, Pill } from './ui';
import { dangerButton, errorMessage, formatDateTime, inputStyle, primaryButton, secondaryButton, tableStyle, tdStyle, thStyle, useBusinessProfile } from './businessShared';

export default function ApiKeysPage() {
  const toast = useToast();
  const { profile } = useBusinessProfile();
  const [keys, setKeys] = useState<ApiKeySummary[]>([]);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);

  const load = () => api.get<ApiKeySummary[]>('/business/keys').then(r => setKeys(r.data));
  useEffect(() => { void load(); }, []);

  const approved = profile?.status === 'approved';

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const { data } = await api.post<ApiKeySummary & { key: string }>('/business/keys', { name });
      setNewKey(data.key);
      setName('');
      await load();
    } catch (err) {
      toast.error(errorMessage(err, 'Could not create key'));
    } finally {
      setCreating(false);
    }
  };

  const revoke = async (key: ApiKeySummary) => {
    if (!window.confirm(`Revoke "${key.name}"? Requests using it will fail immediately.`)) return;
    try {
      await api.delete(`/business/keys/${key.id}`);
      toast.success('Key revoked');
      await load();
    } catch (err) {
      toast.error(errorMessage(err, 'Could not revoke key'));
    }
  };

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success('Copied');
    } catch {
      toast.error('Copy failed — select the key and copy it manually');
    }
  };

  return (
    <BusinessPage title="API keys" subtitle="Keys authenticate your server's requests to the CPS Partner API. Keep them secret — never ship them in a mobile or web app.">
      <ApprovalBanner profile={profile} />

      {newKey && (
        <Panel title="Your new API key" description="Copy it now and store it in your server's secrets. For your security CPS shows it only once.">
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <code style={{ flex: '1 1 320px', padding: 12, background: '#0f172a', color: '#e2e8f0', borderRadius: 10, wordBreak: 'break-all' }}>{newKey}</code>
            <button style={primaryButton} onClick={() => copy(newKey)}><Copy size={15} style={{ verticalAlign: -2 }} /> Copy</button>
            <button style={secondaryButton} onClick={() => setNewKey(null)}>I've saved it</button>
          </div>
        </Panel>
      )}

      <Panel title="Create a key" description="Name keys by where they're used (e.g. “Production server”, “Staging”) so you can revoke one without affecting the others.">
        <form onSubmit={create} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input
            style={{ ...inputStyle, flex: '1 1 260px', width: 'auto' }}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Production server"
            maxLength={60}
            required
            disabled={!approved}
          />
          <button type="submit" style={{ ...primaryButton, opacity: approved ? 1 : 0.5 }} disabled={!approved || creating}>
            <KeyRound size={15} style={{ verticalAlign: -2 }} /> {creating ? 'Creating…' : 'Create key'}
          </button>
        </form>
      </Panel>

      <Panel title="Your keys">
        {keys.length === 0 ? (
          <p style={{ color: '#64748b', margin: 0 }}>No keys yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ ...tableStyle, minWidth: 640 }}>
              <thead><tr>{['Name', 'Key', 'Created', 'Last used', 'Status', ''].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
              <tbody>
                {keys.map(k => (
                  <tr key={k.id}>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>{k.name}</td>
                    <td style={tdStyle}><code>{k.prefix}…</code></td>
                    <td style={tdStyle}>{formatDateTime(k.createdAt)}</td>
                    <td style={tdStyle}>{k.lastUsedAt ? formatDateTime(k.lastUsedAt) : 'Never'}</td>
                    <td style={tdStyle}>{k.revokedAt ? <Pill color="slate">Revoked</Pill> : <Pill color="green">Active</Pill>}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      {!k.revokedAt && <button style={dangerButton} onClick={() => revoke(k)}>Revoke</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </BusinessPage>
  );
}
