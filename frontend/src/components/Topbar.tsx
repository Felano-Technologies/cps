import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import cpsLogo from '../assets/cps-logo.png';
import { useAuth } from '../contexts/AuthContext';

const ROLE_LINKS: Record<string, { path: string; label: string }[]> = {
  customer: [
    { path: '/request-pickup', label: 'Request Pickup' },
    { path: '/shipments', label: 'My Shipments' },
    { path: '/settings', label: 'Settings' },
  ],
  operations: [
    { path: '/ops-board', label: 'Live Ops Board' },
    { path: '/fleet', label: 'Fleet Management' },
    { path: '/settings', label: 'Settings' },
  ],
  admin: [
    { path: '/admin', label: 'Admin Panel' },
    { path: '/settings', label: 'Settings' },
  ],
  rider: [
    { path: '/route', label: 'Today\'s Route' },
    { path: '/settings', label: 'Settings' },
  ],
};

export default function Topbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    setUserMenuOpen(false);
    navigate('/');
  };

  const links = isAuthenticated && user ? ROLE_LINKS[user.role] || [] : [{ path: '/', label: 'Home' }];

  return (
    <header className="topbar">
      <div className="brand-title">
        <NavLink to="/">
          <img src={cpsLogo} alt="CPS Delivery Services" className="brand-logo" />
        </NavLink>
      </div>
      
      <button 
        className="mobile-menu-btn" 
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        aria-label="Toggle menu"
      >
        ☰
      </button>

      <nav className={`nav-links ${mobileMenuOpen ? 'open' : ''}`} aria-label="Main Navigation">
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
      
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', position: 'relative' }}>
        {!isAuthenticated ? (
          <NavLink to="/signin" className="dark-btn" style={{ textDecoration: 'none', padding: '8px 20px' }}>
            Sign In
          </NavLink>
        ) : (
          <div style={{ position: 'relative' }}>
            <button 
              style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'transparent', border: 'none', padding: 0 }}
              onClick={() => setUserMenuOpen(!userMenuOpen)}
            >
              <div className="user-box" style={{ 
                width: '44px', height: '44px', cursor: 'pointer', 
                background: 'linear-gradient(135deg, var(--lime) 0%, #34d399 100%)', 
                color: '#0f172a', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '50%', boxShadow: '0 4px 10px rgba(131, 211, 20, 0.3)',
                border: '2px solid #fff', transition: 'transform 0.2s var(--ease-out)'
              }}>
                {user?.name.charAt(0)}
              </div>
            </button>

            {userMenuOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 12px)', right: 0,
                background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255,255,255,1)', borderRadius: '16px',
                boxShadow: '0 12px 40px rgba(15, 23, 42, 0.12), 0 4px 12px rgba(0,0,0,0.05)', 
                padding: '16px', minWidth: '240px', zIndex: 50,
                animation: 'slideDown 0.3s var(--ease-out) forwards',
                transformOrigin: 'top right'
              }}>
                <style>{`
                  @keyframes slideDown {
                    from { opacity: 0; transform: scale(0.95) translateY(-10px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                  }
                  .menu-item {
                    display: block; padding: 10px 12px; color: var(--text); text-decoration: none; border-radius: 10px;
                    transition: all 0.2s; font-weight: 500;
                  }
                  .menu-item:hover { background: #f1f5f9; color: var(--navy); transform: translateX(4px); }
                  .menu-danger { color: var(--danger); width: 100%; text-align: left; padding: 10px 12px; background: transparent; border: none; border-radius: 10px; font-weight: 500; transition: all 0.2s; cursor: pointer; }
                  .menu-danger:hover { background: var(--danger-bg); transform: translateX(4px); }
                `}</style>
                <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 800, color: 'var(--navy)', fontSize: '1.1rem' }}>{user?.name}</div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{user?.email}</div>
                  <div style={{ 
                    display: 'inline-block', fontSize: '0.7rem', marginTop: '8px', padding: '4px 8px', borderRadius: '8px',
                    textTransform: 'uppercase', background: 'var(--success-bg)', color: 'var(--green-dark)', fontWeight: 800, letterSpacing: '0.05em' 
                  }}>
                    {user?.role}
                  </div>
                </div>
                <NavLink to="/settings" className="menu-item" onClick={() => setUserMenuOpen(false)}>
                  Settings
                </NavLink>
                <button onClick={handleLogout} className="menu-danger" style={{ marginTop: '4px' }}>
                  Sign Out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
