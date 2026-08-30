import React, { useEffect, useState } from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { Package } from 'lucide-react';
import SharedPasswordView from './SharedPasswordView';
import EmptyState from '../../components/EmptyState';
import { SkeletonListItem } from '../../components/Skeleton';
import api from '../../services/api';
import type { Shipment } from '../../types/models';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  picked_up: 'Picked Up',
  in_transit: 'In Transit',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  delayed: 'Delayed',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: '#fef3c7', text: '#92400e' },
  picked_up: { bg: '#ecfccb', text: '#3f6212' },
  in_transit: { bg: '#fef08a', text: '#854d0e' },
  out_for_delivery: { bg: '#e2e8f0', text: '#0f172a' },
  delivered: { bg: '#dcfce7', text: '#166534' },
  delayed: { bg: '#fee2e2', text: '#991b1b' },
  failed: { bg: '#fee2e2', text: '#991b1b' },
  cancelled: { bg: '#f1f5f9', text: '#475569' },
};

function formatVehicleSpeed(shipment: Shipment): string {
  const vehicle = shipment.vehicleType.charAt(0).toUpperCase() + shipment.vehicleType.slice(1);
  const speed = shipment.speed.replace('_', ' ');
  return `${vehicle} · ${speed}`;
}

function OrderHistoryView() {
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchShipments = async () => {
      try {
        const { data } = await api.get<Shipment[]>('/shipments');
        setShipments(data);
      } catch {
        setError('Failed to load your order history.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchShipments();
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedOrderId(expandedOrderId === id ? null : id);
  };

  return (
    <div className="card-style" style={{ padding: '32px' }}>
      <div className="section-heading-row" style={{ marginBottom: '24px' }}>
        <h3>Order History</h3>
      </div>

      {isLoading ? (
        <div style={{ padding: '8px 32px' }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonListItem key={i} />
          ))}
        </div>
      ) : error ? (
        <p style={{ textAlign: 'center', padding: '32px', color: '#991b1b', fontWeight: 600 }}>{error}</p>
      ) : shipments.length === 0 ? (
        <EmptyState
          icon={<Package size={36} />}
          title="No Orders Yet"
          message="Your past shipments will show up here once you've made a pickup request."
        />
      ) : (
        <table className="responsive-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0' }}>
          <thead>
            <tr style={{ textAlign: 'left' }}>
              <th style={{ padding: '24px 32px', fontWeight: 600, color: '#64748b', borderBottom: '2px solid #e2e8f0' }}>Order ID</th>
              <th style={{ padding: '24px 32px', fontWeight: 600, color: '#64748b', borderBottom: '2px solid #e2e8f0' }}>Date</th>
              <th style={{ padding: '24px 32px', fontWeight: 600, color: '#64748b', borderBottom: '2px solid #e2e8f0' }}>Status</th>
              <th style={{ padding: '24px 32px', fontWeight: 600, color: '#64748b', borderBottom: '2px solid #e2e8f0', textAlign: 'right' }}>Cost</th>
              <th style={{ padding: '24px 32px', fontWeight: 600, color: '#64748b', borderBottom: '2px solid #e2e8f0', textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {shipments.map((order, index) => {
              const colors = STATUS_COLORS[order.status] ?? STATUS_COLORS.pending;
              return (
                <React.Fragment key={order.id}>
                  <tr style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                    <td data-label="Order ID" style={{ padding: '24px 32px', fontWeight: 600, color: '#0f172a', borderBottom: '1px solid #e2e8f0' }}>{order.trackingCode}</td>
                    <td data-label="Date" style={{ padding: '24px 32px', color: '#475569', borderBottom: '1px solid #e2e8f0' }}>{new Date(order.createdAt).toLocaleDateString()}</td>
                    <td data-label="Status" style={{ padding: '24px 32px', borderBottom: '1px solid #e2e8f0' }}>
                      <span style={{ padding: '6px 12px', borderRadius: '999px', fontSize: '13px', fontWeight: 700, backgroundColor: colors.bg, color: colors.text }}>
                        {STATUS_LABELS[order.status] ?? order.status}
                      </span>
                    </td>
                    <td data-label="Cost" style={{ padding: '24px 32px', fontWeight: 700, color: '#0f172a', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>GHS {Number(order.deliveryFee).toFixed(2)}</td>
                    <td data-label="Action" style={{ padding: '24px 32px', textAlign: 'center', borderBottom: '1px solid #e2e8f0' }}>
                      <button onClick={() => toggleExpand(order.id)} style={{ background: 'none', border: 'none', color: 'var(--navy)', fontWeight: 600, cursor: 'pointer' }}>
                        {expandedOrderId === order.id ? 'Hide Details' : 'View More'}
                      </button>
                    </td>
                  </tr>
                  {expandedOrderId === order.id && (
                    <tr style={{ backgroundColor: '#f1f5f9' }}>
                      <td colSpan={5} style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', fontSize: '14px' }}>
                          <div><strong style={{ display: 'block', marginBottom: '4px' }}>Address</strong><span>{order.dropoffLocation}, {order.dropoffRegion}</span></div>
                          <div><strong style={{ display: 'block', marginBottom: '4px' }}>Carrier &amp; Option</strong><span>{formatVehicleSpeed(order)} • {order.batchId ? 'Bulk' : order.speed === 'express' || order.priority === 'high' ? 'Express' : 'Standard'}</span></div>
                          <div><strong style={{ display: 'block', marginBottom: '4px' }}>Instructions</strong><span>{order.additionalInstructions || 'None'}</span></div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function CustomerSettings() {
  return (
    <>
      <div className="billing-header-row" style={{ marginBottom: '40px' }}>
        <div>
          <h2 style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', marginBottom: '12px', letterSpacing: '-0.02em' }}>Customer Settings</h2>
          <p style={{ color: '#64748b', fontSize: '16px', fontWeight: 500 }}>Manage your account security and review your past orders.</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '32px' }}>
        <nav style={{ display: 'flex', gap: '8px', background: '#e2e8f0', padding: '6px', borderRadius: '12px' }}>
          <NavLink to="/settings/security" className={({ isActive }) => `neutral-btn ${isActive ? 'active-menu' : ''}`} style={({ isActive }) => ({ textAlign: 'center', textDecoration: 'none', border: 'none', background: isActive ? '#ffffff' : 'transparent', boxShadow: isActive ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: 600, fontSize: '15px', color: isActive ? '#0f172a' : '#64748b' })}>
            Password &amp; Security
          </NavLink>
          <NavLink to="/settings/orders" className={({ isActive }) => `neutral-btn ${isActive ? 'active-menu' : ''}`} style={({ isActive }) => ({ textAlign: 'center', textDecoration: 'none', border: 'none', background: isActive ? '#ffffff' : 'transparent', boxShadow: isActive ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: 600, fontSize: '15px', color: isActive ? '#0f172a' : '#64748b' })}>
            Order History
          </NavLink>
        </nav>

        <div style={{ width: '100%' }}>
          <Routes>
            <Route path="/" element={<Navigate to="security" replace />} />
            <Route path="security" element={<SharedPasswordView />} />
            <Route path="orders" element={<OrderHistoryView />} />
          </Routes>
        </div>
      </div>
    </>
  );
}
