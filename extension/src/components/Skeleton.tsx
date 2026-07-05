import React from 'react';

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div 
      className={`bg-signal-surface-raised bg-gradient-to-r from-transparent via-white/5 to-transparent rounded-none animate-shimmer bg-[length:1000px_100%] ${className}`} 
    />
  );
};
