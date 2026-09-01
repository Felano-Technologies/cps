import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Clock,
  PackageCheck,
  Truck,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Ban,
  MapPin,
  Boxes,
  Bike,
  Package,
  AlertCircle,
  Banknote,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import api from '../../services/api';
import Map from '../../components/Map';
import EmptyState from '../../components/EmptyState';
import { Skeleton, SkeletonCircle } from '../../components/Skeleton';
import CancelShipmentModal from '../../components/CancelShipmentModal';
import { useToast } from '../../contexts/ToastContext';
import type { Shipment, ShipmentStatus, ShipmentSpeed, VehicleType } from '../../types/models';

const VEHICLE_LABELS: Record<VehicleType, string> = {
  motorbike: 'Motorbike',
  van: 'Van',
  truck: 'Truck',
};

const VEHICLE_ICONS: Record<VehicleType, LucideIcon> = {
  motorbike: Bike,
  van: Package,
  truck: Truck,
};

const SPEED_LABELS: Record<ShipmentSpeed, string> = {
  same_day: 'Same Day',
  next_day: 'Next Day',
  express: 'Express',
};

const STATUS_EVENT_LABELS: Record<ShipmentStatus, string> = {
  awaiting_price: 'Awaiting Price Confirmation',
  pending: 'Order Placed',
  picked_up: 'Package Picked Up',
  in_transit: 'In Transit',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  delayed: 'Delayed',
  failed: 'Delivery Failed',
  cancelled: 'Cancelled',
};

const STATUS_EVENT_DESCRIPTIONS: Record<ShipmentStatus, string> = {
  awaiting_price: 'Your order is awaiting price confirmation from operations.',
  pending: 'Your order has been placed and is awaiting pickup.',
  picked_up: 'Item collected from the sender.',
  in_transit: 'Your package is on its way.',
  out_for_delivery: 'Package has been dispatched from the hub.',
  delivered: 'Package delivered successfully.',
  delayed: 'This delivery has been delayed.',
  failed: 'The delivery attempt was unsuccessful.',
  cancelled: 'This shipment was cancelled.',
};

const STATUS_ICONS: Record<ShipmentStatus, LucideIcon> = {
  awaiting_price: AlertCircle,
  pending: Clock,
  picked_up: PackageCheck,
  in_transit: Truck,
  out_for_delivery: Navigation,
  delivered: CheckCircle2,
  delayed: AlertTriangle,
  failed: XCircle,
  cancelled: Ban,
};

function extractErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err) && typeof err.response?.data?.error === 'string') {
    return err.response.data.error;
  }
  return err instanceof Error ? err.message : fallback;
}

function formatEventTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function mapCaption(status: ShipmentStatus): string {
  switch (status) {
    case 'delivered': return 'Package delivered';
    case 'cancelled': return 'Shipment cancelled';
    case 'failed': return 'Delivery attempt failed';
    case 'pending': return 'Awaiting pickup';
    default: return 'In transit';
  }
}

