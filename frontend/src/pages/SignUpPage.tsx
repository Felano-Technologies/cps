import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { UserRole } from '../contexts/AuthContext';

export default function SignUpPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('customer');
  const [localError, setLocalError] = useState('');
  
  const { signup, isLoading, error } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    try {
      await signup(name, email, password, role);
      navigate('/');
    } catch (err) {
      setLocalError('Failed to create account');
    }
  };

  return (
    <div className="page-shell light-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
      <div className="form-card" style={{ width: 'min(440px, 100%)', margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '24px', color: 'var(--green-dark)' }}>Create Account</h2>
        {(error || localError) && (
          <div style={{ padding: '12px', background: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: '8px', marginBottom: '16px', fontSize: '0.9rem' }}>
            {error || localError}
          </div>
        )}
        <form onSubmit={handleSubmit} className="field-grid one-col">
          <label>
            <span>Full Name</span>
            <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="Jane Doe" />
          </label>
          <label>
            <span>Email</span>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="name@company.com" />
          </label>
          <label>
            <span>Password</span>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
          </label>
          <label>
            <span>Account Type</span>
            <select value={role} onChange={e => setRole(e.target.value as UserRole)}>
              <option value="customer">Customer</option>
              <option value="operations">Operations/Dispatch</option>
              <option value="rider">Rider/Courier</option>
              <option value="admin">Administrator</option>
            </select>
          </label>
          
          <button type="submit" disabled={isLoading} className="primary-green wide-btn" style={{ marginTop: '24px' }}>
            {isLoading ? 'Creating...' : 'Sign Up'}
          </button>
        </form>
        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.9rem', color: '#64748b' }}>
          Already have an account? <Link to="/signin" style={{ color: 'var(--green)', fontWeight: 600, textDecoration: 'none' }}>Sign In</Link>
        </div>
      </div>
    </div>
  );
}
