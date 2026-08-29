import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Zap, Car, Bike, Truck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import api from '../../services/api';
import EmptyState from '../../components/EmptyState';
import { Skeleton } from '../../components/Skeleton';
import { useToast } from '../../contexts/ToastContext';
import type { Shipment, ShipmentStatus, VehicleType } from '../../types/models';

interface OpsOrdersListPageProps {
  filterType: 'new' | 'active';
}

const VEHICLE_ICONS: Record<VehicleType, LucideIcon> = {
  motorbike: Bike,
  van: Car,
  truck: Truck,
};

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

const STATUS_COLORS: Record<ShipmentStatus, { bg: string; text: string; dot: string }> = {
  awaiting_price: { bg: '#fff7ed', text: '#c2410c', dot: '#f97316' },
  pending: { bg: '#f1f5f9', text: '#475569', dot: '#94a3b8' },
  picked_up: { bg: '#ecfccb', text: '#3f6212', dot: '#84cc16' },
  in_transit: { bg: '#e0ffe0', text: '#22863a', dot: '#22863a' },
  out_for_delivery: { bg: '#e2e8f0', text: '#0f172a', dot: '#334155' },
  delivered: { bg: '#f1f5f9', text: '#475569', dot: '#94a3b8' },
  delayed: { bg: '#fee2e2', text: '#991b1b', dot: '#ef4444' },
  failed: { bg: '#fee2e2', text: '#991b1b', dot: '#ef4444' },
  cancelled: { bg: '#f1f5f9', text: '#64748b', dot: '#94a3b8' },
};

export default function OpsOrdersListPage({ filterType }: OpsOrdersListPageProps) {
  const toast = useToast();
  const navigate = useNavigate();
  
  const [orders, setOrders] = useState<Shipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const title = filterType === 'new' ? 'New Orders' : 'Active Orders';
  const subtitle = filterType === 'new' 
    ? 'Orders awaiting price, rider assignment, and ops review.' 
    : 'Orders currently being fulfilled.';

  useEffect(() => {
    const fetchOrders = async () => {
      setIsLoading(true);
      try {
        const response = await api.get<Shipment[]>('/shipments');
        setOrders(response.data);
      } catch (err) {
        toast.error('Failed to load orders.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchOrders();
  }, [filterType, toast]);

  const filteredOrders = useMemo(() => {
    let filtered = orders.filter(order => {
      if (filterType === 'new') {
        return order.status === 'awaiting_price';
      } else {
        return ['pending', 'picked_up', 'in_transit', 'out_for_delivery'].includes(order.status);
      }
    });

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(order => 
        order.trackingCode.toLowerCase().includes(q) ||
        order.receiverName.toLowerCase().includes(q) ||
        order.pickupLocation.toLowerCase().includes(q) ||
        order.dropoffLocation.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [orders, filterType, searchQuery]);

  return (
    <div className="page-shell light-shell">
      <main className="container" style={{ padding: '32px 24px', maxWidth: '1400px', marginBottom: '80px' }}>
        
        <div style={{ marginBottom: '24px' }}>
          <button 
            onClick={() => navigate('/ops-board')}
            className="neutral-btn" 
            style={{ padding: '8px 16px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600 }}
          >
            <ArrowLeft size={16} /> Back to Dashboard
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', marginBottom: '8px', letterSpacing: '-0.02em' }}>
              {title}
            </h1>
            <p className="muted-text" style={{ fontSize: '16px', color: '#64748b' }}>
              {subtitle}
            </p>
          </div>
          
          <div style={{ position: 'relative', width: '100%', maxWidth: '300px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '12px 16px 12px 40px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '14px' }}
            />
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '16px', fontSize: '13px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Order ID</th>
                  <th style={{ padding: '16px', fontSize: '13px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Route</th>
                  <th style={{ padding: '16px', fontSize: '13px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Service</th>
                  <th style={{ padding: '16px', fontSize: '13px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rider</th>
                  <th style={{ padding: '16px', fontSize: '13px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                  <th style={{ padding: '16px', fontSize: '13px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '16px' }}><Skeleton height="1.2em" width="80px" /></td>
                      <td style={{ padding: '16px' }}>
                        <Skeleton height="1.2em" width="120px" style={{ marginBottom: '4px' }} />
                        <Skeleton height="1em" width="100px" />
                      </td>
                      <td style={{ padding: '16px' }}><Skeleton height="1.2em" width="90px" /></td>
                      <td style={{ padding: '16px' }}><Skeleton height="1.2em" width="110px" /></td>
                      <td style={{ padding: '16px' }}><Skeleton height="1.5em" width="100px" radius="20px" /></td>
                      <td style={{ padding: '16px' }}><Skeleton height="2em" width="80px" radius="8px" /></td>
                    </tr>
                  ))
                ) : filteredOrders.length > 0 ? (
                  filteredOrders.map(order => {
                    const colors = STATUS_COLORS[order.status];
                    const isUrgent = order.priority === 'high';
                    const VehicleIcon = VEHICLE_ICONS[order.vehicleType];
                    return (
                      <tr key={order.id} style={{ borderBottom: '1px solid #e2e8f0', background: isUrgent ? '#fffbeb' : '#fff', transition: 'background 0.2s' }} className="hover-row">
                        <td style={{ padding: '16px' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '15px' }}>{order.trackingCode}</div>
                          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                            {new Date(order.createdAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td style={{ padding: '16px' }}>
                          <div style={{ fontSize: '14px', color: '#0f172a', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0f172a' }}></span>
                            {order.pickupLocation}
                          </div>
                          <div style={{ fontSize: '14px', color: '#0f172a', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#078c35' }}></span>
                            {order.dropoffLocation}
                          </div>
                        </td>
                        <td style={{ padding: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: '#475569', textTransform: 'capitalize' }}>
                            <VehicleIcon size={16} /> {order.vehicleType}
                          </div>
                          {isUrgent && (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fef9c3', color: '#854d0e', padding: '2px 6px', borderRadius: '6px', fontSize: '11px', fontWeight: 800, letterSpacing: '0.03em', marginTop: '6px' }}>
                              <Zap size={12} /> URGENT
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '16px', fontSize: '14px', color: '#475569' }}>
                          {order.assignedRider?.user.name ?? <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Unassigned</span>}
                        </td>
                        <td style={{ padding: '16px' }}>
                          <span style={{
                            background: colors.bg, color: colors.text,
                            padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 700,
                            display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap'
                          }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: colors.dot }}></span>
                            {STATUS_LABELS[order.status]}
                          </span>
                        </td>
                        <td style={{ padding: '16px' }}>
                          <Link 
                            to={`/ops/tracking/${order.trackingCode}`}
                            className="primary-green"
                            style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, textDecoration: 'none', display: 'inline-block' }}
                          >
                            {filterType === 'new' ? 'Process Order' : 'View Details'}
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} style={{ padding: '32px' }}>
                      <EmptyState
                        icon="📋"
                        title={`No ${title} Found`}
                        message={`There are currently no orders in the ${title.toLowerCase()} category.`}
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <style>{`
          .hover-row:hover { background: #f8fafc !important; }
        `}</style>
      </main>
    </div>
  );
}
