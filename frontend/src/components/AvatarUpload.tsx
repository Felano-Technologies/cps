import { useRef, useState } from 'react';
import axios from 'axios';
import { Camera } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

function extractErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err) && typeof err.response?.data?.error === 'string') {
    return err.response.data.error;
  }
  return fallback;
}

export default function AvatarUpload() {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  if (!user) return null;

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const { data } = await api.patch('/auth/avatar', formData);
      updateUser(data);
      toast.success('Profile photo updated.');
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to upload photo. Please try again.'));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px' }}>
      <div style={{ position: 'relative', width: '84px', height: '84px', flexShrink: 0 }}>
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.name}
            style={{ width: '84px', height: '84px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #fff', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
          />
        ) : (
          <div style={{
            width: '84px', height: '84px', borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--lime, #83d314) 0%, #34d399 100%)',
            color: '#0f172a', fontWeight: 800, fontSize: '28px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '3px solid #fff', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          }}>
            {user.name.charAt(0).toUpperCase()}
          </div>
        )}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          aria-label="Change profile photo"
          style={{
            position: 'absolute', bottom: 0, right: 0, width: '30px', height: '30px', borderRadius: '50%',
            background: '#078c35', color: '#fff', border: '2px solid #fff', display: 'flex', alignItems: 'center',
            justifyContent: 'center', cursor: isUploading ? 'not-allowed' : 'pointer', opacity: isUploading ? 0.6 : 1,
          }}
        >
          <Camera size={14} />
        </button>
        <input ref={inputRef} type="file" accept="image/*" onChange={handleFileSelected} style={{ display: 'none' }} />
      </div>
      <div>
        <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '17px' }}>{user.name}</div>
        <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px', textTransform: 'capitalize' }}>{user.role}</div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          style={{ marginTop: '8px', background: 'none', border: 'none', color: '#078c35', fontWeight: 700, fontSize: '13px', cursor: isUploading ? 'not-allowed' : 'pointer', padding: 0 }}
        >
          {isUploading ? 'Uploading…' : 'Change photo'}
        </button>
      </div>
    </div>
  );
}
