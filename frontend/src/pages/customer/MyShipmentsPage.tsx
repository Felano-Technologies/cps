import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  Search,
  MapPin,
  Calendar,
  Clock,
  PackageCheck,
  Truck,
  Navigation,
  AlertTriangle,
  AlertCircle,
  XCircle,
  Ban,
  ArrowUpRight,
  LayoutGrid,
  type LucideIcon,
} from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import EmptyState from '../../components/EmptyState';
import { SkeletonTableRows } from '../../components/Skeleton';
import type { Shipment, ShipmentStatus, VehicleType, ShipmentSpeed } from '../../types/models';
import '../../styles/MyShipmentsPage.css';

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

const STATUS_ICONS: Record<ShipmentStatus, LucideIcon> = {
  awaiting_price: AlertCircle,
  pending: Clock,
  picked_up: Package,
  in_transit: Truck,
  out_for_delivery: Navigation,
  delivered: PackageCheck,
  delayed: AlertTriangle,
  failed: XCircle,
  cancelled: Ban,
};

const TAB_ICONS: Record<'All Shipments' | ShipmentStatus, LucideIcon> = {
  'All Shipments': LayoutGrid,
  ...STATUS_ICONS,
};

const VEHICLE_LABELS: Record<VehicleType, string> = {
  motorbike: 'Motorbike',
  van: 'Van',
  truck: 'Truck',
};

const SPEED_LABELS: Record<ShipmentSpeed, string> = {
  same_day: 'Same Day',
  next_day: 'Next Day',
  express: 'Express',
};

const TABS: { value: 'All Shipments' | ShipmentStatus; label: string }[] = [
  { value: 'All Shipments', label: 'All Shipments' },
  { value: 'awaiting_price', label: STATUS_LABELS.awaiting_price },
  { value: 'pending', label: STATUS_LABELS.pending },
  { value: 'picked_up', label: STATUS_LABELS.picked_up },
  { value: 'in_transit', label: STATUS_LABELS.in_transit },
  { value: 'out_for_delivery', label: STATUS_LABELS.out_for_delivery },
  { value: 'delivered', label: STATUS_LABELS.delivered },
  { value: 'delayed', label: STATUS_LABELS.delayed },
  { value: 'failed', label: STATUS_LABELS.failed },
  { value: 'cancelled', label: STATUS_LABELS.cancelled },
];

function formatService(shipment: Shipment): string {
  return `${VEHICLE_LABELS[shipment.vehicleType]} · ${SPEED_LABELS[shipment.speed]}`;
}

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function MyShipmentsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'All Shipments' | ShipmentStatus>('All Shipments');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    let isMounted = true;

    async function fetchShipments() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await api.get<Shipment[]>('/shipments');
        if (isMounted) {
          setShipments(response.data);
        }
      } catch {
        if (isMounted) {
          setError('Failed to load your shipments. Please try again later.');
          toast.error('Failed to load your shipments.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchShipments();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredShipments = useMemo(() => {
    return shipments.filter(shipment => {
      const matchesTab = activeTab === 'All Shipments' || shipment.status === activeTab;
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        shipment.trackingCode.toLowerCase().includes(query) ||
        shipment.dropoffLocation.toLowerCase().includes(query);
      return matchesTab && matchesSearch;
    });
  }, [shipments, activeTab, searchQuery]);

  return (
    <div className="page-shell light-shell">
      <main className="container page-content">
        <div className="page-header shipments-header" style={{ marginBottom: '40px' }}>
          <span className="shipments-header-icon">
            <Package size={22} />
          </span>
          <div>
            <h1 style={{ fontSize: '36px', fontWeight: 800, color: '#0f172a', marginBottom: '12px', letterSpacing: '-0.02em' }}>My Shipments</h1>
            <p style={{ color: '#64748b', fontSize: '16px', fontWeight: 500, margin: 0 }}>Track and manage your requested pickups and deliveries.</p>
          </div>
        </div>

        {error && (
          <div className="shipments-error">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <div className="card-style" style={{ padding: '0', overflow: 'hidden' }}>
          <div className="shipment-controls">
            <div className="shipment-tabs">
              {TABS.map(tab => {
                const TabIcon = TAB_ICONS[tab.value];
                return (
                  <button
                    key={tab.value}
                    className={`shipment-tab ${activeTab === tab.value ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab.value)}
                  >
                    <TabIcon size={14} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="shipment-search">
              <Search size={18} className="shipment-search-icon" />
              <input
                type="text"
                placeholder="Search by Tracking Code or Destination..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <table className="responsive-table shipments-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0' }}>
            <thead>
              <tr style={{ textAlign: 'left', background: '#f8fafc' }}>
                <th style={{ padding: '20px 24px', fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Order ID</th>
                <th style={{ padding: '20px 24px', fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Destination</th>
                <th style={{ padding: '20px 24px', fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Service</th>
                <th style={{ padding: '20px 24px', fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                <th style={{ padding: '20px 24px', fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ETA / Time</th>
                <th style={{ padding: '20px 24px', fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <SkeletonTableRows rows={6} cols={6} />
              ) : filteredShipments.length > 0 ? (
                filteredShipments.map((shipment) => {
                  const StatusIcon = STATUS_ICONS[shipment.status];
                  return (
                    <tr key={shipment.id} className="shipment-row">
                      <td data-label="Order ID" style={{ padding: '20px 24px', fontWeight: 700, color: '#0f172a', borderBottom: '1px solid #f1f5f9' }}>{shipment.trackingCode}</td>
                      <td data-label="Destination" style={{ padding: '20px 24px', color: '#475569', borderBottom: '1px solid #f1f5f9', fontSize: '15px', fontWeight: 500 }}>
                        <span className="cell-with-icon">
                          <MapPin size={14} />
                          <span className="cell-value">{shipment.dropoffLocation}</span>
                        </span>
                      </td>
                      <td data-label="Service" style={{ padding: '20px 24px', color: '#64748b', borderBottom: '1px solid #f1f5f9', fontSize: '14px' }}>{formatService(shipment)}</td>
                      <td data-label="Status" style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9' }}>
                        <span className={`status-badge badge-${shipment.status.replace(/_/g, '-')}`}>
                          <StatusIcon size={12} />
                          {STATUS_LABELS[shipment.status]}
                        </span>
                      </td>
                      <td data-label="ETA / Time" style={{ padding: '20px 24px', color: '#475569', borderBottom: '1px solid #f1f5f9', fontSize: '14px', fontWeight: 500 }}>
                        <span className="cell-with-icon">
                          <Calendar size={14} />
                          <span className="cell-value">{formatTime(shipment.createdAt)}</span>
                        </span>
                      </td>
                      <td data-label="Action" style={{ padding: '20px 24px', textAlign: 'center', borderBottom: '1px solid #f1f5f9' }}>
                        <button
                          onClick={() => navigate(`/tracking/${shipment.trackingCode}`)}
                          className="shipment-track-btn"
                        >
                          Track
                          <ArrowUpRight size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} style={{ padding: 0 }}>
                    <EmptyState
                      icon="📦"
                      title="No Shipments Found"
                      message="You don't have any orders matching your current filter."
                      actionLabel="Clear Filter"
                      onAction={() => { setActiveTab('All Shipments'); setSearchQuery(''); }}
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
