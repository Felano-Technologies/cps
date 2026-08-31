import { Link } from 'react-router-dom';
import { Phone, MessageCircle, Mail, Clock, MapPin } from 'lucide-react';
import cpsLogo from '../assets/logo2.png';

export default function Footer() {
  return (
    <footer className="app-footer">
      <div className="footer-container">
        
        <div className="footer-cols">
          
          {/* Column 1: Brand & Office */}
          <div className="footer-col">
            <div className="footer-card">
              <div className="footer-brand">
                <img src={cpsLogo} alt="CPS Delivery Services" className="footer-logo" />
                <div className="footer-brand-name">
                  <span className="text-green">CPS</span> Delivery <span className="text-green">Services</span>
                </div>
              </div>
              <p className="footer-description">
                CPS Delivery Services is building a local commerce marketplace and logistics network for buyers and sellers across Ghana.
              </p>
            </div>

            <div className="footer-section" style={{ padding: '0 8px' }}>
              <h4>Office</h4>
              <p className="footer-address" style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <MapPin size={16} style={{ flexShrink: 0, marginTop: '3px', color: 'var(--lime)' }} />
                Ayeduase Gate, near KNUST, Kumasi.
              </p>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div className="footer-col" style={{ padding: '0 8px' }}>
            <div className="footer-section">
              <h4>Quick Links</h4>
              <div className="footer-links-col">
                <Link to="/">Home</Link>
                <Link to="/about">About Us</Link>
                <Link to="/services">Services</Link>
                <Link to="/contact">Contact Us</Link>
                <Link to="/faq">FAQ</Link>
              </div>
            </div>

            <div className="footer-section">
              <h4>Our Services</h4>
              <div className="footer-links-col">
                <Link to="/services/same-day">Same Day Delivery</Link>
                <Link to="/services/express">Express Delivery</Link>
                <Link to="/services/standard">Standard Delivery</Link>
                <Link to="/services/bulk">Bulk Delivery</Link>
              </div>
            </div>
          </div>

          {/* Column 3: Support */}
          <div className="footer-col">
            <div className="footer-card">
              <div className="footer-section">
                <h4>Support</h4>
                <div className="support-list">
                  <a href="tel:+233534583364" className="support-pill"><Phone size={16} /> Call: +233 53 458 3364</a>
                  <a href="https://wa.me/233534583364" target="_blank" rel="noopener noreferrer" className="support-pill"><MessageCircle size={16} /> WhatsApp: +233 53 458 3364</a>
                  <a href="mailto:cpsdeliverygh@gmail.com" className="support-pill"><Mail size={16} /> cpsdeliverygh@gmail.com</a>
                  <div className="support-pill"><Clock size={16} /> Mon - Sat: 8:00am - 7:30pm</div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Copyright */}
        <div className="footer-bottom">
          <p>© 2026 CPS Delivery Services. All rights reserved.</p>
          <p>Kumasi, Ashanti Region, Ghana</p>
        </div>

      </div>
    </footer >
  );
}
