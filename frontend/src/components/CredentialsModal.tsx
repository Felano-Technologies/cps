import { useState } from 'react';
import { Copy, Check, MessageSquare } from 'lucide-react';
import Modal from './Modal';

/**
 * Shows login details operations just issued (new account or resend).
 * The password was also texted to the phone; this is the only time it's shown.
 */
export default function CredentialsModal({ title, name, phone, password, onClose }: {
  title: string;
  name: string;
  phone: string;
  password: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const details = `Sign in at ${window.location.origin}/signin\nPhone: ${phone}\nPassword: ${password}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(details);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked — the details are on screen to copy manually.
    }
  };

  return (
    <Modal onClose={onClose} title={title} maxWidth="440px">
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: 14, marginBottom: 16, fontSize: 14, color: '#166534' }}>
        <MessageSquare size={18} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>Login details were texted to <strong>{name}</strong> at <strong>{phone}</strong>.</span>
      </div>
      <div style={{ background: '#0f172a', color: '#e2e8f0', borderRadius: 12, padding: 16, fontFamily: 'monospace', fontSize: 14, lineHeight: 1.7, wordBreak: 'break-all' }}>
        <div>Phone: {phone}</div>
        <div>Password: <strong style={{ color: '#fff' }}>{password}</strong></div>
      </div>
      <p style={{ fontSize: 13, color: '#64748b', margin: '12px 0 16px' }}>
        This password is shown only once. They should change it in Settings after signing in.
      </p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button type="button" className="neutral-btn" onClick={copy} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? 'Copied' : 'Copy details'}
        </button>
        <button type="button" className="primary-green" onClick={onClose}>Done</button>
      </div>
    </Modal>
  );
}
