import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, ChevronDown, LogOut, Settings } from 'lucide-react';
import cpsLogo from '../assets/logo2.png';
import { useAuth } from '../contexts/AuthContext';
import NotificationBell from './NotificationBell';
import VerifyPhoneBanner from './VerifyPhoneBanner';

const PUBLIC_LINKS: { path: string; label: string }[] = [
  { path: '/', label: 'Home' },
  { path: '/about', label: 'About Us' },
  { path: '/services', label: 'Services' },
  { path: '/contact', label: 'Contact Us' },
  { path: '/faq', label: 'FAQ' },
];

export const ROLE_LINKS: Record<string, { path: string; label: string }[]> = {
  customer: [
    { path: '/request-pickup', label: 'Request Pickup' },
    { path: '/shipments', label: 'My Shipments' },
    { path: '/settings', label: 'Settings' },
  ],
  operations: [
    { path: '/ops-board', label: 'Live Ops Board' },
    { path: '/fleet', label: 'Fleet Management' },
    { path: '/ops/deductions', label: 'Rider Deductions' },
    { path: '/ops-alerts', label: 'Alerts' },
    { path: '/ops-analytics', label: 'Analytics' },
    { path: '/settings', label: 'Settings' },
  ],
  admin: [
    { path: '/admin', label: 'Admin Panel' },
    { path: '/settings', label: 'Settings' },
  ],
  rider: [
    { path: '/rider-board', label: 'Dashboard' },
    { path: '/route', label: 'Active Route' },
    { path: '/settings', label: 'Settings' },
  ],
};

export default function Topbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setMobileMenuOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    setUserMenuOpen(false);
    navigate('/');
  };

  const links = isAuthenticated && user ? ROLE_LINKS[user.role] || [] : PUBLIC_LINKS;

  return (
    <>
    <header className="topbar">
      <div className="topbar-inner">
      <div className="brand-title">
          <NavLink to="/">
            <img src={cpsLogo} alt="CPS Delivery Services" className="brand-logo" />
          </NavLink>
        </div>

        <button
          className={`mobile-menu-btn${mobileMenuOpen ? ' open' : ''}`}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X size={24} strokeWidth={2.25} /> : <Menu size={24} strokeWidth={2.25} />}
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
          
          <div className="mobile-auth-links">
            {!isAuthenticated ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <NavLink to="/signup" className="primary-green" style={{ textDecoration: 'none', textAlign: 'center' }} onClick={() => setMobileMenuOpen(false)}>
                  Sign Up
                </NavLink>
                <NavLink to="/signin" className="neutral-btn" style={{ textDecoration: 'none', textAlign: 'center' }} onClick={() => setMobileMenuOpen(false)}>
                  Sign In
                </NavLink>
              </div>
            ) : (
              <div className="mobile-profile-section">
                <div className="mobile-user-info">
                  <div className="m-name">{user?.name}</div>
                  <div className="m-email">{user?.phone ?? user?.email}</div>
                  <div className="m-role">{user?.role}</div>
                </div>
                <NavLink to="/settings" className="mobile-menu-item" onClick={() => setMobileMenuOpen(false)}>
                  View Account
                </NavLink>
                <button onClick={handleLogout} className="mobile-menu-danger">
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </nav>
        
        <div className="auth-area desktop-auth" style={{ display: 'flex', gap: '10px', alignItems: 'center', position: 'relative' }}>
          {!isAuthenticated ? (
            <>
              <NavLink to="/signin" className="neutral-btn" style={{ textDecoration: 'none', padding: '8px 20px' }}>
                Sign In
              </NavLink>
              <NavLink to="/signup" className="primary-green" style={{ textDecoration: 'none', padding: '8px 20px' }}>
                Sign Up
              </NavLink>
            </>
          ) : (
            <>
            <NotificationBell />
            <div style={{ position: 'relative' }}>
              <button
                style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'transparent', border: 'none', padding: 0 }}
                onClick={() => setUserMenuOpen(!userMenuOpen)}
              >
                <div className="user-box" style={{
                  width: '40px', height: '40px', cursor: 'pointer', flexShrink: 0,
                  background: 'linear-gradient(135deg, var(--lime) 0%, #34d399 100%)',
                  color: '#0f172a', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: '50%', boxShadow: '0 4px 10px rgba(131, 211, 20, 0.3)',
                  border: '2px solid #fff', transition: 'transform 0.2s var(--ease-out)'
                }}>
                  {user?.name.charAt(0)}
                </div>
                <span style={{
                  fontWeight: 600, color: '#fff', fontSize: '0.88rem',
                  maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                }}>
                  {user?.name}
                </span>
                <ChevronDown size={16} style={{ color: 'rgba(255,255,255,0.7)', flexShrink: 0, transition: 'transform 0.2s var(--ease-out)', transform: userMenuOpen ? 'rotate(180deg)' : 'none' }} />
              </button>

              {userMenuOpen && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 12px)', right: 0,
                  background: '#ffffff',
                  border: '1px solid #e2e8f0', borderRadius: 'var(--radius-md)',
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
                      display: flex; align-items: center; gap: 8px; padding: 10px 12px; color: var(--text); text-decoration: none; border-radius: var(--radius-xs);
                      transition: all 0.2s; font-weight: 500;
                    }
                    .menu-item:hover { background: #f1f5f9; color: var(--navy); transform: translateX(4px); }
                    .menu-danger { display: flex; align-items: center; gap: 8px; color: var(--danger); width: 100%; text-align: left; padding: 10px 12px; background: transparent; border: none; border-radius: var(--radius-xs); font-weight: 500; transition: all 0.2s; cursor: pointer; }
                    .menu-danger:hover { background: var(--danger-bg); transform: translateX(4px); }
                  `}</style>
                  <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ fontWeight: 800, color: 'var(--navy)', fontSize: '1.1rem' }}>{user?.name}</div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{user?.phone ?? user?.email}</div>
                    <div style={{
                      display: 'inline-block', fontSize: '0.7rem', marginTop: '8px', padding: '4px 8px', borderRadius: 'var(--radius-xs)',
                      textTransform: 'uppercase', background: 'var(--success-bg)', color: 'var(--green-dark)', fontWeight: 800, letterSpacing: '0.05em'
                    }}>
                      {user?.role}
                    </div>
                  </div>
                  <NavLink to="/settings" className="menu-item" onClick={() => setUserMenuOpen(false)}>
                    <Settings size={16} /> View Account
                  </NavLink>
                  <button onClick={handleLogout} className="menu-danger" style={{ marginTop: '4px' }}>
                    <LogOut size={16} /> Sign Out
                  </button>
                </div>
              )}
            </div>
            </>
          )}
        </div>
      </div>
    </header>
    {isAuthenticated && <VerifyPhoneBanner />}
    </>
  );
}
