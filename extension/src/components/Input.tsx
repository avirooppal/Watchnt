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
        className={`w-full px-4 py-2.5 bg-signal-surface border-b border-l-0 border-r-0 border-t-0 rounded-none text-sm font-sans text-text-primary placeholder-text-muted/50 focus:outline-none focus:border-accent-amber transition-colors duration-300 ${
          error ? 'border-state-danger' : 'border-border-strong hover:border-white/20'
        } ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-state-danger">{error}</span>}
    </div>
  );
};
