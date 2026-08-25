import React, { useState } from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import SharedPasswordView from './SharedPasswordView';

function OrderHistoryView() {
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const orders = [
    {
      id: 'ORD-59281', date: 'Aug 25, 2026', status: 'Delivered', cost: 'GHS 45.00', items: '2 Packages',
      details: { address: '124 Spintex Road, Accra', carrier: 'CPS Same-Day', weight: '2.5 kg', instructions: 'Leave at front desk.' }
    },
    {
      id: 'ORD-59280', date: 'Aug 22, 2026', status: 'In Transit', cost: 'GHS 120.50', items: '1 Large Box',
      details: { address: 'KNUST Campus, Kumasi', carrier: 'CPS Freight', weight: '15 kg', instructions: 'Call upon arrival.' }
    },
  ];

  const toggleExpand = (id: string) => {
    setExpandedOrderId(expandedOrderId === id ? null : id);
  };

  return (
    <div className="card-style" style={{ padding: '32px' }}>
      <div className="section-heading-row" style={{ marginBottom: '24px' }}>
        <h3>Order History</h3>
      </div>
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
          {orders.map((order, index) => (
            <React.Fragment key={order.id}>
              <tr style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                <td data-label="Order ID" style={{ padding: '24px 32px', fontWeight: 600, color: '#0f172a', borderBottom: '1px solid #e2e8f0' }}>{order.id}</td>
                <td data-label="Date" style={{ padding: '24px 32px', color: '#475569', borderBottom: '1px solid #e2e8f0' }}>{order.date}</td>
                <td data-label="Status" style={{ padding: '24px 32px', borderBottom: '1px solid #e2e8f0' }}>
                  <span style={{ padding: '6px 12px', borderRadius: '999px', fontSize: '13px', fontWeight: 700, backgroundColor: order.status === 'Delivered' ? '#dcfce7' : '#fef08a', color: order.status === 'Delivered' ? '#166534' : '#854d0e' }}>
                    {order.status}
                  </span>
                </td>
                <td data-label="Cost" style={{ padding: '24px 32px', fontWeight: 700, color: '#0f172a', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>{order.cost}</td>
                <td data-label="Action" style={{ padding: '24px 32px', textAlign: 'center', borderBottom: '1px solid #e2e8f0' }}>
                  <button onClick={() => toggleExpand(order.id)} style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 600, cursor: 'pointer' }}>
                    {expandedOrderId === order.id ? 'Hide Details' : 'View More'}
                  </button>
                </td>
              </tr>
              {expandedOrderId === order.id && (
                <tr style={{ backgroundColor: '#f1f5f9' }}>
                  <td colSpan={5} style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', fontSize: '14px' }}>
                      <div><strong style={{ display: 'block', marginBottom: '4px' }}>Address</strong><span>{order.details.address}</span></div>
                      <div><strong style={{ display: 'block', marginBottom: '4px' }}>Carrier & Weight</strong><span>{order.details.carrier} • {order.details.weight}</span></div>
                      <div><strong style={{ display: 'block', marginBottom: '4px' }}>Instructions</strong><span>{order.details.instructions}</span></div>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
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
          <NavLink to="/settings/security" className={({ isActive }) => `neutral-btn ${isActive ? 'active-menu' : ''}`} style={({ isActive }) => ({ textAlign: 'center', border: 'none', background: isActive ? '#ffffff' : 'transparent', boxShadow: isActive ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: 600, fontSize: '15px', color: isActive ? '#0f172a' : '#64748b' })}>
            Password &amp; Security
          </NavLink>
          <NavLink to="/settings/orders" className={({ isActive }) => `neutral-btn ${isActive ? 'active-menu' : ''}`} style={({ isActive }) => ({ textAlign: 'center', border: 'none', background: isActive ? '#ffffff' : 'transparent', boxShadow: isActive ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: 600, fontSize: '15px', color: isActive ? '#0f172a' : '#64748b' })}>
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
