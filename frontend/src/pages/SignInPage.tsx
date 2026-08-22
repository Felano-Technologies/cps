import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const { login, isLoading, error } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    try {
      await login(email, password);
      navigate('/');
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
      </div>
    </div>
  );
}
