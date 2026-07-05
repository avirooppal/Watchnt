import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, hoverable = false, className = '', ...props }) => {
  return (
    <div 
      className={`bg-signal-surface border border-border-strong rounded-none p-8 shadow-surface transition-all duration-400 ease-out ${
        hoverable ? 'hover:bg-signal-surface-raised hover:border-white/20 hover:shadow-floating hover:-translate-y-0.5' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
