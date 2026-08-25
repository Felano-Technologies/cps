import { useState } from 'react';

interface ProofOfDeliveryModalProps {
  onClose: () => void;
  onSubmit: () => void;
  stopAddress: string;
}

export default function ProofOfDeliveryModal({ onClose, onSubmit, stopAddress }: ProofOfDeliveryModalProps) {
  const [method, setMethod] = useState<'signature' | 'photo'>('signature');
  const [name, setName] = useState('');
  
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div className="pod-modal-content" style={{ background: '#ffffff', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto', border: '1px solid #e2e8f0', animation: 'slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: '0 -10px 40px rgba(15, 23, 42, 0.15)', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
        <style>{`
          @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
          .pod-modal-content { padding: 32px; border-radius: 32px; }
          .sig-pad { height: 180px; }
          .photo-pad { height: 260px; }
          @media (max-width: 480px) {
            .pod-modal-content { padding: 20px; border-radius: 24px; }
            .sig-pad { height: 120px; }
            .photo-pad { height: 160px; }
          }
        `}</style>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>Proof of Delivery</h2>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', cursor: 'pointer', transition: 'background 0.2s' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        
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
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
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
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
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
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="photo-pad" style={{ width: '100%', background: '#f8fafc', border: '2px dashed #cbd5e1', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', color: '#64748b', cursor: 'pointer' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 8v8"></path><path d="M8 12h8"></path></svg>
              <span style={{ fontWeight: 600, letterSpacing: '0.02em', color: '#475569' }}>Initialize Camera</span>
            </div>
          </div>
        )}

        <button 
          onClick={onSubmit}
          style={{ 
            width: '100%', background: '#078c35', color: '#fff', 
            padding: '20px', borderRadius: '16px', border: 'none', fontWeight: 800, fontSize: '16px', marginTop: '32px', 
            boxShadow: '0 8px 24px rgba(7, 140, 53, 0.25)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px'
          }}
        >
          Verify & Complete
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </button>

      </div>
    </div>
  );
}