export default function CustomerTrackingPage() {
  const { parcelId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    if (!parcelId) {
      setIsLoading(false);
      setError('No shipment ID was provided.');
      return;
    }

    async function fetchShipment() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await api.get<Shipment>(`/shipments/${parcelId}`);
        if (isMounted) {
          setShipment(response.data);
        }
      } catch (err) {
        if (isMounted) {
          setShipment(null);
          if (axios.isAxiosError(err) && err.response?.status === 404) {
            setError("We couldn't find a shipment with that tracking code.");
          } else {
            setError(extractErrorMessage(err, 'Failed to load tracking details. Please try again later.'));
            toast.error('Failed to load tracking information.');
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchShipment();

    return () => {
      isMounted = false;
    };
  }, [parcelId]);

  if (isLoading) {
    return (
      <div className="page-shell light-shell">
        <main className="container" style={{ paddingTop: '48px', paddingBottom: '120px', maxWidth: '1100px', margin: '0 auto' }}>
          <div className="tracking-header-row">
            <div>
              <Skeleton height="0.8em" width="140px" style={{ marginBottom: 10 }} />
              <Skeleton height="2rem" width="240px" />
            </div>
            <Skeleton height="2.5em" width="120px" radius="var(--radius-sm)" />
          </div>
          <div className="tracking-content" style={{ marginTop: 24 }}>
            <div className="map-card">
              <Skeleton height={280} radius="var(--radius-lg)" />
            </div>
            <div className="history-panel">
              <Skeleton height="1.2em" width="50%" style={{ marginBottom: 16 }} />
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="history-item">
                  <SkeletonCircle size={30} />
                  <div style={{ flex: 1 }}>
                    <Skeleton height="0.85em" width="60%" style={{ marginBottom: 6 }} />
                    <Skeleton height="0.75em" width="40%" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !shipment) {
    return (
      <div className="page-shell light-shell">
        <main className="container" style={{ paddingTop: '48px', paddingBottom: '120px', maxWidth: '1100px', margin: '0 auto' }}>
          <EmptyState
            icon={<AlertCircle size={36} />}
            title="Shipment Not Found"
            message={error || "We couldn't find that shipment."}
            actionLabel="Back to Shipments"
            onAction={() => navigate('/shipments')}
          />
        </main>
      </div>
    );
  }

  const statusEvents = shipment.statusEvents ?? [];
  const CaptionIcon = STATUS_ICONS[shipment.status] ?? Navigation;
  const ServiceIcon = VEHICLE_ICONS[shipment.vehicleType] ?? Truck;

  return (
    <div className="page-shell light-shell">
      <main className="container" style={{ paddingTop: '48px', paddingBottom: '120px', maxWidth: '1100px', margin: '0 auto' }}>
        <style>{`
          @media (max-width: 768px) {
            .tracking-grid { grid-template-columns: 1fr !important; gap: 20px !important; }
            .tracking-h1 { font-size: 24px !important; }
            .tracking-map-card { height: 200px !important; }
            .tracking-details-card,
            .tracking-timeline-card { padding: 20px !important; }
            .tracking-service-row { flex-wrap: wrap !important; gap: 12px !important; }
            .tracking-timeline-item { gap: 14px !important; }
          }
        `}</style>

        {/* Header Section */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 className="tracking-h1" style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', marginBottom: '8px', letterSpacing: '-0.02em' }}>
              Tracking Details
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '15px', color: '#64748b', fontWeight: 500 }}>Shipment ID:</span>
                <span style={{
                  background: '#e2e8f0', color: '#0f172a', padding: '4px 10px',
                  borderRadius: '6px', fontWeight: 700, fontSize: '14px', letterSpacing: '0.05em'
                }}>
                  {shipment.trackingCode}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '15px', color: '#64748b', fontWeight: 500 }}>Accepted Price:</span>
                {shipment.status === 'awaiting_price' ? (
                  <span style={{
                    background: '#fef3c7', color: '#b45309', padding: '4px 10px',
                    borderRadius: '6px', fontWeight: 700, fontSize: '14px'
                  }}>
                    Awaiting Price
                  </span>
                ) : (
                  <span style={{
                    background: '#e0f3cb', color: '#078c35', padding: '4px 10px',
                    borderRadius: '6px', fontWeight: 800, fontSize: '14px'
                  }}>
                    GHS {Number(shipment.deliveryFee).toFixed(2)}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {(shipment.status === 'awaiting_price' || shipment.status === 'pending') && (
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 18px',
                  fontSize: '14px',
                  borderRadius: '10px',
                  backgroundColor: '#fee2e2',
                  color: '#dc2626',
                  border: '1px solid #fca5a5',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#fca5a5';
                  e.currentTarget.style.color = '#991b1b';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#fee2e2';
                  e.currentTarget.style.color = '#dc2626';
                }}
              >
                <Ban size={15} />
                Cancel Order
              </button>
            )}
            <button
              onClick={() => navigate('/shipments')}
              className="neutral-btn"
              style={{ padding: '10px 20px', fontSize: '14px', borderRadius: '10px' }}
            >
              ← Back to Shipments
            </button>
          </div>
        </div>

        {/* Two-Column Grid */}
        <div className="tracking-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
          gap: '32px',
          alignItems: 'start'
        }}>

          {/* LEFT COLUMN: Map & Shipment Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* Live Map */}
            <div className="card-style tracking-map-card" style={{ padding: '0', overflow: 'hidden', height: '240px', position: 'relative' }}>
              <Map
                className="tracking-map-surface"
                markers={[
                  { label: 'Pickup', address: `${shipment.pickupLocation}, ${shipment.pickupRegion}, Ghana` },
                  { label: 'Dropoff', address: `${shipment.dropoffLocation}, ${shipment.dropoffRegion}, Ghana` },
                ]}
                showRoute
              />
              <div style={{ position: 'absolute', bottom: '12px', left: '12px', zIndex: 500, display: 'flex', alignItems: 'center', gap: '6px', background: '#ffffff', padding: '8px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 600, color: '#0f172a', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                <CaptionIcon size={14} color="#078c35" />
                {mapCaption(shipment.status)}
              </div>
            </div>

            {/* Shipment Details Card */}
            <div className="card-style tracking-details-card" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginBottom: '20px' }}>Delivery Details</h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: '20px', marginBottom: '24px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                    <MapPin size={13} />
                    Origin
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a' }}>{shipment.pickupLocation}</div>
                  <div style={{ fontSize: '14px', color: '#64748b', marginTop: '2px' }}>{shipment.pickupRegion}</div>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                    <MapPin size={13} />
                    Destination
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a' }}>{shipment.dropoffLocation}</div>
                  <div style={{ fontSize: '14px', color: '#64748b', marginTop: '2px' }}>{shipment.dropoffRegion}</div>
                </div>
              </div>

              <div className="tracking-service-row" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 600, marginBottom: '4px' }}>Service Type</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '15px', fontWeight: 600, color: '#0f172a' }}>
                    <ServiceIcon size={15} color="#64748b" />
                    {VEHICLE_LABELS[shipment.vehicleType]} · {SPEED_LABELS[shipment.speed]}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 600, marginBottom: '4px' }}>Delivery Option</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px', fontSize: '15px', fontWeight: 700, color: '#078c35' }}>
                    <Boxes size={15} color="#078c35" />
                    {shipment.batchId ? 'Bulk Delivery' : shipment.speed === 'express' || shipment.priority === 'high' ? 'Express Delivery' : 'Standard Delivery'}
                  </div>
                </div>
              </div>

              {/* Order Price / Cost Section */}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '20px', marginTop: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <Banknote size={15} color="#078c35" />
                    Accepted Price
                  </div>
                  {shipment.status === 'awaiting_price' ? (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: '#b45309',
                      fontSize: '13px',
                      fontWeight: 600,
                      backgroundColor: '#fef3c7',
                      padding: '4px 10px',
                      borderRadius: '6px'
                    }}>
                      <AlertCircle size={13} />
                      Awaiting Price Confirmation
                    </span>
                  ) : (
                    <span style={{
                      fontSize: '18px',
                      fontWeight: 800,
                      color: '#078c35',
                      letterSpacing: '-0.01em'
                    }}>
                      GHS {Number(shipment.deliveryFee).toFixed(2)}
                    </span>
                  )}
                </div>

                {shipment.status === 'awaiting_price' ? (
                  <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#64748b', background: '#fffbeb', padding: '10px 14px', borderRadius: '8px', border: '1px solid #fef3c7' }}>
                    Operations is reviewing this order and will confirm the final delivery price shortly.
                  </p>
                ) : (
                  shipment.productFee != null && Number(shipment.productFee) > 0 ? (
                    <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#64748b' }}>
                        <span>Delivery Fee</span>
                        <span style={{ fontWeight: 600, color: '#0f172a' }}>GHS {Number(shipment.deliveryFee).toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#64748b' }}>
                        <span>Item / Product Value (COD)</span>
                        <span style={{ fontWeight: 600, color: '#0f172a' }}>GHS {Number(shipment.productFee).toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 700, color: '#0f172a', paddingTop: '8px', borderTop: '1px dashed #cbd5e1' }}>
                        <span>Total Order Value</span>
                        <span style={{ color: '#078c35', fontWeight: 800 }}>GHS {(Number(shipment.deliveryFee) + Number(shipment.productFee)).toFixed(2)}</span>
                      </div>
                    </div>
                  ) : null
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Vertical Timeline */}
          <div className="card-style tracking-timeline-card" style={{ padding: '32px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginBottom: '32px' }}>Tracking History</h3>

            {statusEvents.length === 0 ? (
              <p style={{ color: '#64748b', fontSize: '14px' }}>No tracking history yet.</p>
            ) : (
              <div style={{ position: 'relative' }}>
                {/* Vertical connecting line */}
                <div style={{ position: 'absolute', left: '15px', top: '24px', bottom: '24px', width: '2px', background: '#e2e8f0', zIndex: 0 }} />

                {statusEvents.map((event, idx) => {
                  const isLatest = idx === statusEvents.length - 1;
                  const label = STATUS_EVENT_LABELS[event.status] ?? event.status;
                  const description = event.note || STATUS_EVENT_DESCRIPTIONS[event.status] || '';
                  const StepIcon = STATUS_ICONS[event.status] ?? Clock;

                  return (
                    <div key={event.id} className="tracking-timeline-item" style={{ display: 'flex', gap: '20px', position: 'relative', zIndex: 1, marginBottom: isLatest ? 0 : '32px' }}>
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '50%', background: '#078c35',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        boxShadow: isLatest ? '0 0 0 4px rgba(7, 140, 53, 0.15)' : undefined
                      }}>
                        <StepIcon size={16} color="#ffffff" strokeWidth={2.25} />
                      </div>
                      <div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: isLatest ? '#078c35' : '#0f172a' }}>{label}</div>
                        {description && (
                          <div style={{ fontSize: '14px', color: isLatest ? '#475569' : '#64748b', marginTop: '4px' }}>{description}</div>
                        )}
                        <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '6px', fontWeight: 500 }}>{formatEventTime(event.createdAt)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        <CancelShipmentModal
          isOpen={isCancelModalOpen}
          onClose={() => setIsCancelModalOpen(false)}
          shipment={shipment}
          onSuccess={(updated) => setShipment(updated)}
        />
      </main>
    </div>
  );
}
