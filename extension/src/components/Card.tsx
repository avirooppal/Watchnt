import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, hoverable = false, className = '', ...props }) => {
  return (
    <div 
      className={`bg-signal-surface border border-border-hairline rounded-lg p-6 shadow-surface transition-all duration-300 ${
        hoverable ? 'hover:bg-signal-surface-raised hover:border-white/20 hover:-translate-y-1' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
