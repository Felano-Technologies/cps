import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Mail, Lock, Eye, EyeOff, UserPlus, AlertCircle, Zap, MapPinned, Clock3 } from 'lucide-react';
import { useAuth, getRoleDashboard } from '../../contexts/AuthContext';
import type { UserRole } from '../../contexts/AuthContext';
import cpsLogo from '../../assets/logo2.png';
import '../../styles/auth.css';

export default function SignUpPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('customer');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');

  const { signup, isLoading, error } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    try {
      const user = await signup(name, email, password, role);
      navigate(getRoleDashboard(user.role));
    } catch (err) {
      setLocalError('Failed to create account');
    }
  };

  return (
    <div className="page-shell light-shell">
      <div className="auth-shell container">
        <aside className="auth-panel">
          <div className="auth-panel-top">
            <img src={cpsLogo} alt="" />
          </div>
          <div className="auth-panel-copy">
            <h2>Create your account and start shipping.</h2>
            <p>Whether you're sending parcels or running the fleet, CPS gives you the tools to move faster.</p>
            <ul className="auth-panel-points">
              <li><span className="icon-chip"><Zap size={16} /></span> Same-day pickups &amp; drops</li>
              <li><span className="icon-chip"><MapPinned size={16} /></span> City-wide rider coverage</li>
              <li><span className="icon-chip"><Clock3 size={16} /></span> Real-time delivery updates</li>
            </ul>
          </div>
        </aside>

        <div className="auth-form-side">
          <div className="auth-card">
            <div className="auth-card-head">
              <h1>Create your account</h1>
              <p>Get started with CPS Delivery Services.</p>
            </div>

            {(error || localError) && (
              <div className="auth-error">
                <AlertCircle size={16} />
                {error || localError}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <label className="auth-field">
                <span>Full Name</span>
                <div className="auth-input-wrap">
                  <User size={17} className="leading-icon" />
                  <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="Jane Doe" />
                </div>
              </label>

              <label className="auth-field">
                <span>Email</span>
                <div className="auth-input-wrap">
                  <Mail size={17} className="leading-icon" />
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="name@company.com" />
                </div>
              </label>

              <label className="auth-field">
                <span>Password</span>
                <div className="auth-input-wrap">
                  <Lock size={17} className="leading-icon" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    className="auth-visibility-toggle"
                    onClick={() => setShowPassword(v => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </label>

              <label className="auth-field">
                <span>Account Type</span>
                <div className="auth-input-wrap">
                  <User size={17} className="leading-icon" />
                  <select value={role} onChange={e => setRole(e.target.value as UserRole)}>
                    <option value="customer">Customer</option>
                    <option value="operations">Operations / Dispatch</option>
                    <option value="rider">Rider / Courier</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
              </label>

              <button type="submit" disabled={isLoading} className="primary-green auth-submit">
                <UserPlus size={16} />
                {isLoading ? 'Creating...' : 'Sign Up'}
              </button>
            </form>

            <div className="auth-switch">
              Already have an account? <Link to="/signin">Sign In</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
