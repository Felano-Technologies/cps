import { useState } from 'react';
import axios from 'axios';
import { User, Mail, MessageSquare, Send, AlertCircle, CheckCircle2, Phone, MapPin, Clock } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import '../../styles/contact.css';

function extractErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err) && typeof err.response?.data?.error === 'string') {
    return err.response.data.error;
  }
  return err instanceof Error ? err.message : fallback;
}

export default function ContactPage() {
  const toast = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSent(false);
    setIsSubmitting(true);
    try {
      await api.post('/contact', { name, email, message });
      setSent(true);
      setName('');
      setEmail('');
      setMessage('');
      toast.success('Message sent — we\'ll get back to you soon.');
    } catch (err) {
      const msg = extractErrorMessage(err, 'Failed to send your message. Please try again.');
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-shell light-shell">
      <main className="contact-hero container">
        <h1>Get in touch.</h1>
        <p className="lede">
          Have a question about our services or need help with an active shipment? Our support team is
          here for you.
        </p>
      </main>

      <section className="contact-grid-wrap container">
        <div className="contact-grid">
          <div className="contact-form-card">
            <h2>Send us a message</h2>

            {error && (
              <div className="contact-error">
                <AlertCircle size={16} />
                {error}
              </div>
            )}
            {sent && !error && (
              <div className="contact-success">
                <CheckCircle2 size={16} />
                Thanks — your message has been sent.
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <label className="contact-field">
                <span>Your Name</span>
                <div className="contact-input-wrap">
                  <User size={17} className="leading-icon" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Jane Doe"
                  />
                </div>
              </label>

              <label className="contact-field">
                <span>Your Email</span>
                <div className="contact-input-wrap">
                  <Mail size={17} className="leading-icon" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="name@company.com"
                  />
                </div>
              </label>

              <label className="contact-field">
                <span>Message</span>
                <div className="contact-input-wrap">
                  <MessageSquare size={17} className="leading-icon" />
                  <textarea
                    required
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="How can we help?"
                  />
                </div>
              </label>

              <button type="submit" disabled={isSubmitting} className="primary-green contact-submit">
                <Send size={16} />
                {isSubmitting ? 'Sending…' : 'Send Message'}
              </button>
            </form>
          </div>

          <div className="contact-info">
            <h2>Direct Contact</h2>

            <div className="contact-info-item">
              <span className="contact-info-icon"><Phone size={18} /></span>
              <div>
                <strong>Phone &amp; WhatsApp</strong>
                <a href="tel:+233534583364">+233 53 458 3364</a>
              </div>
            </div>

            <div className="contact-info-item">
              <span className="contact-info-icon"><Mail size={18} /></span>
              <div>
                <strong>Email Support</strong>
                <a href="mailto:cpsdeliverygh@gmail.com">cpsdeliverygh@gmail.com</a>
              </div>
            </div>

            <div className="contact-info-item">
              <span className="contact-info-icon"><MapPin size={18} /></span>
              <div>
                <strong>Office Address</strong>
                <span>CPS Delivery Hub, Ayeduase Gate, Near KNUST, Kumasi</span>
              </div>
            </div>

            <div className="contact-info-item">
              <span className="contact-info-icon"><Clock size={18} /></span>
              <div>
                <strong>Operating Hours</strong>
                <span>Monday – Friday: 8:00 AM – 5:00 PM</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
