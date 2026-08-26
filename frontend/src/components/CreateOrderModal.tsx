import { useState } from 'react';
import axios from 'axios';
import { MapPin, Package, Truck, Zap, Flag } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';
import CustomSelect from './Form/CustomSelect';
import Modal from './Modal';
import type { CreateShipmentInput, PackageType, Shipment, ShipmentPriority, ShipmentSpeed, VehicleType } from '../types/models';

interface CreateOrderModalProps {
  onClose: () => void;
  onCreate: (shipment: Shipment) => void;
}

const REGIONS = ['Kumasi', 'Accra', 'Takoradi', 'Sunyani', 'Tamale'];

const REGION_OPTIONS: { value: string; label: string }[] = REGIONS.map(region => ({ value: region, label: region }));

const PACKAGE_TYPE_OPTIONS: { value: PackageType; label: string }[] = [
  { value: 'document', label: 'Document' },
  { value: 'parcel', label: 'Parcel' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'fragile', label: 'Fragile' },
  { value: 'food', label: 'Food' },
  { value: 'other', label: 'Other' },
];

const SPEED_OPTIONS: { value: ShipmentSpeed; label: string }[] = [
  { value: 'same_day', label: 'Same Day' },
  { value: 'next_day', label: 'Next Day' },
  { value: 'express', label: 'Express' },
];

const VEHICLE_OPTIONS: { value: VehicleType; label: string }[] = [
  { value: 'motorbike', label: 'Motorbike' },
  { value: 'van', label: 'Van' },
  { value: 'truck', label: 'Truck' },
];

const PRIORITY_OPTIONS: { value: ShipmentPriority; label: string }[] = [
  { value: 'standard', label: 'Standard' },
  { value: 'high', label: 'High' },
];

interface FormState {
  senderName: string;
  senderNumber: string;
  pickupRegion: string;
  pickupLocation: string;
  receiverName: string;
  receiverNumber: string;
  dropoffRegion: string;
  dropoffLocation: string;
  packageType: PackageType;
  speed: ShipmentSpeed;
  priority: ShipmentPriority;
  vehicleType: VehicleType;
}

const initialFormState: FormState = {
  senderName: '',
  senderNumber: '',
  pickupRegion: 'Kumasi',
  pickupLocation: '',
  receiverName: '',
  receiverNumber: '',
  dropoffRegion: 'Kumasi',
  dropoffLocation: '',
  packageType: 'parcel',
  speed: 'same_day',
  priority: 'standard',
  vehicleType: 'motorbike',
};

function extractErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err) && typeof err.response?.data?.error === 'string') {
    return err.response.data.error;
  }
  return fallback;
}

