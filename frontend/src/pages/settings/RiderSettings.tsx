import { useEffect, useState } from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import SharedPasswordView from './SharedPasswordView';
import api from '../../services/api';
import type { RiderProfile } from '../../types/models';

function formatStatusLabel(status: string): string {
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatVehicleType(type: string | null): string {
  if (!type) return 'Not assigned';
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function VehicleDetailsView() {
  const [profile, setProfile] = useState<RiderProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get<RiderProfile>('/riders/me');
        setProfile(data);
      } catch {
        setError('Failed to load your vehicle information.');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  if (isLoading) {
    return (
      <div className="card-style" style={{ padding: '32px', maxWidth: '600px', textAlign: 'center', color: '#64748b' }}>
        Loading vehicle information…
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="card-style" style={{ padding: '32px', maxWidth: '600px', textAlign: 'center', color: '#991b1b', fontWeight: 600 }}>
        {error ?? 'Vehicle information unavailable.'}
      </div>
    );
  }

  return (
    <div className="card-style" style={{ padding: '32px', maxWidth: '600px' }}>
      <div className="section-heading-row" style={{ marginBottom: '24px' }}>
        <h3>Vehicle Information</h3>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '8px' }}>Vehicle Type</label>
            <div style={{ padding: '12px 16px', background: '#f1f5f9', borderRadius: '8px', color: profile.vehicleType ? '#0f172a' : '#94a3b8', fontWeight: 600 }}>
              {formatVehicleType(profile.vehicleType)}
            </div>
          </div>
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '8px' }}>Vehicle ID</label>
            <div style={{ padding: '12px 16px', background: '#f1f5f9', borderRadius: '8px', color: profile.vehicleId ? '#0f172a' : '#94a3b8', fontWeight: 600 }}>
              {profile.vehicleId ?? 'Not assigned'}
            </div>
          </div>
        </div>

        <div>
          <label style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '8px' }}>Current Status</label>
          <div style={{ display: 'inline-flex', padding: '6px 12px', background: '#dcfce7', color: '#166534', borderRadius: '20px', fontSize: '13px', fontWeight: 700 }}>
            {formatStatusLabel(profile.currentStatus)}
          </div>
        </div>

        {!profile.vehicleId && (
          <div style={{ marginTop: '16px', padding: '16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px' }}>
            <strong style={{ color: '#92400e', display: 'block', marginBottom: '4px' }}>No vehicle assigned yet</strong>
            <span style={{ fontSize: '14px', color: '#b45309' }}>Please contact Fleet Operations to have a vehicle assigned to your account.</span>
          </div>
        )}

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
          <NavLink to="/settings/security" className={({ isActive }) => `neutral-btn ${isActive ? 'active-menu' : ''}`} style={({ isActive }) => ({ textAlign: 'center', textDecoration: 'none', border: 'none', background: isActive ? '#ffffff' : 'transparent', boxShadow: isActive ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: 600, fontSize: '15px', color: isActive ? '#0f172a' : '#64748b' })}>
            Password &amp; Security
          </NavLink>
          <NavLink to="/settings/vehicle" className={({ isActive }) => `neutral-btn ${isActive ? 'active-menu' : ''}`} style={({ isActive }) => ({ textAlign: 'center', textDecoration: 'none', border: 'none', background: isActive ? '#ffffff' : 'transparent', boxShadow: isActive ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: 600, fontSize: '15px', color: isActive ? '#0f172a' : '#64748b' })}>
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
