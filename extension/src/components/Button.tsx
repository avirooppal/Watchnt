import React, { type ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  isLoading, 
  className = '', 
  disabled, 
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center font-sans font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-1 focus:ring-accent-amber/50 disabled:opacity-30 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-accent-amber text-white shadow-sm hover:bg-accent-amber-dim font-semibold",
    secondary: "bg-signal-surface border border-border-hairline text-text-primary hover:bg-signal-surface-raised hover:border-border-strong",
    ghost: "bg-transparent text-text-muted hover:bg-white/5 hover:text-text-primary",
    danger: "bg-state-danger/15 text-state-danger hover:bg-state-danger hover:text-white border border-state-danger/30"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Processing...
        </span>
      ) : children}
    </button>
  );
};
