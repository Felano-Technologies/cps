import React, { useState } from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';

function PasswordChangeView() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real application, you would make an API call here.
    if (newPassword !== confirmPassword) {
      alert("New passwords do not match.");
      return;
    }
    alert('Password successfully changed.');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="card-style" style={{ padding: '32px' }}>
      <div className="section-heading-row" style={{ marginBottom: '24px' }}>
        <h3>Change Password</h3>
      </div>
      <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '440px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '14px', fontWeight: 600, color: '#334155' }}>Current Password</label>
          <input
            type="password"
            className="input-field"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            placeholder="Enter current password"
            style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px' }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '14px', fontWeight: 600, color: '#334155' }}>New Password</label>
          <input
            type="password"
            className="input-field"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            placeholder="Enter new password"
            style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px' }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '14px', fontWeight: 600, color: '#334155' }}>Confirm New Password</label>
          <input
            type="password"
            className="input-field"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            placeholder="Confirm new password"
            style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px' }}
          />
        </div>
        <button type="submit" className="dark-btn wide-action" style={{ marginTop: '16px', padding: '14px', borderRadius: '8px', fontWeight: 600, fontSize: '15px', cursor: 'pointer' }}>
          Update Password
        </button>
      </form>
    </div>
  );
}

function OrderHistoryView() {
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const orders = [
    {
      id: 'ORD-59281', date: 'Aug 25, 2026', status: 'Delivered', cost: '$45.00', items: '2 Packages',
      details: { address: '123 Tech Lane, San Francisco, CA', carrier: 'FedEx Same-Day', weight: '12 lbs', instructions: 'Leave at front desk.' }
    },
    {
      id: 'ORD-59280', date: 'Aug 22, 2026', status: 'In Transit', cost: '$120.50', items: '1 Pallet',
      details: { address: '990 Industrial Blvd, Austin, TX', carrier: 'CPS Freight', weight: '250 lbs', instructions: 'Dock 4 delivery.' }
    },
    {
      id: 'ORD-59275', date: 'Aug 10, 2026', status: 'Delivered', cost: '$25.00', items: '1 Document',
      details: { address: '45 Wall St, New York, NY', carrier: 'USPS Priority', weight: '0.5 lbs', instructions: 'Signature required.' }
    },
    {
      id: 'ORD-59102', date: 'Jul 28, 2026', status: 'Cancelled', cost: '$0.00', items: '3 Packages',
      details: { address: '77 Pineapple St, Honolulu, HI', carrier: 'UPS Ground', weight: '45 lbs', instructions: 'Cancelled by customer.' }
    },
    {
      id: 'ORD-58999', date: 'Jul 15, 2026', status: 'Delivered', cost: '$75.20', items: '5 Packages',
      details: { address: '100 Main St, Seattle, WA', carrier: 'Amazon Logistics', weight: '30 lbs', instructions: 'Leave on porch.' }
    },
  ];

  const toggleExpand = (id: string) => {
    if (expandedOrderId === id) {
      setExpandedOrderId(null);
    } else {
      setExpandedOrderId(id);
    }
  };

  return (
    <div className="card-style" style={{ padding: '32px' }}>
      <div className="section-heading-row" style={{ marginBottom: '24px' }}>
        <h3>Order History</h3>
      </div>

        <table className="responsive-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0' }}>
          <thead>
            <tr style={{ textAlign: 'left' }}>
              <th style={{ padding: '24px 32px', fontWeight: 600, color: '#64748b', borderBottom: '2px solid #e2e8f0', fontSize: '15px' }}>Order ID</th>
              <th style={{ padding: '24px 32px', fontWeight: 600, color: '#64748b', borderBottom: '2px solid #e2e8f0', fontSize: '15px' }}>Date</th>
              <th style={{ padding: '24px 32px', fontWeight: 600, color: '#64748b', borderBottom: '2px solid #e2e8f0', fontSize: '15px' }}>Items</th>
              <th style={{ padding: '24px 32px', fontWeight: 600, color: '#64748b', borderBottom: '2px solid #e2e8f0', fontSize: '15px' }}>Status</th>
              <th style={{ padding: '24px 32px', fontWeight: 600, color: '#64748b', borderBottom: '2px solid #e2e8f0', fontSize: '15px', textAlign: 'right' }}>Cost</th>
              <th style={{ padding: '24px 32px', fontWeight: 600, color: '#64748b', borderBottom: '2px solid #e2e8f0', fontSize: '15px', textAlign: 'center' }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order, index) => (
            <React.Fragment key={order.id}>
              <tr style={{ transition: 'background-color 0.2s ease', backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                <td data-label="Order ID" style={{ padding: '24px 32px', fontWeight: 600, color: '#0f172a', borderBottom: '1px solid #e2e8f0' }}>{order.id}</td>
                <td data-label="Date" style={{ padding: '24px 32px', color: '#475569', borderBottom: '1px solid #e2e8f0', fontSize: '15px' }}>{order.date}</td>
                <td data-label="Items" style={{ padding: '24px 32px', color: '#475569', borderBottom: '1px solid #e2e8f0', fontSize: '15px' }}>{order.items}</td>
                <td data-label="Status" style={{ padding: '24px 32px', borderBottom: '1px solid #e2e8f0' }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '6px 12px',
                    borderRadius: '999px',
                    fontSize: '13px',
                    fontWeight: 700,
                    backgroundColor: order.status === 'Delivered' ? '#dcfce7' : order.status === 'In Transit' ? '#fef08a' : '#f1f5f9',
                    color: order.status === 'Delivered' ? '#166534' : order.status === 'In Transit' ? '#854d0e' : '#475569',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                  }}>
                    {order.status}
                  </span>
                </td>
                <td data-label="Cost" style={{ padding: '24px 32px', fontWeight: 700, color: '#0f172a', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>{order.cost}</td>
                <td data-label="Action" style={{ padding: '24px 32px', textAlign: 'center', borderBottom: '1px solid #e2e8f0' }}>
                  <button
                    onClick={() => toggleExpand(order.id)}
                    style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 600, cursor: 'pointer', fontSize: '14px' }}
                  >
                    {expandedOrderId === order.id ? 'Hide Details' : 'View More'}
                  </button>
                </td>
              </tr>
              {expandedOrderId === order.id && (
                <tr style={{ backgroundColor: '#f1f5f9' }}>
                  <td colSpan={6} style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', fontSize: '14px', color: '#334155' }}>
                      <div>
                        <strong style={{ display: 'block', color: '#0f172a', marginBottom: '4px' }}>Delivery Address</strong>
                        <span>{order.details.address}</span>
                      </div>
                      <div>
                        <strong style={{ display: 'block', color: '#0f172a', marginBottom: '4px' }}>Carrier & Weight</strong>
                        <span>{order.details.carrier} • {order.details.weight}</span>
                      </div>
                      <div>
                        <strong style={{ display: 'block', color: '#0f172a', marginBottom: '4px' }}>Special Instructions</strong>
                        <span>{order.details.instructions}</span>
                      </div>
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

export default function SettingsPage() {
  return (
    <div className="page-shell light-shell">
      <main className="container billing-screen">
        <div className="billing-header-row" style={{ marginBottom: '40px' }}>
          <div>
            <h2 style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', marginBottom: '12px', letterSpacing: '-0.02em' }}>Account Settings</h2>
            <p style={{ color: '#64748b', fontSize: '16px', fontWeight: 500 }}>Manage your account security and review your past orders.</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '32px' }}>
          {/* Top Navigation Tabs */}
          <nav style={{ display: 'flex', gap: '8px', background: '#e2e8f0', padding: '6px', borderRadius: '12px' }}>
            <NavLink 
              to="/settings/security" 
              className={({ isActive }) => `neutral-btn ${isActive ? 'active-menu' : ''}`} 
              style={({ isActive }) => ({
                textAlign: 'center', 
                border: 'none', 
                background: isActive ? '#ffffff' : 'transparent', 
                boxShadow: isActive ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                padding: '10px 24px', 
                borderRadius: '8px', 
                fontWeight: 600, 
                fontSize: '15px',
                color: isActive ? '#0f172a' : '#64748b'
              })}
            >
              Password &amp; Security
            </NavLink>
            <NavLink 
              to="/settings/orders" 
              className={({ isActive }) => `neutral-btn ${isActive ? 'active-menu' : ''}`} 
              style={({ isActive }) => ({
                textAlign: 'center', 
                border: 'none', 
                background: isActive ? '#ffffff' : 'transparent', 
                boxShadow: isActive ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                padding: '10px 24px', 
                borderRadius: '8px', 
                fontWeight: 600, 
                fontSize: '15px',
                color: isActive ? '#0f172a' : '#64748b'
              })}
            >
              Order History
            </NavLink>
          </nav>

          {/* Main Content Area */}
          <div style={{ width: '100%' }}>
            <Routes>
              <Route path="/" element={<Navigate to="security" replace />} />
              <Route path="security" element={<PasswordChangeView />} />
              <Route path="orders" element={<OrderHistoryView />} />
            </Routes>
          </div>
        </div>
      </main>
    </div>
  );
}
