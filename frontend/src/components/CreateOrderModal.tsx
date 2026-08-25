import { useState, useEffect } from 'react';

interface CreateOrderModalProps {
  onClose: () => void;
  onCreate: () => void;
}

export default function CreateOrderModal({ onClose, onCreate }: CreateOrderModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate network request
    setTimeout(() => {
      setIsSubmitting(false);
      onCreate();
    }, 800);
  };

  return (
    <div 
      className="modal-overlay" 
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)',
        backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: '16px'
      }}
    >
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '600px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh'
        }}
      >
        <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>Create New Order</h2>
            <div style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>Manually dispatch a package for delivery.</div>
          </div>
          <button 
            onClick={onClose} 
            style={{ background: 'none', border: 'none', fontSize: '24px', color: '#94a3b8', cursor: 'pointer' }}
          >
            &times;
          </button>
        </div>

        <div style={{ padding: '24px', overflowY: 'auto' }}>
          <form id="create-order-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Sender & Receiver Section */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: 0, fontSize: '15px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', background: '#0f172a', borderRadius: '50%' }} />
                  Pickup Details
                </h4>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>Sender Name</label>
                  <input type="text" required placeholder="John Doe" style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>Pickup Address</label>
                  <input type="text" required placeholder="124 Spintex Road" style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: '#f0fdf4', padding: '16px', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                <h4 style={{ margin: 0, fontSize: '15px', color: '#166534', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', background: '#166534', borderRadius: '50%' }} />
                  Delivery Details
                </h4>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#166534', marginBottom: '6px' }}>Recipient Name</label>
                  <input type="text" required placeholder="Jane Smith" style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #86efac', fontSize: '14px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#166534', marginBottom: '6px' }}>Delivery Address</label>
                  <input type="text" required placeholder="KNUST Campus" style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #86efac', fontSize: '14px' }} />
                </div>
              </div>
            </div>

            {/* Specs Section */}
            <div>
              <h4 style={{ margin: '0 0 16px 0', fontSize: '15px', color: '#0f172a' }}>Package Specs</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>Item Type</label>
                  <select required style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', background: '#fff' }}>
                    <option value="" disabled selected>Select type...</option>
                    <option value="document">Document</option>
                    <option value="small-parcel">Small Parcel</option>
                    <option value="large-box">Large Box</option>
                    <option value="fragile">Fragile</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>Priority</label>
                  <select required style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', background: '#fff' }}>
                    <option value="standard">Standard</option>
                    <option value="same-day">Same Day</option>
                    <option value="express">Express</option>
                  </select>
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
    </div>
  );
}
