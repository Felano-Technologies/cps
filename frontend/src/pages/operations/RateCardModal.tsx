import { useEffect, useState } from 'react';
import axios from 'axios';
import { Plus, Trash2 } from 'lucide-react';
import api from '../../services/api';
import Modal from '../../components/Modal';

interface OutskirtsArea { name: string; latitude: number; longitude: number; radiusKm: number }

interface RateCard {
  enabled: boolean;
  mediumKumasiPrice: number;
  bigKumasiPrice: number;
  bigPlusKumasiPrice: number;
  roundTo: number;
  outskirtsFee: number;
  outskirtsAreas: OutskirtsArea[];
  expressMultiplier: number;
  examples: { route: string; standard: number; medium: number; big: number; big_plus: number }[];
}

type AreaDraft = { name: string; latitude: string; longitude: string; radiusKm: string };

const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, boxSizing: 'border-box' } as const;
const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 6 } as const;
const hint = { fontSize: 12, color: '#64748b', marginTop: 4 } as const;

const apiError = (err: unknown, fallback: string) =>
  axios.isAxiosError(err) && typeof err.response?.data?.error === 'string' ? err.response.data.error : fallback;

const DEFAULTS = { enabled: true, medium: '70', big: '100', bigPlus: '150', roundTo: '5', outskirtsFee: '10', express: '2' };

/**
 * Custom pricing for one business: parcel sizes, outer-area surcharge and
 * express. Only this business's deliveries are affected; booked deliveries
 * keep the terms they were booked under.
 */
