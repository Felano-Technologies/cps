import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth, getRoleDashboard } from '../contexts/AuthContext';
import type { UserRole } from '../contexts/AuthContext';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const { login, signup, isLoading, error } = useAuth();
  const navigate = useNavigate();

  const handleQuickLogin = async (role: UserRole) => {
    setLocalError('');
    try {
      const user = await signup(`Demo ${role}`, `demo@${role}.com`, 'password', role);
      navigate(getRoleDashboard(user.role));
    } catch (err) {
      setLocalError('Quick login failed');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    try {
      const user = await login(email, password);
      navigate(getRoleDashboard(user.role));
    } catch (err) {
      setLocalError('Invalid email or password');
    }
  };

  return (
    <div className="page-shell light-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
      <div className="form-card" style={{ width: 'min(400px, 100%)', margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '24px', color: 'var(--green-dark)' }}>Sign In</h2>
        {(error || localError) && (
          <div style={{ padding: '12px', background: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: '8px', marginBottom: '16px', fontSize: '0.9rem' }}>
            {error || localError}
          </div>
        )}
        <form onSubmit={handleSubmit} className="field-grid one-col">
          <label>
            <span>Email</span>
            <input 
              type="email" 
              required 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              placeholder="name@company.com" 
            />
          </label>
          <label>
            <span>Password</span>
            <input 
              type="password" 
              required 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="••••••••" 
            />
          </label>
          <button type="submit" disabled={isLoading} className="primary-green wide-btn" style={{ marginTop: '24px' }}>
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.9rem', color: '#64748b' }}>
          Don't have an account? <Link to="/signup" style={{ color: 'var(--green)', fontWeight: 600, textDecoration: 'none' }}>Sign Up</Link>
        </div>
        
        {/* Development Quick Login Section */}
        <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', textAlign: 'center', marginBottom: '16px', fontWeight: 700 }}>
            Development Quick Login
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
            <button type="button" onClick={() => handleQuickLogin('customer')} className="neutral-btn small" style={{ fontSize: '0.85rem' }}>Customer</button>
            <button type="button" onClick={() => handleQuickLogin('operations')} className="neutral-btn small" style={{ fontSize: '0.85rem' }}>Operations</button>
            <button type="button" onClick={() => handleQuickLogin('rider')} className="neutral-btn small" style={{ fontSize: '0.85rem' }}>Rider</button>
            <button type="button" onClick={() => handleQuickLogin('admin')} className="neutral-btn small" style={{ fontSize: '0.85rem' }}>Admin</button>
          </div>
        </div>
      </div>
    </div>
  );
}
