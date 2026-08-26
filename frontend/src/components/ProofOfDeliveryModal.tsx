import { useState } from 'react';
import axios from 'axios';
import { PenLine, Camera, CheckCircle2 } from 'lucide-react';
import api from '../services/api';
import Modal from './Modal';
import SignaturePad from './SignaturePad';
import FileUpload from './Form/FileUpload';

interface ProofOfDeliveryModalProps {
  onClose: () => void;
  onSubmit: (method: 'signature' | 'photo', recipientName: string, signatureData: string | null, photoUrl: string | null) => void | Promise<void>;
  stopAddress: string;
}

function extractErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err) && typeof err.response?.data?.error === 'string') {
    return err.response.data.error;
  }
  return fallback;
}

export default function ProofOfDeliveryModal({ onClose, onSubmit, stopAddress }: ProofOfDeliveryModalProps) {
  const [method, setMethod] = useState<'signature' | 'photo'>('signature');
  const [name, setName] = useState('');
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    name.trim().length > 0 &&
    (method === 'signature' ? signatureData !== null : photoFile !== null) &&
    !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setError(null);
    setIsSubmitting(true);
    try {
      let photoUrl: string | null = null;
      if (method === 'photo' && photoFile) {
        const formData = new FormData();
        formData.append('photo', photoFile);
        const { data } = await api.post<{ url: string }>('/uploads', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        photoUrl = data.url;
      }
      await onSubmit(method, name, method === 'signature' ? signatureData : null, photoUrl);
    } catch (err) {
      const message = extractErrorMessage(err, 'Failed to upload delivery photo. Please try again.');
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal onClose={onClose} title="Proof of Delivery" align="bottom" maxWidth="480px">
      <style>{`
        .sig-pad { height: 180px; }
        .photo-pad { height: 260px; }
        @media (max-width: 480px) {
          .sig-pad { height: 120px; }
          .photo-pad { height: 160px; }
        }
      `}</style>

      <div style={{ fontSize: '14px', color: '#475569', marginBottom: '24px', background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        Waypoint: <strong style={{ color: '#078c35' }}>{stopAddress}</strong>
      </div>

      <div style={{ display: 'flex', gap: '8px', background: '#f1f5f9', padding: '8px', borderRadius: '16px', marginBottom: '24px', border: '1px solid #e2e8f0' }}>
        <button
          onClick={() => setMethod('signature')}
          disabled={isSubmitting}
          style={{
            flex: 1, padding: '12px', borderRadius: '12px', border: 'none', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: isSubmitting ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
            background: method === 'signature' ? '#ffffff' : 'transparent',
            color: method === 'signature' ? '#0f172a' : '#64748b',
            boxShadow: method === 'signature' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
            opacity: isSubmitting ? 0.6 : 1,
          }}
        >
          <PenLine size={18} />
          Signature
        </button>
        <button
          onClick={() => setMethod('photo')}
          disabled={isSubmitting}
          style={{
            flex: 1, padding: '12px', borderRadius: '12px', border: 'none', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: isSubmitting ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
            background: method === 'photo' ? '#ffffff' : 'transparent',
            color: method === 'photo' ? '#0f172a' : '#64748b',
            boxShadow: method === 'photo' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
            opacity: isSubmitting ? 0.6 : 1,
          }}
        >
          <Camera size={18} />
          Photo ID
        </button>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '8px', padding: '12px 16px', fontWeight: 600, fontSize: '14px', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <label style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', marginBottom: '8px', display: 'block' }}>Authorized Recipient</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          disabled={isSubmitting}
          placeholder="Enter recipient name"
          style={{ width: '100%', padding: '16px', borderRadius: '16px', background: '#f8fafc', border: '2px solid #e2e8f0', color: '#0f172a', fontSize: '16px', outline: 'none', transition: 'border 0.2s', boxSizing: 'border-box' }}
          onFocus={e => e.target.style.borderColor = '#078c35'}
          onBlur={e => e.target.style.borderColor = '#e2e8f0'}
        />
      </div>

      {method === 'signature' ? (
        <div>
          <label style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', marginBottom: '8px', display: 'block' }}>Digital Signature</label>
          <SignaturePad onChange={setSignatureData} height={180} />
        </div>
      ) : (
        <div>
          <label style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', marginBottom: '8px', display: 'block' }}>Delivery Photo</label>
          <FileUpload
            label="Take or Upload Photo"
            previews={photoPreview ? [photoPreview] : []}
            onFilesSelected={(files) => {
              setPhotoFile(files[0]);
              setPhotoPreview(URL.createObjectURL(files[0]));
            }}
            onRemove={() => {
              setPhotoFile(null);
              setPhotoPreview(null);
            }}
            icon={<Camera size={18} />}
          />
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        style={{
          width: '100%', background: '#078c35', color: '#fff',
          padding: '20px', borderRadius: '16px', border: 'none', fontWeight: 800, fontSize: '16px', marginTop: '32px',
          boxShadow: '0 8px 24px rgba(7, 140, 53, 0.25)', cursor: canSubmit ? 'pointer' : 'not-allowed',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
          opacity: canSubmit ? 1 : 0.6,
        }}
      >
        {isSubmitting ? (
          <>
            <span
              style={{
                width: 18, height: 18, borderRadius: '50%',
                border: '2.5px solid rgba(255,255,255,0.35)', borderTopColor: '#fff',
                animation: 'pod-spin 0.7s linear infinite', display: 'inline-block',
              }}
            />
            <style>{`@keyframes pod-spin { to { transform: rotate(360deg); } }`}</style>
            {method === 'photo' ? 'Uploading…' : 'Verifying…'}
          </>
        ) : (
          <>
            Verify &amp; Complete
            <CheckCircle2 size={20} />
          </>
        )}
      </button>
    </Modal>
  );
}
