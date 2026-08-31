import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Phone, Lock, Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';
import { useAuth, getRoleDashboard } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import cpsLogo from '../../assets/logo2.png';
import heroImg from '../../assets/hero.png';
import '../../styles/auth.css';

export default function SignInPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');
  const { login, isLoading, error } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    try {
      const user = await login(identifier, password);
      toast.success(`Welcome back, ${user.name}.`);
      navigate(getRoleDashboard(user.role));
    } catch (err) {
      setLocalError('Invalid phone number or password');
      toast.error('Invalid phone number or password');
    }
  };

  return (
    <div className="page-shell light-shell auth-page">
      <div className="auth-topbar">
        <Link to="/">
          <img src={cpsLogo} alt="CPS Delivery Services" />
        </Link>
      </div>

      <div className="auth-shell">
        <aside className="auth-visual">
          <img src={heroImg} alt="CPS rider preparing a delivery" />
          <div className="auth-visual-caption">
            <h2>Dispatch, track, and deliver.</h2>
            <p>Sign in to manage pickups, monitor riders, and keep every delivery on schedule.</p>
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
                <span>Phone Number</span>
                <div className="auth-input-wrap">
                  <Phone size={17} className="leading-icon" />
                  <input
                    type="tel"
                    required
                    value={identifier}
                    onChange={e => setIdentifier(e.target.value)}
                    placeholder="0241234567"
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
