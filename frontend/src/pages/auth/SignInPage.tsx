import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, LogIn, AlertCircle, Phone } from 'lucide-react';
import { useAuth, getRoleDashboard } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import PhoneAuthPanel from '../../components/PhoneAuthPanel';
import cpsLogo from '../../assets/logo2.png';
import heroImg from '../../assets/hero.png';
import '../../styles/auth.css';

export default function SignInPage() {
  const [authMode, setAuthMode] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
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
      const user = await login(email, password);
      toast.success(`Welcome back, ${user.name}.`);
      navigate(getRoleDashboard(user.role));
    } catch (err) {
      setLocalError('Invalid email or password');
      toast.error('Invalid email or password');
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

            <div style={{ display: 'flex', gap: '8px', background: '#f1f5f9', padding: '6px', borderRadius: '12px', marginBottom: '24px' }}>
              <button
                type="button"
                onClick={() => setAuthMode('email')}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: authMode === 'email' ? '#fff' : 'transparent', color: authMode === 'email' ? '#0f172a' : '#64748b', boxShadow: authMode === 'email' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none' }}
              >
                <Mail size={16} /> Email
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('phone')}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: authMode === 'phone' ? '#fff' : 'transparent', color: authMode === 'phone' ? '#0f172a' : '#64748b', boxShadow: authMode === 'phone' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none' }}
              >
                <Phone size={16} /> Phone
              </button>
            </div>

            {authMode === 'email' ? (
              <>
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
              </>
            ) : (
              <PhoneAuthPanel mode="signin" />
            )}

            <div className="auth-switch">
              Don't have an account? <Link to="/signup">Sign Up</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
