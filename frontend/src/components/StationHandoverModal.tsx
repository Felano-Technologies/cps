import { useState } from 'react';
import { Camera, CheckCircle2 } from 'lucide-react';
import api from '../services/api';
import Modal from './Modal';
import FileUpload from './Form/FileUpload';

interface Props { stopAddress: string; onClose: () => void; onSubmit: (details: { stationDriverName: string; stationDriverNumber: string; stationCarNumber: string; stationReceiptUrl: string }) => Promise<void>; }

export default function StationHandoverModal({ stopAddress, onClose, onSubmit }: Props) {
  const [driverName, setDriverName] = useState('');
  const [driverNumber, setDriverNumber] = useState('');
  const [carNumber, setCarNumber] = useState('');
  const [receipt, setReceipt] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const ready = driverName.trim() && driverNumber.trim() && carNumber.trim() && receipt && !saving;

  const submit = async () => {
    if (!ready || !receipt) return;
    setSaving(true); setError(null);
    try {
      const form = new FormData(); form.append('photo', receipt);
      const { data } = await api.post<{ url: string }>('/uploads', form);
      await onSubmit({ stationDriverName: driverName, stationDriverNumber: driverNumber, stationCarNumber: carNumber, stationReceiptUrl: data.url });
    } catch {
      setError('Could not save the station handover. Please try again.');
    } finally { setSaving(false); }
  };

  const fieldStyle = { width: '100%', boxSizing: 'border-box' as const, padding: '13px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '15px' };
  return <Modal onClose={onClose} title="Station Handover" align="bottom" maxWidth="480px">
    <div style={{ background: '#fff7ed', color: '#9a3412', padding: '12px', borderRadius: '10px', fontSize: '13px', marginBottom: '18px' }}>
      Record the station vehicle details and receipt for <strong>{stopAddress}</strong>. This completes the rider’s station handover.
    </div>
    {error && <div style={{ color: '#991b1b', background: '#fef2f2', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>{error}</div>}
    <div style={{ display: 'grid', gap: '14px' }}>
      <label><strong>Driver name</strong><input style={fieldStyle} value={driverName} onChange={e => setDriverName(e.target.value)} placeholder="Station vehicle driver" /></label>
      <label><strong>Driver phone number</strong><input style={fieldStyle} value={driverNumber} onChange={e => setDriverNumber(e.target.value)} placeholder="024XXXXXXX" inputMode="tel" /></label>
      <label><strong>Car / vehicle number</strong><input style={fieldStyle} value={carNumber} onChange={e => setCarNumber(e.target.value)} placeholder="e.g. GR 1234-26" /></label>
      <FileUpload label="Take or upload receipt" previews={preview ? [preview] : []} icon={<Camera size={18} />} onFilesSelected={files => { if (files[0]) { setReceipt(files[0]); setPreview(URL.createObjectURL(files[0])); } }} onRemove={() => { setReceipt(null); setPreview(null); }} />
    </div>
    <button onClick={submit} disabled={!ready} style={{ width: '100%', marginTop: '24px', padding: '16px', border: 'none', borderRadius: '12px', background: '#078c35', color: '#fff', fontWeight: 800, fontSize: '16px', opacity: ready ? 1 : .55, cursor: ready ? 'pointer' : 'not-allowed' }}>
      {saving ? 'Saving…' : <><CheckCircle2 size={18} style={{ verticalAlign: 'middle', marginRight: 8 }} />Confirm station handover</>}
    </button>
  </Modal>;
}
