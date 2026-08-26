import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  maxWidth?: string;
  align?: 'center' | 'bottom';
  padding?: string;
}

export default function Modal({ onClose, children, title, maxWidth = '480px', align = 'center', padding }: ModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return createPortal(
    <div
      className={`modal-overlay${align === 'bottom' ? ' modal-overlay-bottom' : ''}`}
      onClick={onClose}
    >
      <div
        className="modal-shell"
        style={padding !== undefined ? { maxWidth, padding } : { maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
        {title && <h2 className="modal-title">{title}</h2>}
        {children}
      </div>
    </div>,
    document.body
  );
}
