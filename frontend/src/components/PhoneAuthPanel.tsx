import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, KeyRound, User, ArrowRight } from 'lucide-react';
import { useAuth, getRoleDashboard } from '../contexts/AuthContext';
import type { UserRole } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import CustomSelect from './Form/CustomSelect';

interface PhoneAuthPanelProps {
  mode: 'signin' | 'signup';
}

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'customer', label: 'Customer' },
  { value: 'operations', label: 'Operations / Dispatch' },
  { value: 'rider', label: 'Rider / Courier' },
];

type Step = 'phone' | 'code' | 'profile';

export default function PhoneAuthPanel({ mode }: PhoneAuthPanelProps) {
  const { requestPhoneOtp, verifyPhoneOtp, completePhoneSignup } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('customer');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    setIsSubmitting(true);
    try {
      await requestPhoneOtp(phone);
      toast.success('Code sent to your phone.');
      setStep('code');
    } catch {
      setLocalError('Failed to send code. Check the number and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    setIsSubmitting(true);
    try {
      const result = await verifyPhoneOtp(phone, code);
      if (result.exists && result.user) {
        toast.success(`Welcome back, ${result.user.name}.`);
        navigate(getRoleDashboard(result.user.role));
        return;
      }
      if (mode === 'signin') {
        setLocalError('No account found with this phone number. Switch to Sign Up to create one.');
        return;
      }
      setStep('profile');
    } catch {
      setLocalError('Invalid or expired code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    setIsSubmitting(true);
    try {
      const user = await completePhoneSignup(phone, code, name, role);
      toast.success(`Welcome, ${user.name}.`);
      navigate(getRoleDashboard(user.role));
    } catch {
      setLocalError('Failed to complete signup. The code may have expired — try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      {localError && (
        <div className="auth-error">
          {localError}
        </div>
      )}

      {step === 'phone' && (
        <form onSubmit={handleSendCode}>
          <label className="auth-field">
            <span>Phone Number</span>
            <div className="auth-input-wrap">
              <Phone size={17} className="leading-icon" />
              <input
                type="tel"
                required
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="0241234567"
              />
            </div>
          </label>
          <button type="submit" disabled={isSubmitting} className="primary-green auth-submit">
            {isSubmitting ? 'Sending...' : 'Send Code'}
            <ArrowRight size={16} />
          </button>
        </form>
      )}

      {step === 'code' && (
        <form onSubmit={handleVerifyCode}>
          <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '16px' }}>
            Enter the 6-digit code sent to <strong>{phone}</strong>.
          </p>
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
              />
            </div>
          </label>
          <button type="submit" disabled={isSubmitting || code.length !== 6} className="primary-green auth-submit">
            {isSubmitting ? 'Verifying...' : 'Verify Code'}
          </button>
          <button
            type="button"
            onClick={() => { setStep('phone'); setCode(''); setLocalError(''); }}
            className="auth-switch"
            style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', marginTop: '12px' }}
          >
            Use a different number
          </button>
        </form>
      )}

      {step === 'profile' && (
        <form onSubmit={handleCompleteProfile}>
          <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '16px' }}>
            Phone verified — finish creating your account.
          </p>
          <label className="auth-field">
            <span>Full Name</span>
            <div className="auth-input-wrap">
              <User size={17} className="leading-icon" />
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Jane Doe"
              />
            </div>
          </label>
          <label className="auth-field">
            <span>Account Type</span>
            <CustomSelect value={role} onChange={v => setRole(v as UserRole)} options={ROLE_OPTIONS} icon={<User size={17} />} />
          </label>
          <button type="submit" disabled={isSubmitting} className="primary-green auth-submit">
            {isSubmitting ? 'Creating...' : 'Create Account'}
          </button>
        </form>
      )}
    </div>
  );
}
