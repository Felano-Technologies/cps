import { Link } from 'react-router-dom';
import { MessageCircle, Mail } from 'lucide-react';

export default function FloatingActions() {
  return (
    <div className="floating-actions">
      <a
        href="https://wa.me/233534583364"
        target="_blank"
        rel="noopener noreferrer"
        className="floating-btn floating-btn-whatsapp"
        aria-label="Chat on WhatsApp"
        title="Chat on WhatsApp"
      >
        <MessageCircle size={24} />
      </a>
      <Link
        to="/contact"
        className="floating-btn floating-btn-contact"
        aria-label="Contact us"
        title="Contact us"
      >
        <Mail size={22} />
      </Link>
    </div>
  );
}
