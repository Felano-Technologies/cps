import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import {
  Share2,
  Printer,
  MapPin,
  Package,
  CheckCircle2,
  User,
  Phone,
  Mail,
  RefreshCw,
  Clock,
  AlertCircle,
  Copy,
  Check,
  Zap,
  Bike,
  Car,
  Truck,
  DollarSign,
  ShieldCheck,
  Compass,
  ExternalLink,
  Image as ImageIcon,
  Maximize2,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import OrderPrintModal from '../../components/OrderPrintModal';
import CustomSelect from '../../components/Form/CustomSelect';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import type { Shipment, ShipmentStatus, RiderProfile, VehicleType, ShipmentSpeed, PackageType } from '../../types/models';

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

const STATUS_BADGE_STYLES: Record<ShipmentStatus, { bg: string; text: string; border: string }> = {
  awaiting_price: { bg: '#fff7ed', text: '#c2410c', border: '#fdba74' },
  pending: { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' },
  picked_up: { bg: '#ecfccb', text: '#3f6212', border: '#bef264' },
  in_transit: { bg: '#e0ffe0', text: '#15803d', border: '#86efac' },
  out_for_delivery: { bg: '#e0f2fe', text: '#0369a1', border: '#7dd3fc' },
  delivered: { bg: '#dcfce7', text: '#166534', border: '#86efac' },
  delayed: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
  failed: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
  cancelled: { bg: '#f1f5f9', text: '#64748b', border: '#cbd5e1' },
};

const VEHICLE_ICONS: Record<VehicleType, LucideIcon> = {
  motorbike: Bike,
  van: Car,
  truck: Truck,
};

const SPEED_LABELS: Record<ShipmentSpeed, string> = {
  same_day: 'Same Day Delivery',
  next_day: 'Next Day Delivery',
  express: 'Express Delivery',
};

const PACKAGE_TYPE_LABELS: Record<PackageType, string> = {
  document: 'Document',
  parcel: 'Standard Parcel',
  electronics: 'Electronics',
  fragile: 'Fragile / Breakable',
  food: 'Food / Perishable',
  other: 'General Cargo',
};

const STATUS_OPTIONS = (Object.keys(STATUS_LABELS) as ShipmentStatus[]).map(s => ({
  value: s,
  label: STATUS_LABELS[s],
}));

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
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

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

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        setCopiedField(label);
        toast.success(`${label} copied to clipboard`);
        setTimeout(() => setCopiedField(null), 2000);
      },
      () => toast.error('Failed to copy text')
    );
  };

  const handleAssignRider = async (riderId: string) => {
    if (!shipment || !riderId) return;
    try {
      const { data } = await api.patch<Shipment>(`/shipments/${shipment.id}/assign`, { riderId });
      setShipment(data);
      toast.success('Rider assigned successfully.');
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to assign rider.'));
    }
  };

  const handleStatusChange = async (status: string) => {
    if (!shipment) return;
    try {
      const { data } = await api.patch<Shipment>(`/shipments/${shipment.id}/status`, { status });
      setShipment(data);
      toast.success('Status updated successfully.');
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
      () => toast.success('Tracking link copied to clipboard.'),
      () => toast.error('Failed to copy link.')
    );
  };

  if (isLoading) {
    return (
      <div className="page-shell light-shell">
        <main className="container" style={{ padding: '64px 24px', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', color: '#64748b', fontSize: '16px', fontWeight: 600 }}>
            <RefreshCw className="animate-spin" size={20} />
            Loading complete tracking details...
          </div>
        </main>
      </div>
    );
  }

  if (error || !shipment) {
    return (
      <div className="page-shell light-shell">
        <main className="container" style={{ padding: '64px 24px', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <AlertCircle size={32} />
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>Shipment Not Found</h2>
          <p style={{ color: '#64748b', marginBottom: '24px', fontSize: '15px' }}>{error ?? 'The requested parcel or order ID could not be loaded.'}</p>
          <Link to="/ops-board" className="primary-green" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '10px', textDecoration: 'none', fontWeight: 700 }}>
            Back to Operations Board
          </Link>
        </main>
      </div>
    );
  }

  const badgeStyle = STATUS_BADGE_STYLES[shipment.status] ?? { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };
  const VehicleIcon = VEHICLE_ICONS[shipment.vehicleType] ?? Truck;
  const isUrgent = shipment.priority === 'high';

  return (
    <div className="page-shell light-shell">
      <style>{`
        .ops-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(15, 23, 42, 0.04);
          overflow: hidden;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .ops-card:hover {
          border-color: #cbd5e1;
        }
        .ops-card-header {
          padding: 18px 24px;
          border-bottom: 1px solid #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #fafbfc;
        }
        .ops-card-title {
          font-size: 16px;
          font-weight: 700;
          color: #0f172a;
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 0;
        }
        .ops-card-body {
          padding: 24px;
        }
        .two-column-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }
        .info-field-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .info-field-label {
          font-size: 12px;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .info-field-value {
          font-size: 15px;
          font-weight: 600;
          color: #0f172a;
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .contact-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.15s ease;
          cursor: pointer;
          border: 1px solid transparent;
        }
        .contact-btn-call {
          background: #e0ffe0;
          color: #166534;
          border-color: #bbf7d0;
        }
        .contact-btn-call:hover {
          background: #bbf7d0;
          color: #14532d;
        }
        .contact-btn-copy {
          background: #f1f5f9;
          color: #475569;
          border-color: #e2e8f0;
        }
        .contact-btn-copy:hover {
          background: #e2e8f0;
          color: #0f172a;
        }
        .timeline-wrapper {
          position: relative;
          padding-left: 28px;
        }
        .timeline-spine {
          position: absolute;
          left: 11px;
          top: 8px;
          bottom: 12px;
          width: 2px;
          background: #e2e8f0;
        }
        .timeline-node {
          position: relative;
          margin-bottom: 28px;
        }
        .timeline-node:last-child {
          margin-bottom: 0;
        }
        .timeline-badge {
          position: absolute;
          left: -28px;
          top: 3px;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #078c35;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 0 4px #dcfce7;
        }
        .header-actions-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .header-actions-bar .custom-select {
          min-width: 175px;
        }
        @media (max-width: 1024px) {
          .two-column-grid {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 768px) {
          .ops-tracking-container {
            padding: 16px !important;
          }
          .header-actions-bar {
            width: 100%;
            flex-direction: column;
          }
          .header-actions-bar > * {
            width: 100%;
          }
        }
      `}</style>

      <main className="container ops-tracking-container" style={{ padding: '32px 24px', maxWidth: '1400px', marginBottom: '80px' }}>

        {/* Breadcrumb Navigation */}
        <div style={{ marginBottom: '20px', fontSize: '14px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Link to="/ops-board" style={{ color: '#64748b', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
            Operations Board
          </Link>
          <span style={{ color: '#cbd5e1' }}>/</span>
          <span style={{ color: '#0f172a', fontWeight: 700 }}>Order Tracking & Customer Details</span>
        </div>

        {/* Top Header Card */}
        <div className="ops-card" style={{ marginBottom: '24px', padding: '24px 28px', background: 'linear-gradient(180deg, #ffffff 0%, #fafbfc 100%)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '8px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                  Tracking #{shipment.trackingCode}
                </h1>
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    padding: '6px 14px',
                    borderRadius: '24px',
                    background: badgeStyle.bg,
                    color: badgeStyle.text,
                    border: `1px solid ${badgeStyle.border}`,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: badgeStyle.text }} />
                  {STATUS_LABELS[shipment.status]}
                </span>
                {isUrgent && (
                  <span style={{ fontSize: '12px', fontWeight: 800, padding: '4px 10px', borderRadius: '20px', background: '#fef9c3', color: '#854d0e', border: '1px solid #fde047', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Zap size={13} /> URGENT
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: '#64748b', fontSize: '14px', flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={15} /> Placed: {new Date(shipment.createdAt).toLocaleString()}
                </span>
                {shipment.batchId && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'monospace', background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px' }}>
                    Batch: {shipment.batchId.slice(0, 8)}...
                  </span>
                )}
              </div>
            </div>

            {/* Header Actions */}
            <div className="header-actions-bar">
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
              <button
                className="contact-btn contact-btn-copy"
                onClick={handleShareLink}
                style={{ padding: '10px 18px', minHeight: '44px', fontWeight: 600, fontSize: '14px' }}
                title="Copy tracking link"
              >
                <Share2 size={16} /> Share Link
              </button>
              <button
                className="primary-green"
                style={{ padding: '10px 20px', borderRadius: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', minHeight: '44px' }}
                onClick={() => setIsPrintModalOpen(true)}
              >
                <Printer size={16} /> Print Waybill
              </button>
            </div>
          </div>
        </div>

        {/* Process Order Banner (When Awaiting Price) */}
        {shipment.status === 'awaiting_price' && (
          <div className="ops-card" style={{ padding: '28px', marginBottom: '24px', background: '#fffbeb', border: '1px solid #fde68a', borderLeft: '6px solid #f59e0b' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '20px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <DollarSign size={22} />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#92400e', margin: '0 0 4px 0' }}>Step 1: Set & Confirm Order Price</h3>
                <p style={{ color: '#b45309', margin: 0, fontSize: '14px', lineHeight: 1.4 }}>
                  Before dispatching, decide whether to accept the customer's estimated price or adjust it based on route, volume, or special requirements.
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#92400e', marginBottom: '6px' }}>
                  Confirmed Delivery Fee (GHS) *
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="number"
                    value={processFee}
                    onChange={(e) => setProcessFee(e.target.value)}
                    placeholder="e.g. 35.00"
                    style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid #fcd34d', fontSize: '16px', fontWeight: 700, background: '#fff', boxSizing: 'border-box' }}
                  />
                  <button
                    type="button"
                    onClick={() => setProcessFee(String(shipment.deliveryFee))}
                    className="contact-btn contact-btn-call"
                    style={{ padding: '0 12px', fontSize: '12px', fontWeight: 700, whiteSpace: 'nowrap' }}
                    title="Reset to customer estimate"
                  >
                    Use Est (GHS {Number(shipment.deliveryFee).toFixed(2)})
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#92400e', marginBottom: '6px' }}>
                  Assign Dispatch Rider (Optional)
                </label>
                <CustomSelect
                  value={processRiderId}
                  onChange={setProcessRiderId}
                  options={riderOptions}
                  icon={<User size={16} />}
                />
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#92400e', marginBottom: '6px' }}>
                Operations Remarks (Internal notes)
              </label>
              <textarea
                value={processRemarks}
                onChange={(e) => setProcessRemarks(e.target.value)}
                rows={2}
                placeholder="Add any specific route instructions, pricing justifications, or dispatch notes..."
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #fcd34d', fontSize: '14px', background: '#fff', fontFamily: 'inherit', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={handleProcessOrder}
                disabled={isProcessing || !processFee}
                className="primary-green"
                style={{ padding: '12px 28px', borderRadius: '10px', fontWeight: 700, fontSize: '15px', opacity: (isProcessing || !processFee) ? 0.7 : 1, display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <DollarSign size={16} />
                {isProcessing ? 'Processing Order...' : `Confirm Price (GHS ${Number(processFee || 0).toFixed(2)}) & Move to Active`}
              </button>
            </div>
          </div>
        )}

        {/* MAIN TWO-COLUMN SECTION: Customer / Sender Details & Receiver Details */}
        <div className="two-column-grid" style={{ marginBottom: '24px' }}>

          {/* 1. CUSTOMER WHO PLACED THE ORDER (SENDER / ACCOUNT OWNER) */}
          <div className="ops-card">
            <div className="ops-card-header">
              <h3 className="ops-card-title">
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#e0ffe0', color: '#078c35', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={18} />
                </div>
                Customer & Sender Information
              </h3>
              {shipment.customer ? (
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#078c35', background: '#dcfce7', padding: '4px 10px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ShieldCheck size={14} /> Registered Account
                </span>
              ) : (
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', background: '#f1f5f9', padding: '4px 10px', borderRadius: '12px' }}>
                  Guest / Direct Sender
                </span>
              )}
            </div>

            <div className="ops-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Sender Name & Primary Phone */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', paddingBottom: '18px', borderBottom: '1px solid #f1f5f9' }}>
                <div className="info-field-group">
                  <span className="info-field-label">Sender / Customer Name</span>
                  <div className="info-field-value" style={{ fontSize: '17px', color: '#0f172a' }}>
                    {shipment.senderName}
                  </div>
                </div>

                <div className="info-field-group">
                  <span className="info-field-label">Primary Phone</span>
                  <div className="info-field-value">
                    <span style={{ fontFamily: 'monospace', fontSize: '15px' }}>{shipment.senderNumber}</span>
                    <a href={`tel:${shipment.senderNumber}`} className="contact-btn contact-btn-call" title="Call Sender">
                      <Phone size={13} /> Call
                    </a>
                    <button
                      onClick={() => handleCopyText(shipment.senderNumber, 'Sender Phone')}
                      className="contact-btn contact-btn-copy"
                      title="Copy Phone"
                    >
                      {copiedField === 'Sender Phone' ? <Check size={13} /> : <Copy size={13} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Alternate Contact & Registered User Account Details */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', paddingBottom: '18px', borderBottom: '1px solid #f1f5f9' }}>
                {shipment.senderContact && (
                  <div className="info-field-group">
                    <span className="info-field-label">Alternate Contact / Note</span>
                    <div className="info-field-value" style={{ fontSize: '14px', color: '#475569' }}>
                      {shipment.senderContact}
                    </div>
                  </div>
                )}

                {shipment.customer && (
                  <div className="info-field-group">
                    <span className="info-field-label">Account Email</span>
                    <div className="info-field-value">
                      <a href={`mailto:${shipment.customer.email}`} style={{ color: '#078c35', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <Mail size={14} /> {shipment.customer.email}
                      </a>
                    </div>
                  </div>
                )}

                {shipment.customer?.phone && shipment.customer.phone !== shipment.senderNumber && (
                  <div className="info-field-group">
                    <span className="info-field-label">Account Profile Phone</span>
                    <div className="info-field-value" style={{ fontSize: '14px', fontFamily: 'monospace' }}>
                      {shipment.customer.phone}
                    </div>
                  </div>
                )}
              </div>

              {/* Origin / Pickup Details */}
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#078c35', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                  <MapPin size={15} /> Pickup / Origin Location
                </div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
                  {shipment.pickupLocation}
                </div>
                <div style={{ fontSize: '14px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <span>Region: <strong style={{ color: '#334155' }}>{shipment.pickupRegion}</strong></span>
                  {shipment.pickupDate && (
                    <span>• Pickup Date: <strong style={{ color: '#334155' }}>{shipment.pickupDate}</strong></span>
                  )}
                </div>
              </div>

              {/* Special Instructions from Sender */}
              {shipment.additionalInstructions && (
                <div style={{ background: '#fffbeb', border: '1px solid #fef08a', padding: '14px 16px', borderRadius: '10px' }}>
                  <span style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#854d0e', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                    Special Sender Instructions
                  </span>
                  <p style={{ margin: 0, fontSize: '14px', color: '#713f12', lineHeight: 1.5 }}>
                    {shipment.additionalInstructions}
                  </p>
                </div>
              )}

            </div>
          </div>

          {/* 2. RECEIVER / RECIPIENT DETAILS */}
          <div className="ops-card">
            <div className="ops-card-header">
              <h3 className="ops-card-title">
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MapPin size={18} />
                </div>
                Recipient & Dropoff Details
              </h3>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#2563eb', background: '#dbeafe', padding: '4px 10px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Compass size={14} /> Destination
              </span>
            </div>

            <div className="ops-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {/* Recipient Name & Phone */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', paddingBottom: '18px', borderBottom: '1px solid #f1f5f9' }}>
                <div className="info-field-group">
                  <span className="info-field-label">Recipient Full Name</span>
                  <div className="info-field-value" style={{ fontSize: '17px', color: '#0f172a' }}>
                    {shipment.receiverName}
                  </div>
                </div>

                <div className="info-field-group">
                  <span className="info-field-label">Recipient Phone Number</span>
                  <div className="info-field-value">
                    <span style={{ fontFamily: 'monospace', fontSize: '15px' }}>{shipment.receiverNumber}</span>
                    <a href={`tel:${shipment.receiverNumber}`} className="contact-btn contact-btn-call" title="Call Recipient">
                      <Phone size={13} /> Call
                    </a>
                    <button
                      onClick={() => handleCopyText(shipment.receiverNumber, 'Recipient Phone')}
                      className="contact-btn contact-btn-copy"
                      title="Copy Recipient Phone"
                    >
                      {copiedField === 'Recipient Phone' ? <Check size={13} /> : <Copy size={13} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Destination / Dropoff Address Details */}
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                  <Compass size={15} /> Delivery Destination
                </div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
                  {shipment.dropoffLocation}
                </div>
                <div style={{ fontSize: '14px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <span>Region: <strong style={{ color: '#334155' }}>{shipment.dropoffRegion}</strong></span>
                  {shipment.dropoffKumasiSubArea && (
                    <span>• Area: <strong style={{ color: '#334155' }}>{shipment.dropoffKumasiSubArea === 'CampusAndEnvirons' ? 'KNUST Campus & Environs' : shipment.dropoffKumasiSubArea}</strong></span>
                  )}
                </div>
              </div>

              {/* Proof of Delivery / Recipient Confirmation */}
              {shipment.status === 'delivered' ? (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '16px', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#166534', fontWeight: 700, fontSize: '15px', marginBottom: '8px' }}>
                    <CheckCircle2 size={18} /> Package Delivered Successfully
                  </div>
                  <div style={{ fontSize: '14px', color: '#15803d', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div>Received by: <strong>{shipment.podRecipientName ?? shipment.receiverName}</strong></div>
                    {shipment.podMethod && <div>Confirmation Method: <strong>{shipment.podMethod.toUpperCase()}</strong></div>}
                  </div>
                  {shipment.podPhotoUrl && (
                    <div style={{ marginTop: '12px' }}>
                      <a href={shipment.podPhotoUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#166534', fontWeight: 600, textDecoration: 'underline' }}>
                        <ExternalLink size={14} /> View Delivery Proof Photo
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', background: '#f1f5f9', borderRadius: '10px', color: '#64748b', fontSize: '13px' }}>
                  <Clock size={16} /> Delivery in progress. Recipient confirmation will appear once marked delivered.
                </div>
              )}

            </div>
          </div>

        </div>

        {/* SECOND ROW: Package & Pricing Specifications + Assigned Rider & Operations remarks */}
        <div className="two-column-grid" style={{ marginBottom: '24px' }}>

          {/* PACKAGE & FINANCIAL SPECIFICATIONS */}
          <div className="ops-card">
            <div className="ops-card-header">
              <h3 className="ops-card-title">
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Package size={18} />
                </div>
                Package & Financial Specifications
              </h3>
            </div>

            <div className="ops-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', paddingBottom: '16px', borderBottom: '1px solid #f1f5f9' }}>
                <div className="info-field-group">
                  <span className="info-field-label">Package Type</span>
                  <div className="info-field-value">
                    {PACKAGE_TYPE_LABELS[shipment.packageType] ?? shipment.packageType}
                  </div>
                </div>

                <div className="info-field-group">
                  <span className="info-field-label">Service Speed</span>
                  <div className="info-field-value">
                    {SPEED_LABELS[shipment.speed] ?? shipment.speed}
                  </div>
                </div>

                <div className="info-field-group">
                  <span className="info-field-label">Required Vehicle</span>
                  <div className="info-field-value">
                    <VehicleIcon size={16} color="#078c35" />
                    <span style={{ textTransform: 'capitalize' }}>{shipment.vehicleType}</span>
                  </div>
                </div>

                <div className="info-field-group">
                  <span className="info-field-label">Delivery Option</span>
                  <div className="info-field-value">
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        padding: '4px 10px',
                        borderRadius: '6px',
                        background: shipment.batchId
                          ? '#f3e8ff'
                          : shipment.speed === 'express' || shipment.priority === 'high'
                          ? '#fef9c3'
                          : '#e0ffe0',
                        color: shipment.batchId
                          ? '#7e22ce'
                          : shipment.speed === 'express' || shipment.priority === 'high'
                          ? '#854d0e'
                          : '#15803d',
                      }}
                    >
                      {shipment.batchId
                        ? 'Bulk Delivery'
                        : shipment.speed === 'express' || shipment.priority === 'high'
                        ? 'Express Delivery'
                        : 'Standard Delivery'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Pricing Breakdown */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748b', fontSize: '14px', fontWeight: 500 }}>Delivery Fee</span>
                  {isEditingPrice ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: '#64748b', fontWeight: 600, fontSize: '13px' }}>GHS</span>
                      <input
                        type="number"
                        value={newPrice}
                        onChange={(e) => setNewPrice(e.target.value)}
                        style={{ width: '90px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', fontWeight: 600 }}
                      />
                      <button onClick={handlePriceUpdate} className="primary-green" style={{ padding: '6px 12px', minHeight: 'auto', borderRadius: '6px', fontSize: '13px' }}>
                        Save
                      </button>
                      <button onClick={() => setIsEditingPrice(false)} className="contact-btn contact-btn-copy" style={{ padding: '6px 12px', minHeight: 'auto', borderRadius: '6px', fontSize: '13px' }}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <strong style={{ color: '#0f172a', fontSize: '16px' }}>GHS {Number(shipment.deliveryFee).toFixed(2)}</strong>
                      <button
                        onClick={() => { setIsEditingPrice(true); setNewPrice(String(shipment.deliveryFee)); }}
                        style={{ background: 'transparent', border: 'none', color: '#078c35', fontWeight: 600, fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </div>

                {shipment.productFee != null && Number(shipment.productFee) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748b', fontSize: '14px', fontWeight: 500 }}>Item / Product Value (COD)</span>
                    <strong style={{ color: '#0f172a', fontSize: '16px' }}>GHS {Number(shipment.productFee).toFixed(2)}</strong>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '2px dashed #e2e8f0' }}>
                  <span style={{ color: '#0f172a', fontSize: '15px', fontWeight: 700 }}>Total Order Value</span>
                  <strong style={{ color: '#078c35', fontSize: '18px', fontWeight: 800 }}>
                    GHS {(Number(shipment.deliveryFee) + (shipment.productFee ? Number(shipment.productFee) : 0)).toFixed(2)}
                  </strong>
                </div>
              </div>

              {/* Customer Uploaded Package Image */}
              {shipment.packageImageUrl && (
                <div style={{ marginTop: '8px', padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      <ImageIcon size={16} color="#078c35" /> Customer Uploaded Package Image
                    </span>
                    <button
                      type="button"
                      onClick={() => setPreviewImage(shipment.packageImageUrl!)}
                      style={{
                        background: '#e0ffe0',
                        color: '#078c35',
                        border: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '12px',
                        fontWeight: 700,
                        padding: '6px 12px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                      }}
                    >
                      <Maximize2 size={13} /> View Enlarge
                    </button>
                  </div>
                  <div
                    onClick={() => setPreviewImage(shipment.packageImageUrl!)}
                    style={{
                      position: 'relative',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      border: '1px solid #cbd5e1',
                      background: '#0f172a',
                      maxHeight: '260px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                    title="Click to view full image"
                  >
                    <img
                      src={shipment.packageImageUrl}
                      alt="Customer Package"
                      style={{ maxWidth: '100%', maxHeight: '260px', objectFit: 'contain', display: 'block' }}
                    />
                  </div>
                </div>
              )}

              {shipment.opsRemarks && (
                <div style={{ marginTop: '8px', padding: '12px 14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <span style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Internal Operations Remarks
                  </span>
                  <p style={{ margin: 0, fontSize: '13px', color: '#334155' }}>{shipment.opsRemarks}</p>
                </div>
              )}
            </div>
          </div>

          {/* ASSIGNED DISPATCH RIDER CARD */}
          <div className="ops-card">
            <div className="ops-card-header">
              <h3 className="ops-card-title">
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#f3e8ff', color: '#9333ea', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Bike size={18} />
                </div>
                Assigned Dispatch Rider
              </h3>
            </div>

            <div className="ops-card-body">
              {shipment.assignedRider ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '54px', height: '54px', borderRadius: '50%', background: '#f3e8ff', color: '#7e22ce', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '20px' }}>
                      {shipment.assignedRider.user.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
                        {shipment.assignedRider.user.name}
                      </h4>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '13px', color: '#64748b' }}>
                          Status: <strong style={{ textTransform: 'capitalize', color: '#0f172a' }}>{shipment.assignedRider.currentStatus.replace('_', ' ')}</strong>
                        </span>
                        {shipment.assignedRider.vehicleType && (
                          <span style={{ fontSize: '13px', color: '#64748b' }}>
                            • Vehicle: <strong style={{ textTransform: 'capitalize', color: '#0f172a' }}>{shipment.assignedRider.vehicleType}</strong>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {shipment.assignedRider.user.phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 500 }}>Rider Phone:</span>
                      <strong style={{ fontFamily: 'monospace', fontSize: '15px' }}>{shipment.assignedRider.user.phone}</strong>
                      <a href={`tel:${shipment.assignedRider.user.phone}`} className="contact-btn contact-btn-call">
                        <Phone size={13} /> Call Rider
                      </a>
                    </div>
                  )}

                  <div style={{ paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>
                      Reassign Rider
                    </label>
                    <CustomSelect
                      value={shipment.assignedRiderId ?? ''}
                      onChange={handleAssignRider}
                      options={riderOptions.filter(r => r.value !== '')}
                      icon={<User size={16} />}
                    />
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '24px 12px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#f1f5f9', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                    <User size={24} />
                  </div>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>No Rider Assigned Yet</h4>
                  <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#64748b' }}>Assign an available rider to handle pickup and delivery.</p>
                  <div style={{ maxWidth: '320px', margin: '0 auto' }}>
                    <CustomSelect
                      value=""
                      onChange={handleAssignRider}
                      options={riderOptions.filter(r => r.value !== '')}
                      icon={<User size={16} />}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* THIRD ROW: Status Timeline History */}
        <div className="ops-card">
          <div className="ops-card-header">
            <h3 className="ops-card-title">
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#dbeafe', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={18} />
              </div>
              Live Status Events & Timeline
            </h3>
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>
              {(shipment.statusEvents ?? []).length} Event(s) Logged
            </span>
          </div>

          <div className="ops-card-body">
            <div className="timeline-wrapper">
              <div className="timeline-spine" />
              {(shipment.statusEvents ?? []).length === 0 ? (
                <p style={{ color: '#94a3b8', fontWeight: 600, margin: 0 }}>No status events recorded yet.</p>
              ) : (
                [...(shipment.statusEvents ?? [])].reverse().map((evt) => (
                  <div key={evt.id} className="timeline-node">
                    <div className="timeline-badge">
                      <CheckCircle2 size={14} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px', flexWrap: 'wrap', gap: '8px' }}>
                        <strong style={{ fontSize: '15px', color: '#0f172a' }}>
                          {STATUS_LABELS[evt.status] ?? evt.status}
                        </strong>
                        <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 600 }}>
                          {new Date(evt.createdAt).toLocaleString()}
                        </span>
                      </div>
                      {evt.note && (
                        <div style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.5, background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '6px' }}>
                          {evt.note}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </main>

      {/* Package Image Lightbox / Modal */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '90vh',
              background: '#fff',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: '#0f172a', fontSize: '15px' }}>
                <ImageIcon size={18} color="#078c35" /> Package Image Preview
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <a
                  href={previewImage}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#078c35', fontWeight: 600, textDecoration: 'none' }}
                >
                  <ExternalLink size={14} /> Open in New Tab
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewImage(null)}
                  style={{
                    background: '#f1f5f9',
                    border: 'none',
                    borderRadius: '8px',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#64748b',
                  }}
                  title="Close preview"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div style={{ padding: '16px', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto' }}>
              <img
                src={previewImage}
                alt="Package Enlarged Preview"
                style={{ maxWidth: '100%', maxHeight: '75vh', objectFit: 'contain', borderRadius: '8px' }}
              />
            </div>
          </div>
        </div>
      )}

      {isPrintModalOpen && <OrderPrintModal onClose={() => setIsPrintModalOpen(false)} />}
    </div>
  );
}
