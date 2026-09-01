import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Phone, Lock, Eye, EyeOff, UserPlus, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import cpsLogo from '../../assets/logo2.png';
import heroImg from '../../assets/hero.png';
import '../../styles/auth.css';

export default function SignUpPage() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');

  const { signup, isLoading, error } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    try {
      await signup(name, phone, password);
      toast.success('Account created — verify your phone to continue.');
      navigate('/verify-phone');
    } catch (err) {
      setLocalError('Failed to create account');
      toast.error('Failed to create account');
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
            <h2>Create your account and start shipping.</h2>
            <p>Whether you're sending parcels or running the fleet, CPS gives you the tools to move faster.</p>
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
                <span>Phone Number</span>
                <div className="auth-input-wrap">
                  <Phone size={17} className="leading-icon" />
                  <input type="tel" required value={phone} onChange={e => setPhone(e.target.value)} placeholder="0241234567" />
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
                <UserPlus size={16} />
                {isLoading ? 'Creating...' : 'Sign Up'}
              </button>
            </form>

            <div className="auth-switch">
              Already have an account? <Link to="/signin">Sign In</Link>
            </div>

            <p style={{ fontSize: '13px', color: '#64748b', textAlign: 'center', marginTop: '16px', lineHeight: 1.5 }}>
              Signing up as a rider? Contact operations — they'll create and verify your account for you.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
