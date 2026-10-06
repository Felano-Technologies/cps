import { Fragment, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, RefreshCw, Send } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import type { WebhookEventView } from '../../types/models';
import { BusinessPage, Panel, Pill } from './ui';
import { errorMessage, formatDateTime, inputStyle, primaryButton, secondaryButton, tableStyle, tdStyle, thStyle } from './businessShared';

interface WebhookSettings { url: string | null; secret: string }

const STATE_COLORS = { delivered: 'green', pending: 'amber', failed: 'red' } as const;

export default function WebhooksPage() {
  const toast = useToast();
  const [settings, setSettings] = useState<WebhookSettings | null>(null);
  const [url, setUrl] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [events, setEvents] = useState<WebhookEventView[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadEvents = () => api.get<WebhookEventView[]>('/business/webhook/events').then(r => setEvents(r.data));

  useEffect(() => {
    api.get<WebhookSettings>('/business/webhook').then(r => { setSettings(r.data); setUrl(r.data.url ?? ''); });
    void loadEvents();
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.put<WebhookSettings>('/business/webhook', { url: url.trim() || null });
      setSettings(data);
      toast.success(data.url ? 'Webhook URL saved' : 'Webhooks turned off');
    } catch (err) {
      toast.error(errorMessage(err, 'Could not save webhook URL'));
    } finally {
      setBusy(false);
    }
  };

  const rotate = async () => {
    if (!window.confirm('Rotate the signing secret? Signatures made with the old secret stop verifying as soon as you rotate, so update your server right away.')) return;
    const { data } = await api.post<WebhookSettings>('/business/webhook/rotate-secret');
    setSettings(data);
    setShowSecret(true);
    toast.success('Secret rotated');
  };

  const sendTest = async () => {
    setBusy(true);
    try {
      const { data } = await api.post<WebhookEventView>('/business/webhook/test');
      if (data.state === 'delivered') toast.success(`Test delivered (HTTP ${data.lastStatusCode})`);
      else toast.error(`Test failed: ${data.lastError ?? 'no response'}`);
      await loadEvents();
    } catch (err) {
      toast.error(errorMessage(err, 'Could not send test event'));
    } finally {
      setBusy(false);
    }
  };

  const retry = async (id: string) => {
    try {
      const { data } = await api.post<WebhookEventView>(`/business/webhook/events/${id}/retry`);
      toast[data.state === 'delivered' ? 'success' : 'error'](data.state === 'delivered' ? 'Delivered' : `Still failing: ${data.lastError ?? ''}`);
      await loadEvents();
    } catch (err) {
      toast.error(errorMessage(err, 'Retry failed'));
    }
  };

  return (
    <BusinessPage title="Webhooks" subtitle="CPS calls your URL whenever one of your deliveries changes, so you don't have to poll.">
      <Panel title="Endpoint" description={<>CPS sends a signed <code>POST</code> with JSON to this URL. Respond with any 2xx within 10 seconds. See <Link to="/developers">the docs</Link> for event types and how to verify signatures.</>}>
        <form onSubmit={save} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input
            style={{ ...inputStyle, flex: '1 1 320px', width: 'auto' }}
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://api.yourbusiness.com/webhooks/cps"
          />
          <button type="submit" style={primaryButton} disabled={busy}>Save</button>
          <button type="button" style={secondaryButton} disabled={busy || !settings?.url} onClick={sendTest}>
            <Send size={15} style={{ verticalAlign: -2 }} /> Send test event
          </button>
        </form>
      </Panel>

      <Panel title="Signing secret" description="Use this to verify the CPS-Signature header on every request, so you only trust events that really came from CPS.">
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <code style={{ flex: '1 1 320px', padding: 12, background: '#f1f5f9', borderRadius: 10, wordBreak: 'break-all' }}>
            {settings ? (showSecret ? settings.secret : `${settings.secret.slice(0, 10)}${'•'.repeat(24)}`) : '…'}
          </code>
          <button style={secondaryButton} onClick={() => setShowSecret(s => !s)}>
            {showSecret ? <EyeOff size={15} style={{ verticalAlign: -2 }} /> : <Eye size={15} style={{ verticalAlign: -2 }} />} {showSecret ? 'Hide' : 'Reveal'}
          </button>
          <button style={secondaryButton} onClick={rotate}><RefreshCw size={15} style={{ verticalAlign: -2 }} /> Rotate</button>
        </div>
      </Panel>

      <Panel
        title="Recent deliveries"
        description="Failed events are retried automatically for about 22 hours (1m, 5m, 15m, 1h, 3h, 6h, 12h). You can also retry one now."
        actions={<button style={secondaryButton} onClick={() => void loadEvents()}><RefreshCw size={15} style={{ verticalAlign: -2 }} /> Refresh</button>}
      >
        {events.length === 0 ? (
          <p style={{ color: '#64748b', margin: 0 }}>No events yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ ...tableStyle, minWidth: 760 }}>
              <thead><tr>{['Event', 'Shipment', 'State', 'Attempts', 'Last response', 'Created', ''].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
              <tbody>
                {events.map(ev => (
                  <Fragment key={ev.id}>
                    <tr onClick={() => setExpanded(x => (x === ev.id ? null : ev.id))} style={{ cursor: 'pointer' }}>
                      <td style={tdStyle}><code>{ev.type}</code><div style={{ color: '#94a3b8', fontSize: 11 }}>{ev.id}</div></td>
                      <td style={tdStyle}>{ev.trackingCode ?? '—'}{ev.externalReference && <div style={{ color: '#64748b', fontSize: 12 }}>{ev.externalReference}</div>}</td>
                      <td style={tdStyle}>
                        <Pill color={STATE_COLORS[ev.state]}>{ev.state}</Pill>
                        {ev.nextAttemptAt && ev.attempts > 0 && <div style={{ color: '#64748b', fontSize: 11, marginTop: 4 }}>next {formatDateTime(ev.nextAttemptAt)}</div>}
                      </td>
                      <td style={tdStyle}>{ev.attempts}</td>
                      <td style={tdStyle}>{ev.lastStatusCode ? `HTTP ${ev.lastStatusCode}` : ev.lastError ?? '—'}</td>
                      <td style={tdStyle}>{formatDateTime(ev.createdAt)}</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        {ev.state !== 'delivered' && (
                          <button style={secondaryButton} onClick={e => { e.stopPropagation(); void retry(ev.id); }}>Retry now</button>
                        )}
                      </td>
                    </tr>
                    {expanded === ev.id && (
                      <tr>
                        <td colSpan={7} style={{ ...tdStyle, background: '#f8fafc' }}>
                          <pre style={{ margin: 0, fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{JSON.stringify(ev.body, null, 2)}</pre>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </BusinessPage>
  );
}
