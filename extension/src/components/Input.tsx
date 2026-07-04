import React, { type InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className = '', ...props }) => {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && <label className="text-xs font-medium text-text-muted">{label}</label>}
      <input 
        className={`w-full px-3 py-2 bg-signal-surface border rounded-md text-sm text-text-primary placeholder-text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent-amber/50 transition-colors ${
          error ? 'border-state-danger' : 'border-border-hairline hover:border-white/20'
        } ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-state-danger">{error}</span>}
    </div>
  );
};
