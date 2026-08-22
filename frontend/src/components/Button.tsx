import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'dark' | 'neutral' | 'track';
  size?: 'small' | 'wide' | 'normal';
}

export default function Button({ 
  children, 
  variant = 'primary', 
  size = 'normal',
  className = '',
  ...props 
}: ButtonProps) {
  let baseClass = '';
  switch (variant) {
    case 'primary': baseClass = 'primary-green'; break;
    case 'dark': baseClass = 'dark-btn'; break;
    case 'neutral': baseClass = 'neutral-btn'; break;
    case 'track': baseClass = 'track-btn'; break;
  }
  
  if (size === 'small') baseClass += ' small';
  if (size === 'wide') baseClass += ' wide-btn';

  return (
    <button className={`${baseClass} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}