export default function RateCardModal({ business, onClose, onSaved }: {
  business: { id: string; name: string };
  onClose: () => void;
  onSaved: (enabled: boolean) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [card, setCard] = useState<RateCard | null>(null);
  const [enabled, setEnabled] = useState(DEFAULTS.enabled);
  const [medium, setMedium] = useState(DEFAULTS.medium);
  const [big, setBig] = useState(DEFAULTS.big);
  const [bigPlus, setBigPlus] = useState(DEFAULTS.bigPlus);
  const [roundTo, setRoundTo] = useState(DEFAULTS.roundTo);
  const [outskirtsFee, setOutskirtsFee] = useState(DEFAULTS.outskirtsFee);
  const [express, setExpress] = useState(DEFAULTS.express);
  const [areas, setAreas] = useState<AreaDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = (c: RateCard) => {
    setCard(c);
    setEnabled(c.enabled);
    setMedium(String(c.mediumKumasiPrice));
    setBig(String(c.bigKumasiPrice));
    setBigPlus(String(c.bigPlusKumasiPrice));
    setRoundTo(String(c.roundTo));
    setOutskirtsFee(String(c.outskirtsFee));
    setExpress(String(c.expressMultiplier));
    setAreas(c.outskirtsAreas.map(a => ({ name: a.name, latitude: String(a.latitude), longitude: String(a.longitude), radiusKm: String(a.radiusKm) })));
  };

  useEffect(() => {
    api.get<RateCard | null>(`/admin/businesses/${business.id}/rate-card`)
      .then(r => { if (r.data) load(r.data); })
      .catch(err => setError(apiError(err, 'Failed to load the rate card.')))
      .finally(() => setLoading(false));
  }, [business.id]);

  const setArea = (i: number, patch: Partial<AreaDraft>) => setAreas(prev => prev.map((a, j) => (j === i ? { ...a, ...patch } : a)));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const { data } = await api.put<RateCard>(`/admin/businesses/${business.id}/rate-card`, {
        enabled,
        mediumKumasiPrice: Number(medium),
        bigKumasiPrice: Number(big),
        bigPlusKumasiPrice: Number(bigPlus),
        roundTo: Number(roundTo),
        outskirtsFee: Number(outskirtsFee),
        expressMultiplier: Number(express),
        outskirtsAreas: areas.map(a => ({
          name: a.name.trim(), latitude: Number(a.latitude), longitude: Number(a.longitude), radiusKm: Number(a.radiusKm),
        })),
      });
      load(data);
      onSaved(data.enabled);
    } catch (err) {
      setError(apiError(err, 'Failed to save the rate card.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose} title={`Pricing for ${business.name}`} maxWidth="640px">
      {loading ? <p style={{ color: '#64748b' }}>Loading…</p> : (
        <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ margin: 0, fontSize: 14, color: '#64748b' }}>
            Custom prices for this business only. Other businesses and walk-in customers keep standard prices.
            Changes apply to new bookings; deliveries already booked keep their price.
          </p>
          {!card && <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af', borderRadius: 8, padding: '10px 14px', fontSize: 14 }}>
            This business pays standard prices. Saving creates its rate card.
          </div>}
          {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: 8, padding: '10px 14px', fontSize: 14, fontWeight: 600 }}>{error}</div>}

          <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 600, color: '#0f172a' }}>
            <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} /> Use this rate card
          </label>

          <fieldset style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, margin: 0 }}>
            <legend style={{ fontWeight: 700, color: '#0f172a', padding: '0 6px' }}>Parcel sizes</legend>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
              <div><label style={labelStyle}>Standard 1–5 kg</label><input style={{ ...inputStyle, background: '#f8fafc' }} value="35 (route price)" disabled /></div>
              <div><label style={labelStyle}>Medium 6–10 kg</label><input style={inputStyle} type="number" min={1} step="0.01" required value={medium} onChange={e => setMedium(e.target.value)} /></div>
              <div><label style={labelStyle}>Big 10–12 kg</label><input style={inputStyle} type="number" min={1} step="0.01" required value={big} onChange={e => setBig(e.target.value)} /></div>
              <div><label style={labelStyle}>Big+ 13–15 kg</label><input style={inputStyle} type="number" min={1} step="0.01" required value={bigPlus} onChange={e => setBigPlus(e.target.value)} /></div>
            </div>
            <div style={hint}>GHS on a standard Kumasi delivery. Other routes scale the same way (Big = route price × {Number(big) / 35 ? (Number(big) / 35).toFixed(2) : '—'}).</div>
            <div style={{ marginTop: 12, maxWidth: 200 }}>
              <label style={labelStyle}>Round sized prices up to (GHS)</label>
              <input style={inputStyle} type="number" min={0} step="0.01" required value={roundTo} onChange={e => setRoundTo(e.target.value)} />
            </div>
          </fieldset>

          <fieldset style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, margin: 0 }}>
            <legend style={{ fontWeight: 700, color: '#0f172a', padding: '0 6px' }}>Outer areas</legend>
            <div style={{ maxWidth: 200 }}>
              <label style={labelStyle}>Extra fee (GHS)</label>
              <input style={inputStyle} type="number" min={0} step="0.01" required value={outskirtsFee} onChange={e => setOutskirtsFee(e.target.value)} />
            </div>
            <div style={hint}>Added once when the pickup or the drop-off pin is inside one of these areas.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
              {areas.length === 0 && <div style={{ fontSize: 13, color: '#92400e' }}>No areas yet, so nobody pays the extra fee.</div>}
              {areas.map((a, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 0.8fr auto', gap: 8, alignItems: 'end' }}>
                  <div><label style={labelStyle}>Area</label><input style={inputStyle} required value={a.name} onChange={e => setArea(i, { name: e.target.value })} placeholder="Mamponteng" /></div>
                  <div><label style={labelStyle}>Centre latitude</label><input style={inputStyle} type="number" step="any" required value={a.latitude} onChange={e => setArea(i, { latitude: e.target.value })} /></div>
                  <div><label style={labelStyle}>Centre longitude</label><input style={inputStyle} type="number" step="any" required value={a.longitude} onChange={e => setArea(i, { longitude: e.target.value })} /></div>
                  <div><label style={labelStyle}>Radius (km)</label><input style={inputStyle} type="number" min={0.1} step="0.1" required value={a.radiusKm} onChange={e => setArea(i, { radiusKm: e.target.value })} /></div>
                  <button type="button" aria-label={`Remove ${a.name || 'area'}`} onClick={() => setAreas(prev => prev.filter((_, j) => j !== i))}
                    style={{ height: 38, width: 38, border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', color: '#b91c1c', cursor: 'pointer' }}>
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
              <button type="button" className="neutral-btn" style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6 }}
                onClick={() => setAreas(prev => [...prev, { name: '', latitude: '', longitude: '', radiusKm: '2' }])}>
                <Plus size={14} /> Add area
              </button>
              <div style={hint}>Tip: in Google Maps, right-click the middle of the area to copy its latitude and longitude.</div>
            </div>
          </fieldset>

          <fieldset style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, margin: 0 }}>
            <legend style={{ fontWeight: 700, color: '#0f172a', padding: '0 6px' }}>Express</legend>
            <div style={{ maxWidth: 200 }}>
              <label style={labelStyle}>Price × (multiplier)</label>
              <input style={inputStyle} type="number" min={1} max={10} step="0.01" required value={express} onChange={e => setExpress(e.target.value)} />
            </div>
            <div style={hint}>Applied after the size and outer-area fee.</div>
          </fieldset>

          {card && (
            <div style={{ fontSize: 13, color: '#334155' }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Saved prices (before outer areas and express)</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr style={{ color: '#64748b', textAlign: 'left' }}>{['Route', 'Standard', 'Medium', 'Big', 'Big+'].map(h => <th key={h} style={{ padding: '4px 6px' }}>{h}</th>)}</tr></thead>
                <tbody>
                  {card.examples.map(ex => (
                    <tr key={ex.route} style={{ borderTop: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '4px 6px' }}>{ex.route}</td>
                      {[ex.standard, ex.medium, ex.big, ex.big_plus].map((p, i) => <td key={i} style={{ padding: '4px 6px' }}>GHS {p}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" className="neutral-btn" onClick={onClose}>Close</button>
            <button type="submit" className="primary-green" disabled={saving}>{saving ? 'Saving…' : 'Save pricing'}</button>
          </div>
        </form>
      )}
    </Modal>
  );
}
