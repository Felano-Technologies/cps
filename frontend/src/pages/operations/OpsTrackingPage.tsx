import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Share2, Printer, MapPin as MapPinIcon, Package, CheckCircle2, User, RefreshCw } from 'lucide-react';
import OrderPrintModal from '../../components/OrderPrintModal';
import CustomSelect from '../../components/Form/CustomSelect';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import type { Shipment, ShipmentStatus, RiderProfile } from '../../types/models';

const STATUS_LABELS: Record<ShipmentStatus, string> = {
  awaiting_price: 'Awaiting Price',
  pending: 'Pending',
  picked_up: 'Picked Up',
  in_transit: 'In Transit',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  delayed: 'Delayed',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

const STATUS_OPTIONS = (Object.keys(STATUS_LABELS) as ShipmentStatus[]).map(s => ({ value: s, label: STATUS_LABELS[s] }));

function extractErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err) && typeof err.response?.data?.error === 'string') {
    return err.response.data.error;
  }
  return err instanceof Error ? err.message : fallback;
}

export default function OpsTrackingPage() {
  const { parcelId } = useParams();
  const toast = useToast();
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [riders, setRiders] = useState<RiderProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [newPrice, setNewPrice] = useState('');
  
  const [processFee, setProcessFee] = useState('');
  const [processRiderId, setProcessRiderId] = useState('');
  const [processRemarks, setProcessRemarks] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (shipment?.status === 'awaiting_price') {
      setProcessFee(String(shipment.deliveryFee));
    }
  }, [shipment]);

  useEffect(() => {
    if (!parcelId) return;
    const load = async () => {
      setIsLoading(true);
      try {
        const [shipmentRes, ridersRes] = await Promise.all([
          api.get<Shipment>(`/shipments/${parcelId}`),
          api.get<RiderProfile[]>('/riders'),
        ]);
        setShipment(shipmentRes.data);
        setRiders(ridersRes.data);
      } catch (err) {
        setError(extractErrorMessage(err, 'Shipment not found.'));
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [parcelId]);

  const riderOptions = useMemo(() => [
    { value: '', label: 'Unassigned' },
    ...riders.map(r => ({ value: r.id, label: r.user.name })),
  ], [riders]);

  const handleAssignRider = async (riderId: string) => {
    if (!shipment || !riderId) return;
    try {
      const { data } = await api.patch<Shipment>(`/shipments/${shipment.id}/assign`, { riderId });
      setShipment(data);
      toast.success('Rider assigned.');
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to assign rider.'));
    }
  };

  const handleStatusChange = async (status: string) => {
    if (!shipment) return;
    try {
      const { data } = await api.patch<Shipment>(`/shipments/${shipment.id}/status`, { status });
      setShipment(data);
      toast.success('Status updated.');
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to update status.'));
    }
  };

  const handlePriceUpdate = async () => {
    if (!shipment || !newPrice) return;
    try {
      const { data } = await api.patch<Shipment>(`/shipments/${shipment.id}/price`, { deliveryFee: Number(newPrice) });
      setShipment(data);
      setIsEditingPrice(false);
      setNewPrice('');
      toast.success('Price updated and customer notified.');
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to update price.'));
    }
  };

  const handleProcessOrder = async () => {
    if (!shipment || !processFee) return;
    setIsProcessing(true);
    try {
      const { data } = await api.patch<Shipment>(`/shipments/${shipment.id}/process`, {
        deliveryFee: Number(processFee),
        riderId: processRiderId || undefined,
        opsRemarks: processRemarks || undefined,
      });
      setShipment(data);
      toast.success('Order processed and moved to active queue.');
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to process order.'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleShareLink = () => {
    navigator.clipboard.writeText(window.location.href).then(
      () => toast.success('Tracking link copied.'),
      () => toast.error('Failed to copy link.')
    );
  };

  if (isLoading) {
    return <div className="page-shell light-shell"><main className="container" style={{ padding: '48px' }}>Loading tracking data…</main></div>;
  }

  if (error || !shipment) {
    return (
      <div className="page-shell light-shell">
        <main className="container" style={{ padding: '48px', textAlign: 'center' }}>
          <p style={{ color: '#991b1b', fontWeight: 700, marginBottom: '16px' }}>{error ?? 'Shipment not found.'}</p>
          <Link to="/ops-board" className="primary-green" style={{ display: 'inline-block', padding: '10px 24px', borderRadius: '10px', textDecoration: 'none' }}>Back to Ops Board</Link>
        </main>
      </div>
    );
  }

  return (
    <div className="page-shell light-shell">
      <style>{`
        .glass-card {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.8);
          box-shadow: 0 8px 32px rgba(15, 23, 42, 0.05);
          border-radius: 16px;
        }
        .tracking-main-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
          align-items: start;
        }
        .details-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr));
          gap: 24px;
        }
        .header-actions { display: flex; gap: 12px; flex-wrap: wrap; }
        .header-actions .custom-select { min-width: 180px; }
        .timeline-container { position: relative; padding-left: 32px; }
        .timeline-line { position: absolute; left: 11px; top: 8px; bottom: 0; width: 2px; background: #e2e8f0; z-index: 0; }
        .timeline-item { position: relative; z-index: 1; margin-bottom: 32px; }
        .timeline-item:last-child { margin-bottom: 0; }
        .timeline-dot {
          position: absolute; left: -32px; top: 4px; width: 24px; height: 24px; border-radius: 50%;
          background: #078c35; border: 2px solid #078c35; color: #fff;
          display: flex; align-items: center; justify-content: center;
        }
        @media (max-width: 1024px) {
          .tracking-main-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 768px) {
          .tracking-page-content { padding: 16px !important; }
          .header-actions { flex-direction: column; width: 100%; }
          .header-actions > * { width: 100%; }
        }
      `}</style>

      <main className="container tracking-page-content" style={{ padding: '32px 24px', maxWidth: '1400px', marginBottom: '80px' }}>

        <div style={{ marginBottom: '24px', fontSize: '14px', fontWeight: 500 }}>
          <Link to="/ops-board" style={{ color: '#64748b', textDecoration: 'none' }}>Operations Board</Link>
          <span style={{ margin: '0 12px', color: '#cbd5e1' }}>/</span>
          <span style={{ color: '#0f172a', fontWeight: 700 }}>Parcel Tracking</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', marginBottom: '8px', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '12px' }}>
              Tracking Details
              <span style={{ fontSize: '14px', background: '#dcfce7', color: '#166534', padding: '6px 12px', borderRadius: '20px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                {STATUS_LABELS[shipment.status]}
              </span>
            </h1>
            <div style={{ fontSize: '16px', color: '#64748b', fontFamily: 'monospace', fontWeight: 600, background: '#f1f5f9', display: 'inline-block', padding: '4px 12px', borderRadius: '8px' }}>
              ID: {shipment.trackingCode}
            </div>
          </div>

          <div className="header-actions">
            <CustomSelect
              value=""
              onChange={handleAssignRider}
              options={riderOptions.filter(r => r.value !== '')}
              icon={<User size={17} />}
            />
            <CustomSelect
              value=""
              onChange={handleStatusChange}
              options={STATUS_OPTIONS}
              icon={<RefreshCw size={17} />}
            />
            <button className="neutral-btn" onClick={handleShareLink} style={{ padding: '10px 20px', borderRadius: '10px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Share2 size={16} /> Share Link
            </button>
            <button
              className="primary-green"
              style={{ padding: '10px 20px', borderRadius: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}
              onClick={() => setIsPrintModalOpen(true)}
            >
              <Printer size={16} /> Print Label
            </button>
          </div>
        </div>

        {shipment.status === 'awaiting_price' && (
          <div className="glass-card" style={{ padding: '32px', marginBottom: '24px', background: '#fffbeb', border: '1px solid #fde68a', borderLeft: '4px solid #f59e0b' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#92400e', marginBottom: '16px' }}>Process New Order</h3>
            <p style={{ color: '#b45309', marginBottom: '24px', fontSize: '15px' }}>
              Assign a final price and rider to move this order to the active queue.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#92400e', marginBottom: '6px' }}>Final Delivery Fee (GHS) *</label>
                <input 
                  type="number" 
                  value={processFee} 
                  onChange={(e) => setProcessFee(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #fcd34d', fontSize: '14px', background: '#fff', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#92400e', marginBottom: '6px' }}>Assign Rider</label>
                <CustomSelect
                  value={processRiderId}
                  onChange={setProcessRiderId}
                  options={riderOptions}
                  icon={<User size={16} />}
                />
              </div>
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#92400e', marginBottom: '6px' }}>Operations Remarks (Internal)</label>
              <textarea 
                value={processRemarks} 
                onChange={(e) => setProcessRemarks(e.target.value)}
                rows={3}
                placeholder="Add any internal notes..."
                style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid #fcd34d', fontSize: '14px', background: '#fff', fontFamily: 'inherit', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                onClick={handleProcessOrder}
                disabled={isProcessing || !processFee}
                className="primary-green"
                style={{ padding: '12px 24px', borderRadius: '10px', fontWeight: 700, fontSize: '15px', opacity: (isProcessing || !processFee) ? 0.7 : 1 }}
              >
                {isProcessing ? 'Processing...' : 'Process & Confirm Order'}
              </button>
            </div>
          </div>
        )}

        <div className="tracking-main-grid" style={{ marginBottom: '24px' }}>

          <div className="glass-card" style={{ padding: '32px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginBottom: '32px' }}>Tracking History</h3>
            <div className="timeline-container">
              <div className="timeline-line" />
              {(shipment.statusEvents ?? []).length === 0 ? (
                <p style={{ color: '#94a3b8', fontWeight: 600 }}>No status history yet.</p>
              ) : (
                [...(shipment.statusEvents ?? [])].reverse().map(evt => (
                  <div key={evt.id} className="timeline-item">
                    <div className="timeline-dot">
                      <CheckCircle2 size={12} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
                        <strong style={{ fontSize: '16px', color: '#0f172a' }}>{STATUS_LABELS[evt.status]}</strong>
                        <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 600 }}>{new Date(evt.createdAt).toLocaleString()}</span>
                      </div>
                      {evt.note && <div style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.5 }}>{evt.note}</div>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="details-grid">
          <div className="glass-card" style={{ padding: '32px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MapPinIcon size={20} /> Route Details
            </h3>
            <div style={{ position: 'relative', paddingLeft: '24px' }}>
              <div style={{ position: 'absolute', left: '5px', top: '6px', bottom: '6px', width: '2px', background: '#e2e8f0', zIndex: 0 }} />
              <div style={{ position: 'relative', zIndex: 1, marginBottom: '24px' }}>
                <div style={{ position: 'absolute', left: '-24px', top: '4px', width: '12px', height: '12px', background: '#0f172a', borderRadius: '50%' }} />
                <div style={{ fontSize: '13px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Pickup</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>{shipment.pickupLocation}</div>
                <div style={{ fontSize: '14px', color: '#64748b', marginTop: '2px' }}>{shipment.pickupRegion}</div>
              </div>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ position: 'absolute', left: '-24px', top: '4px', width: '12px', height: '12px', background: '#078c35', borderRadius: '50%', boxShadow: '0 0 0 3px #dcfce7' }} />
                <div style={{ fontSize: '13px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Dropoff</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>{shipment.dropoffLocation}</div>
                <div style={{ fontSize: '14px', color: '#64748b', marginTop: '2px' }}>{shipment.dropoffRegion}</div>
              </div>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '32px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Package size={20} /> Delivery Specs
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#64748b', fontWeight: 500 }}>Package Type</span>
                <strong style={{ color: '#0f172a', textTransform: 'capitalize' }}>{shipment.packageType}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#64748b', fontWeight: 500 }}>Priority</span>
                <strong style={{ color: '#0f172a', textTransform: 'capitalize' }}>{shipment.priority}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#64748b', fontWeight: 500 }}>Assigned Rider</span>
                <strong style={{ color: '#0f172a' }}>{shipment.assignedRider?.user.name ?? 'Unassigned'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#64748b', fontWeight: 500 }}>Delivery Fee</span>
                {isEditingPrice ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>GHS</span>
                    <input 
                      type="number" 
                      value={newPrice} 
                      onChange={(e) => setNewPrice(e.target.value)}
                      style={{ width: '80px', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    />
                    <button onClick={handlePriceUpdate} className="primary-green" style={{ padding: '6px 12px', minHeight: 'auto', borderRadius: '6px' }}>Save</button>
                    <button onClick={() => setIsEditingPrice(false)} className="neutral-btn" style={{ padding: '6px 12px', minHeight: 'auto', borderRadius: '6px' }}>Cancel</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <strong style={{ color: '#0f172a' }}>GHS {Number(shipment.deliveryFee).toFixed(2)}</strong>
                    <button onClick={() => { setIsEditingPrice(true); setNewPrice(String(shipment.deliveryFee)); }} style={{ background: 'transparent', border: 'none', color: '#078c35', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>Edit</button>
                  </div>
                )}
              </div>

              {shipment.podMethod && (
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginTop: '8px', padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  {shipment.podPhotoUrl ? (
                    <img
                      src={shipment.podPhotoUrl}
                      alt="Proof of delivery"
                      style={{ width: '48px', height: '48px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0, border: '1px solid #e2e8f0' }}
                    />
                  ) : (
                    <div style={{ width: '40px', height: '40px', background: '#dcfce7', color: '#166534', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <CheckCircle2 size={20} />
                    </div>
                  )}
                  <div>
                    <strong style={{ display: 'block', color: '#0f172a', fontSize: '15px' }}>Proof of Delivery ({shipment.podMethod})</strong>
                    <div style={{ color: '#64748b', fontSize: '13px', marginTop: '2px' }}>Received by {shipment.podRecipientName ?? 'recipient'}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {isPrintModalOpen && <OrderPrintModal onClose={() => setIsPrintModalOpen(false)} />}
    </div>
  );
}
