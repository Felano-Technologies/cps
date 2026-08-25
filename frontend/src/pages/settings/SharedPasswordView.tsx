import { useState } from 'react';
import axios from 'axios';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';

function extractErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err) && typeof err.response?.data?.error === 'string') {
    return err.response.data.error;
  }
  return err instanceof Error ? err.message : fallback;
}

export default function SharedPasswordView() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.patch('/auth/password', { currentPassword, newPassword });
      toast.success('Password successfully changed.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to change password.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="card-style" style={{ padding: '32px' }}>
      <div className="section-heading-row" style={{ marginBottom: '24px' }}>
        <h3>Change Password</h3>
      </div>
      <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '440px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '14px', fontWeight: 600, color: '#334155' }}>Current Password</label>
          <input
            type="password"
            className="input-field"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            placeholder="Enter current password"
            style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px' }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '14px', fontWeight: 600, color: '#334155' }}>New Password</label>
          <input
            type="password"
            className="input-field"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
            placeholder="Enter new password"
            style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px' }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '14px', fontWeight: 600, color: '#334155' }}>Confirm New Password</label>
          <input
            type="password"
            className="input-field"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            placeholder="Confirm new password"
            style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px' }}
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="dark-btn wide-action"
          style={{ marginTop: '16px', padding: '14px', borderRadius: '8px', fontWeight: 600, fontSize: '15px', cursor: 'pointer' }}
        >
          {isSubmitting ? 'Updating…' : 'Update Password'}
        </button>
      </form>
    </div>
  );
}
