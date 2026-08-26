import { useState } from 'react';
import axios from 'axios';
import { Truck, Hash } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';
import CustomSelect from './Form/CustomSelect';
import Modal from './Modal';
import type { RiderProfile, VehicleType } from '../types/models';

interface AssignVehicleModalProps {
  rider: RiderProfile;
  onClose: () => void;
  onUpdate: (rider: RiderProfile) => void;
}

const VEHICLE_OPTIONS: { value: VehicleType; label: string }[] = [
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

export default function AssignVehicleModal({ rider, onClose, onUpdate }: AssignVehicleModalProps) {
  const toast = useToast();
  const [vehicleId, setVehicleId] = useState(rider.vehicleId ?? '');
  const [vehicleType, setVehicleType] = useState<VehicleType>(rider.vehicleType ?? 'motorbike');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const { data } = await api.patch<RiderProfile>(`/riders/${rider.id}`, {
        vehicleId: vehicleId.trim(),
        vehicleType,
      });
      onUpdate(data);
      toast.success('Vehicle assigned.');
      onClose();
    } catch (err) {
      const message = extractErrorMessage(err, 'Failed to assign vehicle. Please try again.');
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal onClose={onClose} maxWidth="440px" padding="0">
      <div style={{ background: '#fff', borderRadius: '16px', width: '100%', overflow: 'hidden' }}>
        <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>Assign Vehicle</h2>
          <div style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>{rider.user.name}</div>
        </div>

        <div style={{ padding: '24px' }}>
          <form id="assign-vehicle-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '8px', padding: '12px 16px', fontWeight: 600, fontSize: '14px' }}>
                {error}
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>Vehicle ID / Plate Number</label>
              <div style={{ position: 'relative' }}>
                <Hash size={17} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  required
                  placeholder="GT-1234-24"
                  value={vehicleId}
                  onChange={(e) => setVehicleId(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px 10px 40px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>Vehicle Type</label>
              <CustomSelect
                value={vehicleType}
                onChange={(v) => setVehicleType(v as VehicleType)}
                options={VEHICLE_OPTIONS}
                icon={<Truck size={17} />}
              />
            </div>
          </form>
        </div>

        <div style={{ padding: '20px 24px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button type="button" onClick={onClose} className="neutral-btn" style={{ padding: '10px 20px', borderRadius: '8px', fontWeight: 600 }}>
            Cancel
          </button>
          <button
            type="submit"
            form="assign-vehicle-form"
            className="primary-green"
            disabled={isSubmitting}
            style={{ padding: '10px 24px', borderRadius: '8px', fontWeight: 700, opacity: isSubmitting ? 0.7 : 1 }}
          >
            {isSubmitting ? 'Saving...' : 'Save Vehicle'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
