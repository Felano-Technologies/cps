import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Mail, Lock, Eye, EyeOff, UserPlus, AlertCircle, Phone } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import type { UserRole } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import CustomSelect from '../../components/Form/CustomSelect';
import PhoneAuthPanel from '../../components/PhoneAuthPanel';
import cpsLogo from '../../assets/logo2.png';
import heroImg from '../../assets/hero.png';
import '../../styles/auth.css';

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'customer', label: 'Customer' },
  { value: 'operations', label: 'Operations / Dispatch' },
  { value: 'rider', label: 'Rider / Courier' },
];

export default function SignUpPage() {
  const [authMode, setAuthMode] = useState<'email' | 'phone'>('email');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('customer');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');

  const { signup, isLoading, error } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    try {
      await signup(name, email, password, role);
      toast.success('Account created — sign in to continue.');
      navigate('/signin');
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

            {authMode === 'phone' ? (
              <PhoneAuthPanel mode="signup" />
            ) : (
              <>
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
                <CustomSelect
                  value={role}
                  onChange={v => setRole(v as UserRole)}
                  options={ROLE_OPTIONS}
                  icon={<User size={17} />}
                />
              </label>

              <button type="submit" disabled={isLoading} className="primary-green auth-submit">
                <UserPlus size={16} />
                {isLoading ? 'Creating...' : 'Sign Up'}
              </button>
            </form>
              </>
            )}

            <div className="auth-switch">
              Already have an account? <Link to="/signin">Sign In</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
