import { useState, useRef } from 'react';
import { Flag } from 'lucide-react';
import cpsLogo from '../assets/logo2.png';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';
import CustomSelect from './Form/CustomSelect';
import Modal from './Modal';
import type { Shipment } from '../types/models';

interface OrderPrintModalProps {
  onClose: () => void;
  shipment?: Shipment;
}

const PRIORITY_OPTIONS = [
  { value: 'Standard', label: 'Standard' },
  { value: 'High', label: 'High' },
];

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatFee(value: string | number | undefined | null): string {
  if (value === '' || value === undefined || value === null) return '0.00';
  const num = Number(value);
  if (isNaN(num)) return String(value);
  return num.toFixed(2);
}

function formDataFromShipment(shipment: Shipment) {
  return {
    senderName: shipment.senderName,
    senderNumber: shipment.senderNumber,
    receiverName: shipment.receiverName,
    receiverNumber: shipment.receiverNumber,
    pickupLocation: shipment.pickupLocation,
    dropoffLocation: shipment.dropoffLocation,
    packageType: capitalize(shipment.packageType),
    priority: shipment.priority === 'high' ? 'High' : 'Standard',
    cost: formatFee(shipment.deliveryFee),
  };
}

export default function OrderPrintModal({ onClose, shipment }: OrderPrintModalProps) {
  const toast = useToast();
  const [mode, setMode] = useState<'fetch' | 'manual'>('fetch');
  const [orderId, setOrderId] = useState(shipment?.trackingCode ?? '');
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetchedCreatedAt, setFetchedCreatedAt] = useState<string | null>(shipment?.createdAt ?? null);
  const [formData, setFormData] = useState(
    shipment
      ? formDataFromShipment(shipment)
      : {
          senderName: '',
          senderNumber: '',
          receiverName: '',
          receiverNumber: '',
          pickupLocation: '',
          dropoffLocation: '',
          packageType: '',
          priority: 'Standard',
          cost: '',
        }
  );

  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (printRef.current) {
      window.print();
    }
  };

  const handleFetch = async () => {
    const trackingCode = orderId.trim();
    if (!trackingCode) return;

    setIsFetching(true);
    setFetchError(null);
    try {
      const response = await api.get<Shipment>(`/shipments/${encodeURIComponent(trackingCode)}`);
      const fetchedShipment = response.data;
      setOrderId(fetchedShipment.trackingCode);
      setFetchedCreatedAt(fetchedShipment.createdAt);
      setFormData(formDataFromShipment(fetchedShipment));
    } catch {
      const message = 'Order not found. Check the tracking code and try again.';
      setFetchError(message);
      setFetchedCreatedAt(null);
      toast.error(message);
    } finally {
      setIsFetching(false);
    }
  };

  return (
    <>
      <style>
        {`
          @media print {
            #root {
              display: none !important;
            }
            .no-print {
              display: none !important;
            }
            .modal-overlay {
              position: static !important;
              background: none !important;
              backdrop-filter: none !important;
              padding: 0 !important;
            }
            .modal-shell {
              position: static !important;
              overflow: visible !important;
              max-height: none !important;
              box-shadow: none !important;
            }
            .modal-preview {
              background: none !important;
              padding: 0 !important;
            }
            #printable-receipt {
              width: 80mm; /* standard thermal receipt width */
              box-shadow: none !important;
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

      <Modal onClose={onClose} maxWidth="800px" padding="0">
        <div className="modal-content-flex" style={{ width: '100%', display: 'flex', overflow: 'hidden', maxHeight: '90vh' }}>

          {/* Controls Section */}
          <div className="modal-controls no-print" style={{ flex: 1, padding: '24px', borderRight: '1px solid var(--border)', overflowY: 'auto' }}>
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ margin: 0 }}>Print Order Label</h2>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
              <button
                onClick={() => setMode('fetch')}
                style={{ flex: 1, padding: '8px', border: mode === 'fetch' ? '2px solid var(--green)' : '1px solid var(--border)', borderRadius: '8px', background: mode === 'fetch' ? 'var(--success-bg)' : '#fff' }}
              >
                Fetch Order ID
              </button>
              <button
                onClick={() => { setMode('manual'); setFetchedCreatedAt(null); setFetchError(null); }}
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
                    placeholder="e.g. CPS-2024-001"
                    style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}
                  />
                  <button onClick={handleFetch} disabled={isFetching} className="primary-green" style={{ padding: '0 16px', opacity: isFetching ? 0.7 : 1 }}>
                    {isFetching ? 'Fetching...' : 'Fetch'}
                  </button>
                </div>
                {fetchError && (
                  <div style={{ marginTop: '8px', color: '#991b1b', fontWeight: 600, fontSize: '13px' }}>{fetchError}</div>
                )}
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
                <CustomSelect
                  value={formData.priority}
                  onChange={v => setFormData({...formData, priority: v})}
                  options={PRIORITY_OPTIONS}
                  icon={<Flag size={17} />}
                />
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
                <div style={{ fontSize: '10px', marginTop: '4px' }}>{fetchedCreatedAt ? new Date(fetchedCreatedAt).toLocaleString() : new Date().toLocaleString()}</div>
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
                TOTAL: GHS {formatFee(formData.cost)}
              </div>

              <div style={{ textAlign: 'center', marginTop: '20px', borderTop: '1px dashed #000', paddingTop: '12px', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div style={{ fontWeight: 'bold', fontSize: '12px' }}>Thank you for using CPS!</div>
                <div>Visit our site and place your order <br/>www.cpsdeliverygh.com</div>
                <div>Call us at <br/>+233 53 458 3364</div>
              </div>
            </div>

          </div>

        </div>
      </Modal>
    </>
  );
}
