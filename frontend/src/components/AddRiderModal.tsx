import { useState } from 'react';
import axios from 'axios';
import { User, Mail, Phone, Lock, Truck, Hash } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';
import CustomSelect from './Form/CustomSelect';
import Modal from './Modal';
import type { RiderProfile, VehicleType } from '../types/models';

interface AddRiderModalProps {
  onClose: () => void;
  onCreate: (rider: RiderProfile) => void;
}

const VEHICLE_OPTIONS: { value: VehicleType | ''; label: string }[] = [
  { value: '', label: 'Not assigned yet' },
  { value: 'motorbike', label: 'Motorbike' },
  { value: 'van', label: 'Van' },
  { value: 'truck', label: 'Truck' },
];

function extractErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err) && typeof err.response?.data?.error === 'string') {
    return err.response.data.error;
  }
  return fallback;
}

export default function AddRiderModal({ onClose, onCreate }: AddRiderModalProps) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const { data } = await api.post<RiderProfile>('/riders', {
        name,
        email,
        phone,
        password,
        vehicleId: vehicleId.trim() || undefined,
        vehicleType: vehicleType || undefined,
      });
      onCreate(data);
      toast.success('Rider account created.');
      onClose();
    } catch (err) {
      const message = extractErrorMessage(err, 'Failed to create rider account. Please try again.');
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal onClose={onClose} maxWidth="480px" padding="0">
      <div style={{ background: '#fff', borderRadius: '16px', width: '100%', overflow: 'hidden' }}>
        <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>Add Rider</h2>
          <div style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>Create a rider account. They'll need verification before going online.</div>
        </div>

        <div style={{ padding: '24px' }}>
          <form id="add-rider-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '8px', padding: '12px 16px', fontWeight: 600, fontSize: '14px' }}>
                {error}
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>Full Name</label>
              <div style={{ position: 'relative' }}>
                <User size={17} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe"
                  style={{ width: '100%', padding: '10px 14px 10px 40px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }} />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>Email</label>
              <div style={{ position: 'relative' }}>
                <Mail size={17} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="rider@example.com"
                  style={{ width: '100%', padding: '10px 14px 10px 40px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }} />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>Phone</label>
              <div style={{ position: 'relative' }}>
                <Phone size={17} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0241234567"
                  style={{ width: '100%', padding: '10px 14px 10px 40px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }} />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>Initial Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={17} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input type="text" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters"
                  style={{ width: '100%', padding: '10px 14px 10px 40px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }} />
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px' }}>Share this with the rider — they can change it later in Settings.</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>Vehicle ID</label>
                <div style={{ position: 'relative' }}>
                  <Hash size={17} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input type="text" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} placeholder="GT-1234-24"
                    style={{ width: '100%', padding: '10px 14px 10px 40px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>Vehicle Type</label>
                <CustomSelect value={vehicleType} onChange={(v) => setVehicleType(v as VehicleType | '')} options={VEHICLE_OPTIONS} icon={<Truck size={16} />} />
              </div>
            </div>
          </form>
        </div>

        <div style={{ padding: '20px 24px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button type="button" onClick={onClose} className="neutral-btn" style={{ padding: '10px 20px', borderRadius: '8px', fontWeight: 600 }}>
            Cancel
          </button>
          <button
            type="submit"
            form="add-rider-form"
            className="primary-green"
            disabled={isSubmitting}
            style={{ padding: '10px 24px', borderRadius: '8px', fontWeight: 700, opacity: isSubmitting ? 0.7 : 1 }}
          >
            {isSubmitting ? 'Creating...' : 'Create Rider Account'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
