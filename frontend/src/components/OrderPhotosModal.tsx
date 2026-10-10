import { useRef, useState } from 'react';
import axios from 'axios';
import { ImageIcon, Upload } from 'lucide-react';
import api from '../services/api';
import Modal from './Modal';
import { useToast } from '../contexts/ToastContext';
import type { Shipment } from '../types/models';

interface OrderPhotosModalProps {
  order: Shipment;
  onClose: () => void;
  onSaved: (order: Shipment) => void;
}

/** The order's pictures: the customer's package photo, the rider's proof of delivery and any station receipt. */
function orderPhotos(order: Shipment) {
  return [
    { key: 'package', label: 'Package photo (from customer)', url: order.packageImageUrl },
    { key: 'pod', label: 'Proof of delivery', url: order.podPhotoUrl },
    { key: 'station', label: 'Station receipt', url: order.stationReceiptUrl },
  ].filter((p): p is { key: string; label: string; url: string } => !!p.url);
}

export default function OrderPhotosModal({ order, onClose, onSaved }: OrderPhotosModalProps) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const photos = orderPhotos(order);
  const canEdit = !['delivered', 'failed', 'cancelled'].includes(order.status);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);
      const { data: upload } = await api.post<{ url: string }>('/uploads', formData);
      const { data } = await api.patch<Shipment>(`/shipments/${order.id}`, { packageImageUrl: upload.url });
      onSaved(data);
      toast.success('Package photo saved.');
    } catch (err) {
      toast.error(axios.isAxiosError(err) && typeof err.response?.data?.error === 'string' ? err.response.data.error : 'Failed to upload the photo.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <Modal onClose={onClose} maxWidth="760px">
      <h3 style={{ margin: '0 0 4px', fontSize: 19, fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
        <ImageIcon size={18} color="#078c35" /> Photos for {order.trackingCode}
      </h3>
      <p style={{ margin: '0 0 18px', fontSize: 13, color: '#64748b' }}>
        Pictures the customer attached when booking, plus the rider's delivery photo.
      </p>

      {photos.length === 0 ? (
        <div style={{ padding: 32, textAlign: 'center', border: '1px dashed #cbd5e1', borderRadius: 12, color: '#64748b', fontSize: 14, marginBottom: 18 }}>
          No photos attached to this order yet.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 18 }}>
          {photos.map(photo => (
            <a key={photo.key} href={photo.url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', background: '#f8fafc' }}>
              <img src={photo.url} alt={photo.label} style={{ width: '100%', height: 220, objectFit: 'cover', display: 'block' }} />
              <div style={{ padding: '8px 12px', fontSize: 13, fontWeight: 700, color: '#334155' }}>{photo.label}</div>
            </a>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        {canEdit ? (
          <>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="neutral-btn"
              style={{ padding: '10px 16px', borderRadius: 8, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 8, opacity: uploading ? 0.7 : 1 }}>
              <Upload size={16} /> {uploading ? 'Uploading…' : order.packageImageUrl ? 'Replace package photo' : 'Add package photo'}
            </button>
          </>
        ) : <span />}
        <button type="button" onClick={onClose} className="primary-green" style={{ padding: '10px 22px', borderRadius: 8, fontWeight: 700 }}>Done</button>
      </div>
    </Modal>
  );
}