export default function CreateOrderModal({ onClose, onCreate }: CreateOrderModalProps) {
  const toast = useToast();
  const [formData, setFormData] = useState<FormState>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setFormData(prev => ({ ...prev, [field]: value }));
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const payload: CreateShipmentInput = {
      vehicleType: formData.vehicleType,
      priority: formData.priority,
      speed: formData.speed,
      packageType: formData.packageType,
      senderName: formData.senderName,
      senderNumber: formData.senderNumber,
      pickupRegion: formData.pickupRegion,
      pickupLocation: formData.pickupLocation,
      receiverName: formData.receiverName,
      receiverNumber: formData.receiverNumber,
      dropoffRegion: formData.dropoffRegion,
      dropoffLocation: formData.dropoffLocation,
    };

    try {
      const response = await api.post<Shipment>('/shipments', payload);
      onCreate(response.data);
      onClose();
    } catch (err) {
      const message = extractErrorMessage(err, 'Failed to create order. Please try again.');
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal onClose={onClose} maxWidth="600px" padding="0">
      <div
        style={{
          background: '#fff', borderRadius: '16px', width: '100%',
          overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh'
        }}
      >
        <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>Create New Order</h2>
          <div style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>Manually dispatch a package for delivery.</div>
        </div>

        <div style={{ padding: '24px', overflowY: 'auto' }}>
          <form id="create-order-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '8px', padding: '12px 16px', fontWeight: 600, fontSize: '14px' }}>
                {error}
              </div>
            )}

            {/* Sender & Receiver Section */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: 0, fontSize: '15px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', background: '#0f172a', borderRadius: '50%' }} />
                  Pickup Details
                </h4>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>Sender Name</label>
                  <input
                    type="text" required placeholder="John Doe"
                    value={formData.senderName}
                    onChange={(e) => updateField('senderName', e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>Sender Number</label>
                  <input
                    type="tel" required placeholder="0241234567"
                    value={formData.senderNumber}
                    onChange={(e) => updateField('senderNumber', e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>Pickup Region</label>
                  <CustomSelect
                    value={formData.pickupRegion}
                    onChange={v => updateField('pickupRegion', v)}
                    options={REGION_OPTIONS}
                    icon={<MapPin size={17} />}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>Pickup Address</label>
                  <input
                    type="text" required placeholder="124 Spintex Road"
                    value={formData.pickupLocation}
                    onChange={(e) => updateField('pickupLocation', e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: '#f0fdf4', padding: '16px', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                <h4 style={{ margin: 0, fontSize: '15px', color: '#166534', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', background: '#166534', borderRadius: '50%' }} />
                  Delivery Details
                </h4>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#166534', marginBottom: '6px' }}>Recipient Name</label>
                  <input
                    type="text" required placeholder="Jane Smith"
                    value={formData.receiverName}
                    onChange={(e) => updateField('receiverName', e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #86efac', fontSize: '14px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#166534', marginBottom: '6px' }}>Recipient Number</label>
                  <input
                    type="tel" required placeholder="0559876543"
                    value={formData.receiverNumber}
                    onChange={(e) => updateField('receiverNumber', e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #86efac', fontSize: '14px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#166534', marginBottom: '6px' }}>Dropoff Region</label>
                  <CustomSelect
                    value={formData.dropoffRegion}
                    onChange={v => updateField('dropoffRegion', v)}
                    options={REGION_OPTIONS}
                    icon={<MapPin size={17} />}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#166534', marginBottom: '6px' }}>Delivery Address</label>
                  <input
                    type="text" required placeholder="KNUST Campus"
                    value={formData.dropoffLocation}
                    onChange={(e) => updateField('dropoffLocation', e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #86efac', fontSize: '14px' }}
                  />
                </div>
              </div>
            </div>

            {/* Specs Section */}
            <div>
              <h4 style={{ margin: '0 0 16px 0', fontSize: '15px', color: '#0f172a' }}>Package Specs</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>Item Type</label>
                  <CustomSelect
                    value={formData.packageType}
                    onChange={v => updateField('packageType', v as PackageType)}
                    options={PACKAGE_TYPE_OPTIONS}
                    icon={<Package size={17} />}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>Vehicle Type</label>
                  <CustomSelect
                    value={formData.vehicleType}
                    onChange={v => updateField('vehicleType', v as VehicleType)}
                    options={VEHICLE_OPTIONS}
                    icon={<Truck size={17} />}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>Delivery Speed</label>
                  <CustomSelect
                    value={formData.speed}
                    onChange={v => updateField('speed', v as ShipmentSpeed)}
                    options={SPEED_OPTIONS}
                    icon={<Zap size={17} />}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>Priority</label>
                  <CustomSelect
                    value={formData.priority}
                    onChange={v => updateField('priority', v as ShipmentPriority)}
                    options={PRIORITY_OPTIONS}
                    icon={<Flag size={17} />}
                  />
                </div>
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
            form="create-order-form"
            className="primary-green"
            disabled={isSubmitting}
            style={{ padding: '10px 24px', borderRadius: '8px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', opacity: isSubmitting ? 0.7 : 1 }}
          >
            {isSubmitting ? 'Creating...' : 'Create Order'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
