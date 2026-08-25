import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  icon?: React.ReactNode;
}

export default function CustomSelect({ value, onChange, options, icon }: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const selected = options.find(o => o.value === value);

  return (
    <div className="custom-select" ref={rootRef}>
      <button
        type="button"
        className="custom-select-trigger"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {icon && <span className="leading-icon">{icon}</span>}
        <span className="custom-select-value">{selected?.label ?? 'Select…'}</span>
        <ChevronDown size={16} className={`custom-select-chevron${open ? ' open' : ''}`} />
      </button>

      {open && (
        <ul className="custom-select-menu" role="listbox">
          {options.map(opt => (
            <li
              key={opt.value}
              role="option"
              aria-selected={opt.value === value}
              className={`custom-select-option${opt.value === value ? ' selected' : ''}`}
              onClick={(e) => {
                e.preventDefault();
                onChange(opt.value);
                setOpen(false);
              }}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
