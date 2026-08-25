import { useState, useRef } from 'react';
import cpsLogo from '../assets/logo2.png';

interface OrderPrintModalProps {
  onClose: () => void;
}

export default function OrderPrintModal({ onClose }: OrderPrintModalProps) {
  const [mode, setMode] = useState<'fetch' | 'manual'>('fetch');
  const [orderId, setOrderId] = useState('');
  const [formData, setFormData] = useState({
    senderName: '',
    senderNumber: '',
    receiverName: '',
    receiverNumber: '',
    pickupLocation: '',
    dropoffLocation: '',
    packageType: '',
    priority: 'Standard',
    cost: '',
  });

  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (printRef.current) {
      window.print();
    }
  };

  const handleFetch = () => {
    // Mock fetch for demonstration
    if (orderId.trim()) {
      setFormData({
        senderName: 'John Doe',
        senderNumber: '0241234567',
        receiverName: 'Jane Smith',
        receiverNumber: '0559876543',
        pickupLocation: 'KNUST, Ayeduase Gate',
        dropoffLocation: 'Adum, Kumasi',
        packageType: 'Electronics',
        priority: 'Express',
        cost: '35',
      });
    }
  };

  return (
    <>
      <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }
            #printable-receipt, #printable-receipt * {
              visibility: visible;
            }
            #printable-receipt {
              position: absolute;
              left: 0;
              top: 0;
              width: 80mm; /* standard thermal receipt width */
              padding: 5mm;
              font-family: monospace;
              font-size: 12px;
              color: #000;
              background: #fff;
            }
            .no-print {
              display: none !important;
            }
          }
          @media (max-width: 768px) {
            .modal-content-flex {
              flex-direction: column !important;
              overflow-y: auto !important;
              max-height: 95vh !important;
            }
            .modal-controls, .modal-preview {
              flex: none !important;
              overflow-y: visible !important;
              height: auto !important;
            }
            .modal-controls {
              border-right: none !important;
              border-bottom: 1px solid var(--border);
            }
          }
        `}
      </style>

      <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="modal-content modal-content-flex" style={{ background: '#fff', borderRadius: '12px', width: '90%', maxWidth: '800px', display: 'flex', overflow: 'hidden', maxHeight: '90vh' }}>
          
          {/* Controls Section */}
          <div className="modal-controls no-print" style={{ flex: 1, padding: '24px', borderRight: '1px solid var(--border)', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2>Print Order Label</h2>
              <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
              <button 
                onClick={() => setMode('fetch')}
                style={{ flex: 1, padding: '8px', border: mode === 'fetch' ? '2px solid var(--green)' : '1px solid var(--border)', borderRadius: '8px', background: mode === 'fetch' ? 'var(--success-bg)' : '#fff' }}
              >
                Fetch Order ID
              </button>
              <button 
                onClick={() => setMode('manual')}
                style={{ flex: 1, padding: '8px', border: mode === 'manual' ? '2px solid var(--green)' : '1px solid var(--border)', borderRadius: '8px', background: mode === 'manual' ? 'var(--success-bg)' : '#fff' }}
              >
                Manual Entry
              </button>
            </div>

            {mode === 'fetch' && (
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Order ID</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    value={orderId} 
                    onChange={e => setOrderId(e.target.value)} 
                    placeholder="e.g. ORD-8924" 
                    style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}
                  />
                  <button onClick={handleFetch} className="primary-green" style={{ padding: '0 16px' }}>Fetch</button>
                </div>
              </div>
            )}

            {mode === 'manual' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                <input placeholder="Sender Name" value={formData.senderName} onChange={e => setFormData({...formData, senderName: e.target.value})} />
                <input placeholder="Sender Number" value={formData.senderNumber} onChange={e => setFormData({...formData, senderNumber: e.target.value})} />
                <input placeholder="Pickup Location" value={formData.pickupLocation} onChange={e => setFormData({...formData, pickupLocation: e.target.value})} />
                <input placeholder="Receiver Name" value={formData.receiverName} onChange={e => setFormData({...formData, receiverName: e.target.value})} />
                <input placeholder="Receiver Number" value={formData.receiverNumber} onChange={e => setFormData({...formData, receiverNumber: e.target.value})} />
                <input placeholder="Dropoff Location" value={formData.dropoffLocation} onChange={e => setFormData({...formData, dropoffLocation: e.target.value})} />
                <input placeholder="Package Type" value={formData.packageType} onChange={e => setFormData({...formData, packageType: e.target.value})} />
                <select 
                  value={formData.priority} 
                  onChange={e => setFormData({...formData, priority: e.target.value})}
                  style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }}
                >
                  <option value="Standard">Standard</option>
                  <option value="Same Day">Same Day</option>
                  <option value="Express">Express</option>
                </select>
                <input placeholder="Cost (GHS)" value={formData.cost} onChange={e => setFormData({...formData, cost: e.target.value})} />
              </div>
            )}

            <button onClick={handlePrint} className="primary-green wide-btn" style={{ padding: '16px', fontSize: '1.1rem' }}>Print Receipt</button>
          </div>

          {/* Preview Section */}
          <div className="modal-preview" style={{ flex: 1, padding: '24px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', overflowY: 'auto' }}>
            
            {/* The actual printable area */}
            <div 
              id="printable-receipt" 
              ref={printRef}
              style={{ 
                width: '80mm', 
                background: '#fff', 
                padding: '16px', 
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                fontFamily: 'monospace',
                fontSize: '12px',
                color: '#000'
              }}
            >
              <div style={{ textAlign: 'center', marginBottom: '16px', borderBottom: '1px dashed #000', paddingBottom: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <img src={cpsLogo} alt="CPS Delivery Services" style={{ width: '120px', height: 'auto', marginBottom: '2px' }} />
                <h3 style={{ margin: '0 0 4px 0', fontSize: '16px' }}>CPS Delivery Services</h3>
                <div style={{ fontWeight: 600 }}>Order Receipt</div>
                <div style={{ fontSize: '10px', marginTop: '4px' }}>{new Date().toLocaleString()}</div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <strong>ORDER ID:</strong> {mode === 'fetch' && orderId ? orderId : 'MANUAL-ENTRY'}
              </div>

              <div style={{ borderBottom: '1px dashed #000', paddingBottom: '12px', marginBottom: '12px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>SENDER:</div>
                <div>{formData.senderName || 'N/A'}</div>
                <div>{formData.senderNumber || 'N/A'}</div>
                <div>Pickup: {formData.pickupLocation || 'N/A'}</div>
              </div>

              <div style={{ borderBottom: '1px dashed #000', paddingBottom: '12px', marginBottom: '12px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>RECEIVER:</div>
                <div>{formData.receiverName || 'N/A'}</div>
                <div>{formData.receiverNumber || 'N/A'}</div>
                <div>Dropoff: {formData.dropoffLocation || 'N/A'}</div>
              </div>

              <div style={{ borderBottom: '1px dashed #000', paddingBottom: '12px', marginBottom: '12px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>PACKAGE DETAILS:</div>
                <div>Type: {formData.packageType || 'N/A'}</div>
                <div>Priority: {formData.priority || 'N/A'}</div>
              </div>

              <div style={{ textAlign: 'center', fontSize: '14px', fontWeight: 'bold', marginTop: '16px' }}>
                TOTAL: GHS {formData.cost || '0.00'}
              </div>

              <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '10px' }}>
                Thank you for using CPS!
              </div>
            </div>

          </div>

        </div>
      </div>
    </>
  );
}
