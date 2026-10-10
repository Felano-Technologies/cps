import { useState } from 'react';
import axios from 'axios';
import { Pencil } from 'lucide-react';
import api from '../services/api';
import Modal from './Modal';
import { useToast } from '../contexts/ToastContext';
import type { PackageSize, PackageType, Shipment } from '../types/models';

const PACKAGE_TYPES: PackageType[] = ['document', 'parcel', 'electronics', 'fragile', 'food', 'other'];
const PACKAGE_SIZES: PackageSize[] = ['small', 'medium', 'big'];

interface EditOrderModalProps {
  order: Shipment;
  onClose: () => void;
  onSaved: (order: Shipment) => void;
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 };
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14,
  fontFamily: 'inherit', background: '#fff', boxSizing: 'border-box',
};
const sectionStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 18 };
const headingStyle: React.CSSProperties = { fontSize: 12, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' };

export default function EditOrderModal({ order, onClose, onSaved }: EditOrderModalProps) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    senderName: order.senderName,
    senderNumber: order.senderNumber,
    pickupRegion: order.pickupRegion,
    pickupLocation: order.pickupLocation,
    receiverName: order.receiverName,
    receiverNumber: order.receiverNumber,
    dropoffRegion: order.dropoffRegion,
    dropoffLocation: order.dropoffLocation,
    stationLocation: order.stationLocation ?? '',
    packageType: order.packageType,
    packageSize: order.packageSize,
    productFee: order.productFee ?? '',
    additionalInstructions: order.additionalInstructions ?? '',
    opsRemarks: order.opsRemarks ?? '',
  });
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.patch<Shipment>(`/shipments/${order.id}`, {
        senderName: form.senderName,
        senderNumber: form.senderNumber,
        pickupLocation: form.pickupLocation,
        receiverName: form.receiverName,
        receiverNumber: form.receiverNumber,
        dropoffLocation: form.dropoffLocation,
        // Partner orders were priced on their regions, so those stay fixed.
        ...(order.prepaid ? {} : { pickupRegion: form.pickupRegion, dropoffRegion: form.dropoffRegion }),
        ...(order.deliveryType === 'station' ? { stationLocation: form.stationLocation || null } : {}),
        packageType: form.packageType,
        packageSize: form.packageSize,
        productFee: form.productFee === '' ? null : Number(form.productFee),
        additionalInstructions: form.additionalInstructions || null,
        opsRemarks: form.opsRemarks || null,
      });
      onSaved(data);
      toast.success(`Order ${data.trackingCode} updated.`);
      onClose();
    } catch (err) {
      toast.error(axios.isAxiosError(err) && typeof err.response?.data?.error === 'string' ? err.response.data.error : 'Failed to update order.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose} maxWidth="680px">
      <form onSubmit={handleSave}>
        <h3 style={{ margin: '0 0 4px', fontSize: 19, fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Pencil size={18} color="#078c35" /> Edit order {order.trackingCode}
        </h3>
        <p style={{ margin: '0 0 18px', fontSize: 13, color: '#64748b' }}>
          Correct the order details. Change the fee from the order's details page.
        </p>

        <div style={headingStyle}>Pickup</div>
        <div style={sectionStyle}>
          <div><label style={labelStyle}>Sender name</label><input required style={inputStyle} value={form.senderName} onChange={set('senderName')} /></div>
          <div><label style={labelStyle}>Sender phone</label><input required style={inputStyle} value={form.senderNumber} onChange={set('senderNumber')} /></div>
          <div><label style={labelStyle}>Region</label><input required disabled={order.prepaid} style={{ ...inputStyle, background: order.prepaid ? '#f1f5f9' : '#fff' }} value={form.pickupRegion} onChange={set('pickupRegion')} /></div>
          <div><label style={labelStyle}>Area / location</label><input required style={inputStyle} value={form.pickupLocation} onChange={set('pickupLocation')} /></div>
        </div>

        <div style={headingStyle}>Drop-off</div>
        <div style={sectionStyle}>
          <div><label style={labelStyle}>Receiver name</label><input required style={inputStyle} value={form.receiverName} onChange={set('receiverName')} /></div>
          <div><label style={labelStyle}>Receiver phone</label><input required style={inputStyle} value={form.receiverNumber} onChange={set('receiverNumber')} /></div>
          <div><label style={labelStyle}>Region</label><input required disabled={order.prepaid} style={{ ...inputStyle, background: order.prepaid ? '#f1f5f9' : '#fff' }} value={form.dropoffRegion} onChange={set('dropoffRegion')} /></div>
          <div><label style={labelStyle}>Area / location</label><input required style={inputStyle} value={form.dropoffLocation} onChange={set('dropoffLocation')} /></div>
          {order.deliveryType === 'station' && (
            <div><label style={labelStyle}>Station</label><input required style={inputStyle} value={form.stationLocation} onChange={set('stationLocation')} /></div>
          )}
        </div>
        {order.prepaid && (
          <p style={{ margin: '-8px 0 16px', fontSize: 12, color: '#64748b' }}>Regions are fixed on partner orders because the fee was agreed at booking.</p>
        )}

        <div style={headingStyle}>Package</div>
        <div style={sectionStyle}>
          <div>
            <label style={labelStyle}>Type</label>
            <select style={inputStyle} value={form.packageType} onChange={set('packageType')}>
              {PACKAGE_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Size</label>
            <select style={inputStyle} value={form.packageSize} onChange={set('packageSize')}>
              {PACKAGE_SIZES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>
          <div><label style={labelStyle}>Product fee (GHS)</label><input type="number" min="0" step="0.01" style={inputStyle} value={form.productFee} onChange={set('productFee')} /></div>
        </div>

        <div style={{ display: 'grid', gap: 12, marginBottom: 20 }}>
          <div><label style={labelStyle}>Instructions for the rider</label><textarea rows={2} style={inputStyle} value={form.additionalInstructions} onChange={set('additionalInstructions')} /></div>
          <div><label style={labelStyle}>Operations remarks (internal)</label><textarea rows={2} style={inputStyle} value={form.opsRemarks} onChange={set('opsRemarks')} /></div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button type="button" onClick={onClose} className="neutral-btn" style={{ padding: '10px 18px', borderRadius: 8, fontWeight: 600 }}>Cancel</button>
          <button type="submit" disabled={saving} className="primary-green" style={{ padding: '10px 24px', borderRadius: 8, fontWeight: 700, opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
