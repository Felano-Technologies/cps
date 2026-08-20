import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'normal' | 'dark' | 'summary' | 'info';
}

export default function Card({ children, className = '', variant = 'normal' }: CardProps) {
  let baseClass = 'card-style';
  switch (variant) {
    case 'dark': baseClass = 'dark-card'; break;
    case 'summary': baseClass = 'summary-card'; break;
    case 'info': baseClass = 'info-card'; break;
  }
  return (
    <div className={`${baseClass} ${className}`.trim()}>
      {children}
    </div>
  );
}
