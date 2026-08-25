import { useEffect, useRef, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  icon?: React.ReactNode;
  placeholder?: string;
  min?: string;
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function toISO(year: number, month: number, day: number) {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

function parseISO(iso: string): Date | null {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function formatDisplay(iso: string) {
  const date = parseISO(iso);
  if (!date) return '';
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function DatePicker({
  value,
  onChange,
  icon = <Calendar size={17} />,
  placeholder = 'Select date',
  min,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const initial = parseISO(value) ?? new Date();
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());

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

  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const startWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const minDate = parseISO(min ?? '');

  const cells: (number | null)[] = [
    ...Array(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const goPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const goNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  const monthLabel = firstOfMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  return (
    <div className="custom-select date-picker" ref={rootRef}>
      <button
        type="button"
        className="custom-select-trigger"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        {icon && <span className="leading-icon">{icon}</span>}
        <span className="custom-select-value">{value ? formatDisplay(value) : placeholder}</span>
      </button>

      {open && (
        <div className="date-picker-panel" role="dialog" aria-label="Choose date">
          <div className="date-picker-header">
            <button type="button" onClick={(e) => { e.preventDefault(); goPrevMonth(); }} aria-label="Previous month">
              <ChevronLeft size={16} />
            </button>
            <span>{monthLabel}</span>
            <button type="button" onClick={(e) => { e.preventDefault(); goNextMonth(); }} aria-label="Next month">
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="date-picker-weekdays">
            {WEEKDAYS.map((w, i) => (
              <span key={i}>{w}</span>
            ))}
          </div>

          <div className="date-picker-grid">
            {cells.map((day, i) => {
              if (day === null) return <span key={i} />;
              const iso = toISO(viewYear, viewMonth, day);
              const isSelected = iso === value;
              const isDisabled = minDate ? new Date(viewYear, viewMonth, day) < minDate : false;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={isDisabled}
                  className={`date-picker-day${isSelected ? ' selected' : ''}`}
                  onClick={(e) => {
                    e.preventDefault();
                    onChange(iso);
                    setOpen(false);
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
