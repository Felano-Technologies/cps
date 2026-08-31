import { useState } from 'react';
import { Phone, ShieldAlert } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

export default function VerifyPhoneBanner() {
  const { user, requestPhoneVerification, confirmPhoneVerification } = useAuth();
  const toast = useToast();
  const [step, setStep] = useState<'prompt' | 'code'>('prompt');
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!user?.phone || user.phoneVerified) return null;

  const handleSendCode = async () => {
    setIsSubmitting(true);
    try {
      await requestPhoneVerification();
      toast.success('Verification code sent.');
      setStep('code');
    } catch {
      toast.error('Failed to send code. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await confirmPhoneVerification(code);
      toast.success('Phone number verified.');
    } catch {
      toast.error('Invalid or expired code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      background: '#fff7ed', borderBottom: '1px solid #fed7aa', padding: '10px 20px',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', flexWrap: 'wrap', fontSize: '13px',
    }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#c2410c', fontWeight: 600 }}>
        <ShieldAlert size={16} />
        Verify your phone number ({user.phone}) to secure your account.
      </span>

      {step === 'prompt' ? (
        <button
          type="button"
          onClick={handleSendCode}
          disabled={isSubmitting}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '8px',
            background: '#c2410c', color: '#fff', border: 'none', fontWeight: 700, fontSize: '13px',
            cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1,
          }}
        >
          <Phone size={14} /> {isSubmitting ? 'Sending…' : 'Verify Now'}
        </button>
      ) : (
        <form onSubmit={handleConfirm} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="6-digit code"
            style={{ width: '120px', padding: '6px 10px', borderRadius: '8px', border: '1px solid #fdba74', fontSize: '13px' }}
          />
          <button
            type="submit"
            disabled={isSubmitting || code.length !== 6}
            style={{
              padding: '6px 14px', borderRadius: '8px', background: '#c2410c', color: '#fff', border: 'none',
              fontWeight: 700, fontSize: '13px', cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1,
            }}
          >
            {isSubmitting ? 'Verifying…' : 'Confirm'}
          </button>
        </form>
      )}
    </div>
  );
}
