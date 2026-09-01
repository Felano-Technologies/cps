import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, AlertCircle, RotateCw } from 'lucide-react';
import { useAuth, getRoleDashboard } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import OtpInput from '../../components/OtpInput';
import cpsLogo from '../../assets/logo2.png';
import heroImg from '../../assets/hero.png';
import '../../styles/auth.css';

const RESEND_COOLDOWN_SECONDS = 30;

export default function VerifyPhonePage() {
  const { user, requestPhoneVerification, confirmPhoneVerification, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [localError, setLocalError] = useState('');
  // A code is already sent as part of signup/login, so the cooldown starts
  // right away rather than only after a manual resend.
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown > 0]);

  const handleConfirm = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (code.length !== 6 || isSubmitting) return;
    setLocalError('');
    setIsSubmitting(true);
    try {
      const updated = await confirmPhoneVerification(code);
      toast.success('Phone number verified.');
      navigate(getRoleDashboard(updated.role));
    } catch {
      setLocalError('Invalid or expired code. Please try again.');
      setCode('');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (code.length === 6) {
      handleConfirm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const handleResend = async () => {
    if (resendCooldown > 0 || isResending) return;
    setLocalError('');
    setIsResending(true);
    try {
      await requestPhoneVerification();
      toast.success('New code sent.');
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
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
              <div style={{ marginBottom: '24px' }}>
                <OtpInput value={code} onChange={setCode} autoFocus />
              </div>

              <button type="submit" disabled={isSubmitting || code.length !== 6} className="primary-green auth-submit">
                <ShieldCheck size={16} />
                {isSubmitting ? 'Verifying...' : 'Verify Phone Number'}
              </button>
            </form>

            <button
              type="button"
              onClick={handleResend}
              disabled={isResending || resendCooldown > 0}
              className="auth-switch"
              style={{
                background: 'none', border: 'none', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '16px',
                cursor: (isResending || resendCooldown > 0) ? 'not-allowed' : 'pointer',
                opacity: resendCooldown > 0 ? 0.6 : 1,
              }}
            >
              <RotateCw size={14} />
              {isResending ? 'Sending...' : resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Didn't get a code? Resend"}
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
