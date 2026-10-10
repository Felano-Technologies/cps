import { useState } from 'react';
import axios from 'axios';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';
import CustomSelect from './Form/CustomSelect';
import Modal from './Modal';
import type { RiderProfile, VehicleType } from '../types/models';

const VEHICLE_OPTIONS: { value: VehicleType | ''; label: string }[] = [
  { value: '', label: 'Not assigned' },
  { value: 'motorbike', label: 'Motorbike' },
  { value: 'van', label: 'Van' },
  { value: 'truck', label: 'Truck' },
];

const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, boxSizing: 'border-box' } as const;
const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 6 } as const;

/** Ops edit a rider's account (name, phone, email) and vehicle details. */
export default function EditRiderModal({ rider, onClose, onSaved }: {
  rider: RiderProfile;
  onClose: () => void;
  onSaved: (rider: RiderProfile) => void;
}) {
  const toast = useToast();
  const [name, setName] = useState(rider.user.name);
  const [phone, setPhone] = useState(rider.user.phone ?? '');
  const [email, setEmail] = useState(rider.user.email?.endsWith('@phone.cps.local') ? '' : rider.user.email ?? '');
  const [vehicleId, setVehicleId] = useState(rider.vehicleId ?? '');
  const [vehicleType, setVehicleType] = useState<VehicleType | ''>(rider.vehicleType ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const { data } = await api.patch<RiderProfile>(`/riders/${rider.id}`, {
        name: name.trim(),
        phone: phone.trim(),
        ...(email.trim() ? { email: email.trim() } : {}),
        vehicleId: vehicleId.trim() || null,
        vehicleType: vehicleType || null,
      });
      onSaved(data);
      toast.success('Rider updated.');
      onClose();
    } catch (err) {
      const message = axios.isAxiosError(err) && typeof err.response?.data?.error === 'string'
        ? err.response.data.error : 'Failed to update rider.';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose} title="Edit Rider" maxWidth="480px">
      <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: 8, padding: '10px 14px', fontSize: 14, fontWeight: 600 }}>{error}</div>}
        <div><label style={labelStyle}>Full name</label><input style={inputStyle} required value={name} onChange={e => setName(e.target.value)} /></div>
        <div>
          <label style={labelStyle}>Phone (used to sign in)</label>
          <input style={inputStyle} type="tel" required minLength={7} value={phone} onChange={e => setPhone(e.target.value)} />
        </div>
        <div><label style={labelStyle}>Email (optional)</label><input style={inputStyle} type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><label style={labelStyle}>Vehicle ID</label><input style={inputStyle} value={vehicleId} onChange={e => setVehicleId(e.target.value)} placeholder="GT-1234-24" /></div>
          <div><label style={labelStyle}>Vehicle type</label><CustomSelect value={vehicleType} onChange={v => setVehicleType(v as VehicleType | '')} options={VEHICLE_OPTIONS} /></div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
          <button type="button" className="neutral-btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="primary-green" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
        </div>
      </form>
    </Modal>
  );
}
