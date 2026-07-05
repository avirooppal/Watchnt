import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'error' | 'neutral' | 'accent';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'neutral', className = '' }) => {
  const variants = {
    success: 'text-state-success border-state-success/30',
    warning: 'text-state-warning border-state-warning/30',
    error: 'text-state-danger border-state-danger/30',
    neutral: 'text-text-muted border-border-strong',
    accent: 'text-state-info border-state-info/30'
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 border rounded-none font-mono text-[10px] uppercase font-semibold tracking-widest bg-signal-surface ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};
