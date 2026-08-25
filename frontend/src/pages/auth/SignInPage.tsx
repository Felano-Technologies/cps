import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, LogIn, AlertCircle, Radar, Truck, ShieldCheck } from 'lucide-react';
import { useAuth, getRoleDashboard } from '../../contexts/AuthContext';
import cpsLogo from '../../assets/logo2.png';
import '../../styles/auth.css';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');
  const { login, isLoading, error } = useAuth();
  const navigate = useNavigate();

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
    <div className="page-shell light-shell">
      <div className="auth-shell container">
        <aside className="auth-panel">
          <div className="auth-panel-top">
            <img src={cpsLogo} alt="" />
          </div>
          <div className="auth-panel-copy">
            <h2>Dispatch, track, and deliver — all in one place.</h2>
            <p>Sign in to manage pickups, monitor riders, and keep every delivery on schedule.</p>
            <ul className="auth-panel-points">
              <li><span className="icon-chip"><Radar size={16} /></span> Live rider tracking</li>
              <li><span className="icon-chip"><Truck size={16} /></span> Motorbike &amp; van dispatch</li>
              <li><span className="icon-chip"><ShieldCheck size={16} /></span> Verified proof of delivery</li>
            </ul>
          </div>
        </aside>

        <div className="auth-form-side">
          <div className="auth-card">
            <div className="auth-card-head">
              <h1>Welcome back</h1>
              <p>Sign in to your CPS Delivery account.</p>
            </div>

            {(error || localError) && (
              <div className="auth-error">
                <AlertCircle size={16} />
                {error || localError}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <label className="auth-field">
                <span>Email</span>
                <div className="auth-input-wrap">
                  <Mail size={17} className="leading-icon" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="name@company.com"
                  />
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

              <button type="submit" disabled={isLoading} className="primary-green auth-submit">
                <LogIn size={16} />
                {isLoading ? 'Signing In...' : 'Sign In'}
              </button>
            </form>

            <div className="auth-switch">
              Don't have an account? <Link to="/signup">Sign Up</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
