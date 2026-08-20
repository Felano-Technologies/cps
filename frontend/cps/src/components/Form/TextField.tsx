import React from 'react';

interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export default function TextField({ label, ...props }: TextFieldProps) {
  return (
    <label>
      <span>{label}</span>
      <input {...props} />
    </label>
  );
}
