import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import SharedPasswordView from './SharedPasswordView';

function VehicleDetailsView() {
  return (
    <div className="card-style" style={{ padding: '32px', maxWidth: '600px' }}>
      <div className="section-heading-row" style={{ marginBottom: '24px' }}>
        <h3>Vehicle Information</h3>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '8px' }}>Vehicle Type</label>
            <div style={{ padding: '12px 16px', background: '#f1f5f9', borderRadius: '8px', color: '#0f172a', fontWeight: 600 }}>Motorbike</div>
          </div>
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '8px' }}>License Plate</label>
            <div style={{ padding: '12px 16px', background: '#f1f5f9', borderRadius: '8px', color: '#0f172a', fontWeight: 600 }}>GT-1234-24</div>
          </div>
        </div>

        <div>
          <label style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '8px' }}>Make & Model</label>
          <div style={{ padding: '12px 16px', background: '#f1f5f9', borderRadius: '8px', color: '#0f172a', fontWeight: 600 }}>Honda ACE 110</div>
        </div>
        
        <div>
          <label style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '8px' }}>Insurance Status</label>
          <div style={{ display: 'inline-flex', padding: '6px 12px', background: '#dcfce7', color: '#166534', borderRadius: '20px', fontSize: '13px', fontWeight: 700 }}>
            Valid until Dec 2026
          </div>
        </div>

        <div style={{ marginTop: '16px', padding: '16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px' }}>
          <strong style={{ color: '#92400e', display: 'block', marginBottom: '4px' }}>Need to update vehicle info?</strong>
          <span style={{ fontSize: '14px', color: '#b45309' }}>Please contact Fleet Operations to process a vehicle change or update your insurance documentation.</span>
        </div>

      </div>
    </div>
  );
}

export default function RiderSettings() {
  return (
    <>
      <div className="billing-header-row" style={{ marginBottom: '40px' }}>
        <div>
          <h2 style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', marginBottom: '12px', letterSpacing: '-0.02em' }}>Rider Settings</h2>
          <p style={{ color: '#64748b', fontSize: '16px', fontWeight: 500 }}>Manage your security settings and view vehicle assignments.</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '32px' }}>
        <nav style={{ display: 'flex', gap: '8px', background: '#e2e8f0', padding: '6px', borderRadius: '12px' }}>
          <NavLink to="/settings/security" className={({ isActive }) => `neutral-btn ${isActive ? 'active-menu' : ''}`} style={({ isActive }) => ({ textAlign: 'center', border: 'none', background: isActive ? '#ffffff' : 'transparent', boxShadow: isActive ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: 600, fontSize: '15px', color: isActive ? '#0f172a' : '#64748b' })}>
            Password &amp; Security
          </NavLink>
          <NavLink to="/settings/vehicle" className={({ isActive }) => `neutral-btn ${isActive ? 'active-menu' : ''}`} style={({ isActive }) => ({ textAlign: 'center', border: 'none', background: isActive ? '#ffffff' : 'transparent', boxShadow: isActive ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: 600, fontSize: '15px', color: isActive ? '#0f172a' : '#64748b' })}>
            Vehicle Info
          </NavLink>
        </nav>

        <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
          <Routes>
            <Route path="/" element={<Navigate to="security" replace />} />
            <Route path="security" element={<SharedPasswordView />} />
            <Route path="vehicle" element={<VehicleDetailsView />} />
          </Routes>
        </div>
      </div>
    </>
  );
}
