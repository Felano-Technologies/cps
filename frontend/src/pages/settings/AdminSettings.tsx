import React, { useState } from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import SharedPasswordView from './SharedPasswordView';

function SystemConfigView() {
  const [baseFee, setBaseFee] = useState('15.00');
  const [expressMultiplier, setExpressMultiplier] = useState('1.5');
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    alert('System configuration saved successfully.');
  };

  return (
    <div className="card-style" style={{ padding: '32px', maxWidth: '600px' }}>
      <div className="section-heading-row" style={{ marginBottom: '24px' }}>
        <h3>Global System Configuration</h3>
      </div>
      
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '8px' }}>Base Delivery Fee (GHS)</label>
            <input 
              type="number" 
              value={baseFee} 
              onChange={(e) => setBaseFee(e.target.value)} 
              step="0.01"
              style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px' }} 
            />
          </div>
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '8px' }}>Express Multiplier</label>
            <input 
              type="number" 
              value={expressMultiplier} 
              onChange={(e) => setExpressMultiplier(e.target.value)} 
              step="0.1"
              style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px' }} 
            />
          </div>
        </div>

        <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', color: '#0f172a' }}>Maintenance Mode</h4>
              <div style={{ fontSize: '13px', color: '#64748b' }}>Disables new customer orders while active. Ops and Riders can still log in.</div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input type="checkbox" checked={maintenanceMode} onChange={(e) => setMaintenanceMode(e.target.checked)} style={{ width: '20px', height: '20px', accentColor: '#ef4444' }} />
            </label>
          </div>
        </div>

        <button type="submit" className="primary-green" style={{ alignSelf: 'flex-start', padding: '12px 32px', borderRadius: '8px', fontWeight: 700 }}>
          Save Configuration
        </button>

      </form>
    </div>
  );
}

export default function AdminSettings() {
  return (
    <>
      <div className="billing-header-row" style={{ marginBottom: '40px' }}>
        <div>
          <h2 style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', marginBottom: '12px', letterSpacing: '-0.02em' }}>Admin Settings</h2>
          <p style={{ color: '#64748b', fontSize: '16px', fontWeight: 500 }}>Manage global system parameters and your admin credentials.</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '32px' }}>
        <nav style={{ display: 'flex', gap: '8px', background: '#e2e8f0', padding: '6px', borderRadius: '12px' }}>
          <NavLink to="/settings/security" className={({ isActive }) => `neutral-btn ${isActive ? 'active-menu' : ''}`} style={({ isActive }) => ({ textAlign: 'center', border: 'none', background: isActive ? '#ffffff' : 'transparent', boxShadow: isActive ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: 600, fontSize: '15px', color: isActive ? '#0f172a' : '#64748b' })}>
            Password &amp; Security
          </NavLink>
          <NavLink to="/settings/system" className={({ isActive }) => `neutral-btn ${isActive ? 'active-menu' : ''}`} style={({ isActive }) => ({ textAlign: 'center', border: 'none', background: isActive ? '#ffffff' : 'transparent', boxShadow: isActive ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: 600, fontSize: '15px', color: isActive ? '#0f172a' : '#64748b' })}>
            System Config
          </NavLink>
        </nav>

        <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
          <Routes>
            <Route path="/" element={<Navigate to="security" replace />} />
            <Route path="security" element={<SharedPasswordView />} />
            <Route path="system" element={<SystemConfigView />} />
          </Routes>
        </div>
      </div>
    </>
  );
}
