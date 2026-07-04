import React, { useState, useRef, useEffect } from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  className?: string;
}

export const Select: React.FC<SelectProps> = ({ value, onChange, options, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value) || options[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className={`relative z-50 ${className}`} ref={containerRef} style={{ position: 'relative', zIndex: 9999 }}>
      <button
        type="button"
        className="w-full h-10 px-3 bg-signal-surface border border-border-hairline rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-amber/50 flex items-center justify-between transition-colors hover:border-white/20"
        style={{ backgroundColor: '#131A21' }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="truncate">{selectedOption?.label}</span>
        <svg 
          className={`w-4 h-4 text-text-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-signal-surface border border-border-hairline rounded-lg shadow-surface overflow-hidden animate-fade-in origin-top" style={{ backgroundColor: '#131A21', zIndex: 99999 }}>
          <div className="max-h-60 overflow-y-auto">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-signal-surface-raised hover:text-white ${
                  option.value === value 
                    ? 'bg-signal-surface-raised text-accent-amber font-medium' 
                    : 'text-text-primary'
                }`}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
