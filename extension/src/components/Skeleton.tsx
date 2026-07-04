import React from 'react';

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div 
      className={`bg-white/5 bg-gradient-to-r from-transparent via-white/5 to-transparent rounded-md animate-shimmer bg-[length:1000px_100%] ${className}`} 
    />
  );
};
