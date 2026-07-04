import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'error' | 'neutral' | 'accent';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'neutral', className = '' }) => {
  const variants = {
    success: 'bg-state-success/10 text-state-success border border-state-success/20',
    warning: 'bg-accent-amber/10 text-accent-amber border border-accent-amber/20',
    error: 'bg-state-danger/10 text-state-danger border border-state-danger/20',
    neutral: 'bg-signal-surface-raised text-text-muted border border-border-hairline',
    accent: 'bg-accent-cyan-pulse/10 text-accent-cyan-pulse border border-accent-cyan-pulse/20'
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};
