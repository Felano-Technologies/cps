import React from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: React.CSSProperties;
  iconColor?: string;
}

export default function EmptyState({ icon = '📭', title, message, actionLabel, onAction, style, iconColor = '#0f172a' }: EmptyStateProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px 24px',
      background: 'rgba(255, 255, 255, 0.5)',
      backdropFilter: 'blur(8px)',
      border: '2px dashed #cbd5e1',
      borderRadius: '16px',
      textAlign: 'center',
      margin: '24px 0',
      ...style
    }}>
      <div style={{
        fontSize: '48px',
        marginBottom: '16px',
        background: '#f8fafc',
        width: '80px',
        height: '80px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '50%',
        color: iconColor,
        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05), 0 4px 12px rgba(15, 23, 42, 0.05)'
      }}>
        {icon}
      </div>
      <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
        {title}
      </h3>
      <p style={{ color: '#64748b', fontSize: '15px', maxWidth: '400px', lineHeight: 1.5, marginBottom: actionLabel ? '24px' : '0' }}>
        {message}
      </p>
      
      {actionLabel && onAction && (
        <button 
          onClick={onAction}
          className="primary-green" 
          style={{ padding: '10px 24px', borderRadius: '8px', fontWeight: 600, fontSize: '14px' }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
