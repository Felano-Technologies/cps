import { useState } from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import SharedPasswordView from './SharedPasswordView';

function NotificationPrefsView() {
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(false);
  const [delayedOrderAlerts, setDelayedOrderAlerts] = useState(true);

  return (
    <div className="card-style" style={{ padding: '32px', maxWidth: '600px' }}>
      <div className="section-heading-row" style={{ marginBottom: '24px' }}>
        <h3>Notification Preferences</h3>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', color: '#0f172a' }}>Email Alerts</h4>
            <div style={{ fontSize: '13px', color: '#64748b' }}>Receive daily summaries and critical alerts via email.</div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input type="checkbox" checked={emailAlerts} onChange={(e) => setEmailAlerts(e.target.checked)} style={{ width: '20px', height: '20px', accentColor: '#078c35' }} />
          </label>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', color: '#0f172a' }}>SMS Alerts</h4>
            <div style={{ fontSize: '13px', color: '#64748b' }}>Receive instant text messages for urgent operational issues.</div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input type="checkbox" checked={smsAlerts} onChange={(e) => setSmsAlerts(e.target.checked)} style={{ width: '20px', height: '20px', accentColor: '#078c35' }} />
          </label>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', color: '#0f172a' }}>Delayed Orders</h4>
            <div style={{ fontSize: '13px', color: '#64748b' }}>Notify me immediately when an order misses its ETA.</div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input type="checkbox" checked={delayedOrderAlerts} onChange={(e) => setDelayedOrderAlerts(e.target.checked)} style={{ width: '20px', height: '20px', accentColor: '#078c35' }} />
          </label>
        </div>

        <button className="primary-green" style={{ alignSelf: 'flex-start', marginTop: '16px', padding: '12px 24px', borderRadius: '8px', fontWeight: 600 }}>
          Save Preferences
        </button>
      </div>
    </div>
  );
}

export default function OpsSettings() {
  return (
    <>
      <div className="billing-header-row" style={{ marginBottom: '40px' }}>
        <div>
          <h2 style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', marginBottom: '12px', letterSpacing: '-0.02em' }}>Operations Settings</h2>
          <p style={{ color: '#64748b', fontSize: '16px', fontWeight: 500 }}>Manage your security and operational notification preferences.</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '32px' }}>
        <nav style={{ display: 'flex', gap: '8px', background: '#e2e8f0', padding: '6px', borderRadius: '12px' }}>
          <NavLink to="/settings/security" className={({ isActive }) => `neutral-btn ${isActive ? 'active-menu' : ''}`} style={({ isActive }) => ({ textAlign: 'center', textDecoration: 'none', border: 'none', background: isActive ? '#ffffff' : 'transparent', boxShadow: isActive ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: 600, fontSize: '15px', color: isActive ? '#0f172a' : '#64748b' })}>
            Password &amp; Security
          </NavLink>
          <NavLink to="/settings/notifications" className={({ isActive }) => `neutral-btn ${isActive ? 'active-menu' : ''}`} style={({ isActive }) => ({ textAlign: 'center', textDecoration: 'none', border: 'none', background: isActive ? '#ffffff' : 'transparent', boxShadow: isActive ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: 600, fontSize: '15px', color: isActive ? '#0f172a' : '#64748b' })}>
            Notifications
          </NavLink>
        </nav>

        <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
          <Routes>
            <Route path="/" element={<Navigate to="security" replace />} />
            <Route path="security" element={<SharedPasswordView />} />
            <Route path="notifications" element={<NotificationPrefsView />} />
          </Routes>
        </div>
      </div>
    </>
  );
}
