import React, { type InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className = '', ...props }) => {
  return (
    <div className="flex flex-col gap-2 w-full">
      {label && <label className="text-[11px] font-mono tracking-widest uppercase text-text-muted">{label}</label>}
      <input 
        className={`w-full px-3.5 py-2 bg-signal-surface border border-border-hairline rounded-lg text-sm font-sans text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:border-accent-amber transition-colors ${
          error ? 'border-state-danger' : 'hover:border-border-strong'
        } ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-state-danger">{error}</span>}
    </div>
  );
};
