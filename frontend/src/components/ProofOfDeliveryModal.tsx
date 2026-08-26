import { useState } from 'react';
import { PenLine, Camera, CheckCircle2 } from 'lucide-react';
import Modal from './Modal';

interface ProofOfDeliveryModalProps {
  onClose: () => void;
  onSubmit: (method: 'signature' | 'photo', recipientName: string) => void;
  stopAddress: string;
}

export default function ProofOfDeliveryModal({ onClose, onSubmit, stopAddress }: ProofOfDeliveryModalProps) {
  const [method, setMethod] = useState<'signature' | 'photo'>('signature');
  const [name, setName] = useState('');

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

      <div style={{ display: 'flex', gap: '8px', background: '#f1f5f9', padding: '8px', borderRadius: '16px', marginBottom: '32px', border: '1px solid #e2e8f0' }}>
        <button
          onClick={() => setMethod('signature')}
          style={{
            flex: 1, padding: '12px', borderRadius: '12px', border: 'none', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s',
            background: method === 'signature' ? '#ffffff' : 'transparent',
            color: method === 'signature' ? '#0f172a' : '#64748b',
            boxShadow: method === 'signature' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none'
          }}
        >
          <PenLine size={18} />
          Signature
        </button>
        <button
          onClick={() => setMethod('photo')}
          style={{
            flex: 1, padding: '12px', borderRadius: '12px', border: 'none', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s',
            background: method === 'photo' ? '#ffffff' : 'transparent',
            color: method === 'photo' ? '#0f172a' : '#64748b',
            boxShadow: method === 'photo' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none'
          }}
        >
          <Camera size={18} />
          Photo ID
        </button>
      </div>

      {method === 'signature' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', marginBottom: '8px', display: 'block' }}>Authorized Recipient</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Enter recipient name"
              style={{ width: '100%', padding: '16px', borderRadius: '16px', background: '#f8fafc', border: '2px solid #e2e8f0', color: '#0f172a', fontSize: '16px', outline: 'none', transition: 'border 0.2s' }}
              onFocus={e => e.target.style.borderColor = '#078c35'}
              onBlur={e => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', marginBottom: '8px', display: 'block' }}>Digital Signature</label>
            <div className="sig-pad" style={{ width: '100%', background: '#f8fafc', border: '2px dashed #cbd5e1', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
              <PenLine size={40} strokeWidth={1.5} />
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="photo-pad" style={{ width: '100%', background: '#f8fafc', border: '2px dashed #cbd5e1', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', color: '#64748b', cursor: 'pointer' }}>
            <Camera size={48} strokeWidth={1.5} />
            <span style={{ fontWeight: 600, letterSpacing: '0.02em', color: '#475569' }}>Initialize Camera</span>
          </div>
        </div>
      )}

      <button
        onClick={() => onSubmit(method, name)}
        style={{
          width: '100%', background: '#078c35', color: '#fff',
          padding: '20px', borderRadius: '16px', border: 'none', fontWeight: 800, fontSize: '16px', marginTop: '32px',
          boxShadow: '0 8px 24px rgba(7, 140, 53, 0.25)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px'
        }}
      >
        Verify &amp; Complete
        <CheckCircle2 size={20} />
      </button>
    </Modal>
  );
}
