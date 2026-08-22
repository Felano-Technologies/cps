import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import cpsLogo from '../assets/cps-logo.png';

type Role = 'public' | 'customer' | 'operations' | 'rider';

const ROLE_LINKS: Record<Role, { path: string; label: string }[]> = {
  public: [
    { path: '/', label: 'Home' },
  ],
  customer: [
    { path: '/customer/pickup', label: 'Request Pickup' },
    { path: '/customer/shipments', label: 'My Shipments' },
    { path: '/settings', label: 'Settings' },
  ],
  operations: [
    { path: '/ops/board', label: 'Live Ops Board' },
    { path: '/ops/fleet', label: 'Fleet Management' },
    { path: '/ops/tracking', label: 'Tracking' },
    { path: '/settings', label: 'Settings' },
  ],
  rider: [
    { path: '/rider/route', label: 'Today\'s Route' },
    { path: '/rider/history', label: 'Completed Jobs' },
    { path: '/settings', label: 'Settings' },
  ],
};

export default function Topbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentRole, setCurrentRole] = useState<Role>('public');

  const links = ROLE_LINKS[currentRole];

  return (
    <header className="topbar">
      <div className="brand-title">
        <img src={cpsLogo} alt="CPS Delivery Services" className="brand-logo" />
      </div>
      
      <button 
        className="mobile-menu-btn" 
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        aria-label="Toggle menu"
      >
        ☰
      </button>

      <nav className={`nav-links ${mobileMenuOpen ? 'open' : ''}`} aria-label="Screen switcher">
        {links.map((link) => (
          <NavLink
            key={link.path}
            to={link.path}
            className={({ isActive }) => (isActive ? 'active' : '')}
            onClick={() => setMobileMenuOpen(false)}
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
      
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <select 
          value={currentRole} 
          onChange={(e) => setCurrentRole(e.target.value as Role)}
          style={{ minHeight: '36px', padding: '0 8px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
        >
          <option value="public">Role: Public</option>
          <option value="customer">Role: Customer</option>
          <option value="operations">Role: Operations</option>
          <option value="rider">Role: Rider</option>
        </select>
        <button className="primary-green small new-job-btn" style={{ marginLeft: 0 }}>New Job</button>
      </div>
    </header>
  );
}
