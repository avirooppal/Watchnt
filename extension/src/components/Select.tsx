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
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className="w-full h-11 px-4 bg-signal-surface border-b border-l-0 border-r-0 border-t-0 border-border-strong rounded-none text-sm font-sans text-text-primary focus:outline-none focus:border-accent-amber flex items-center justify-between transition-colors hover:border-white/20"
        style={{ backgroundColor: '#0E1216' }}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen((prev) => !prev);
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setIsOpen(true);
            setTimeout(() => {
              const firstOption = containerRef.current?.querySelector('[role="option"]') as HTMLElement;
              firstOption?.focus();
            }, 0);
          } else if (e.key === 'Escape') {
            setIsOpen(false);
          }
        }}
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
        <div role="listbox" className="absolute z-50 w-full mt-1 bg-signal-surface border border-border-strong rounded-none shadow-floating overflow-hidden animate-fade-in origin-top" style={{ backgroundColor: '#0E1216', zIndex: 99999 }}>
          <div className="max-h-60 overflow-y-auto">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={option.value === value}
                className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-signal-surface-raised hover:text-white ${
                  option.value === value 
                    ? 'bg-signal-surface-raised text-accent-amber font-medium' 
                    : 'text-text-primary'
                }`}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onChange(option.value);
                    setIsOpen(false);
                    const trigger = containerRef.current?.querySelector('button[aria-haspopup="listbox"]') as HTMLElement;
                    trigger?.focus();
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    setIsOpen(false);
                    const trigger = containerRef.current?.querySelector('button[aria-haspopup="listbox"]') as HTMLElement;
                    trigger?.focus();
                  } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    const next = e.currentTarget.nextElementSibling as HTMLElement;
                    next?.focus();
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    const prev = e.currentTarget.previousElementSibling as HTMLElement;
                    prev?.focus();
                  }
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
