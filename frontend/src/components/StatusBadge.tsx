import React from 'react';

interface StatusBadgeProps {
  status: 'success' | 'danger' | 'warning' | 'neutral';
  children: React.ReactNode;
}

export default function StatusBadge({ status, children }: StatusBadgeProps) {
  return (
    <span className={`tag ${status}`}>
      {children}
    </span>
  );
}
