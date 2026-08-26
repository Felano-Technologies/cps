import { useState } from 'react';
import { Home, MapPin, Car, Wrench, PackageX } from 'lucide-react';
import Modal from './Modal';

interface ReportIssueModalProps {
  onClose: () => void;
  onSubmit: (reason: string) => void;
  stopAddress: string;
}

export default function ReportIssueModal({ onClose, onSubmit, stopAddress }: ReportIssueModalProps) {
  const [reason, setReason] = useState('');

  const issues = [
    { id: 'customer', icon: Home, label: 'Customer Not Home' },
    { id: 'address', icon: MapPin, label: 'Address Not Found' },
    { id: 'traffic', icon: Car, label: 'Severe Traffic / Delay' },
    { id: 'vehicle', icon: Wrench, label: 'Vehicle Breakdown' },
    { id: 'package', icon: PackageX, label: 'Package Damaged' },
  ];

  return (
    <Modal onClose={onClose} align="bottom" maxWidth="480px">
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
        <div style={{ width: '12px', height: '12px', background: '#ef4444', borderRadius: '50%' }} />
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>Report an Issue</h2>
      </div>

      <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '20px', lineHeight: 1.5 }}>
        Alert Operations. This will pause the delivery for <strong style={{ color: '#0f172a' }}>{stopAddress}</strong> and notify dispatch.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        {issues.map(iss => {
          const Icon = iss.icon;
          return (
            <button
              key={iss.id}
              onClick={() => setReason(iss.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '16px', width: '100%', padding: '16px',
                borderRadius: '16px', border: '2px solid',
                borderColor: reason === iss.id ? '#ef4444' : '#e2e8f0',
                background: reason === iss.id ? '#fef2f2' : '#fff',
                textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              <Icon size={22} color={reason === iss.id ? '#ef4444' : '#64748b'} />
              <div style={{ fontWeight: 700, fontSize: '16px', color: reason === iss.id ? '#991b1b' : '#334155' }}>{iss.label}</div>
            </button>
          );
        })}
      </div>

      <button
        onClick={() => onSubmit(reason)}
        disabled={!reason}
        style={{
          width: '100%', padding: '16px', borderRadius: '12px', border: 'none', fontWeight: 800, fontSize: '16px',
          background: reason ? '#ef4444' : '#f1f5f9',
          color: reason ? '#fff' : '#94a3b8',
          boxShadow: reason ? '0 8px 16px rgba(239, 68, 68, 0.2)' : 'none',
          cursor: reason ? 'pointer' : 'not-allowed',
          transition: 'all 0.2s'
        }}
      >
        Submit to Dispatch
      </button>
    </Modal>
  );
}
