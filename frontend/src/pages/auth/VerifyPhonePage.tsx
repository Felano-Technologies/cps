import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { KeyRound, ShieldCheck, AlertCircle, RotateCw } from 'lucide-react';
import { useAuth, getRoleDashboard } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import cpsLogo from '../../assets/logo2.png';
import heroImg from '../../assets/hero.png';
import '../../styles/auth.css';

export default function VerifyPhonePage() {
  const { user, requestPhoneVerification, confirmPhoneVerification, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    setIsSubmitting(true);
    try {
      const updated = await confirmPhoneVerification(code);
      toast.success('Phone number verified.');
      navigate(getRoleDashboard(updated.role));
    } catch {
      setLocalError('Invalid or expired code. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    setLocalError('');
    setIsResending(true);
    try {
      await requestPhoneVerification();
      toast.success('New code sent.');
    } catch {
      setLocalError('Failed to resend code. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/signin');
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
            <h2>One last step.</h2>
            <p>Verify your phone number so we can keep your account and deliveries secure.</p>
          </div>
        </aside>

        <div className="auth-form-side">
          <div className="auth-card">
            <div className="auth-card-head">
              <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: '#e0ffe0', color: '#078c35', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                <ShieldCheck size={28} />
              </div>
              <h1>Verify your phone</h1>
              <p>
                We sent a 6-digit code to <strong>{user?.phone}</strong>. Enter it below to activate your account.
              </p>
            </div>

            {localError && (
              <div className="auth-error">
                <AlertCircle size={16} />
                {localError}
              </div>
            )}

            <form onSubmit={handleConfirm}>
              <label className="auth-field">
                <span>Verification Code</span>
                <div className="auth-input-wrap">
                  <KeyRound size={17} className="leading-icon" />
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    maxLength={6}
                    value={code}
                    onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    autoFocus
                  />
                </div>
              </label>

              <button type="submit" disabled={isSubmitting || code.length !== 6} className="primary-green auth-submit">
                <ShieldCheck size={16} />
                {isSubmitting ? 'Verifying...' : 'Verify Phone Number'}
              </button>
            </form>

            <button
              type="button"
              onClick={handleResend}
              disabled={isResending}
              className="auth-switch"
              style={{ background: 'none', border: 'none', cursor: isResending ? 'not-allowed' : 'pointer', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '16px' }}
            >
              <RotateCw size={14} />
              {isResending ? 'Sending...' : "Didn't get a code? Resend"}
            </button>

            <div className="auth-switch" style={{ marginTop: '16px' }}>
              Wrong number? <button type="button" onClick={handleLogout} style={{ background: 'none', border: 'none', color: 'var(--green-dark, #078c35)', fontWeight: 700, cursor: 'pointer', padding: 0 }}>Sign out</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
