import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import EmptyState from '../../components/EmptyState';
import type { Shipment, ShipmentStatus, VehicleType, ShipmentSpeed } from '../../types/models';
import '../../styles/MyShipmentsPage.css';

const STATUS_LABELS: Record<ShipmentStatus, string> = {
  pending: 'Pending',
  picked_up: 'Picked Up',
  in_transit: 'In Transit',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  delayed: 'Delayed',
  failed: 'Failed',
  cancelled: 'Cancelled',
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
        <div className="page-header" style={{ marginBottom: '40px' }}>
          <h1 style={{ fontSize: '36px', fontWeight: 800, color: '#0f172a', marginBottom: '12px', letterSpacing: '-0.02em' }}>My Shipments</h1>
          <p style={{ color: '#64748b', fontSize: '16px', fontWeight: 500, margin: 0 }}>Track and manage your requested pickups and deliveries.</p>
        </div>

        {error && (
          <p style={{ color: '#991b1b', fontWeight: 600, marginBottom: '16px' }}>{error}</p>
        )}

        <div className="card-style" style={{ padding: '0', overflow: 'hidden' }}>
          <div className="shipment-controls">
            <div className="shipment-tabs">
              {TABS.map(tab => (
                <button
                  key={tab.value}
                  className={`shipment-tab ${activeTab === tab.value ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.value)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="shipment-search">
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="#94a3b8" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }}>
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
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
                <tr>
                  <td colSpan={6} style={{ padding: '48px 24px', textAlign: 'center', color: '#64748b', fontSize: '15px', fontWeight: 500 }}>
                    Loading shipments...
                  </td>
                </tr>
              ) : filteredShipments.length > 0 ? (
                filteredShipments.map((shipment) => (
                  <tr key={shipment.id} className="shipment-row">
                    <td data-label="Order ID" style={{ padding: '20px 24px', fontWeight: 700, color: '#0f172a', borderBottom: '1px solid #f1f5f9' }}>{shipment.trackingCode}</td>
                    <td data-label="Destination" style={{ padding: '20px 24px', color: '#475569', borderBottom: '1px solid #f1f5f9', fontSize: '15px', fontWeight: 500 }}>{shipment.dropoffLocation}</td>
                    <td data-label="Service" style={{ padding: '20px 24px', color: '#64748b', borderBottom: '1px solid #f1f5f9', fontSize: '14px' }}>{formatService(shipment)}</td>
                    <td data-label="Status" style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9' }}>
                      <span className={`status-badge badge-${shipment.status.replace(/_/g, '-')}`}>
                        {STATUS_LABELS[shipment.status]}
                      </span>
                    </td>
                    <td data-label="ETA / Time" style={{ padding: '20px 24px', color: '#475569', borderBottom: '1px solid #f1f5f9', fontSize: '14px', fontWeight: 500 }}>{formatTime(shipment.createdAt)}</td>
                    <td data-label="Action" style={{ padding: '20px 24px', textAlign: 'center', borderBottom: '1px solid #f1f5f9' }}>
                      <button
                        onClick={() => navigate(`/tracking/${shipment.trackingCode}`)}
                        style={{ padding: '8px 16px', fontSize: '13px', backgroundColor: '#e0f3cb', color: '#078c35', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', transition: 'background-color 0.2s' }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#ccebb1'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#e0f3cb'}
                      >
                        Track
                      </button>
                    </td>
                  </tr>
                ))
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
