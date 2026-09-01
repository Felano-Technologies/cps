import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  ArrowRight,
  PackagePlus,
  Truck,
  Clock,
  ShieldCheck,
  Radar,
  MapPinned,
  ShoppingBag,
  Pill,
  UtensilsCrossed,
  FileText,
  PackageCheck,
} from 'lucide-react';
import { useReveal } from '../../hooks/useReveal';
import samedayImg from '../../assets/sameday.png';
import coverageImg from '../../assets/coverage.jpg';
import '../../styles/landing.css';

export default function LandingPage() {
  const [trackingQuery, setTrackingQuery] = useState('');
  const navigate = useNavigate();

  const { ref: trustRef, className: trustClass } = useReveal<HTMLDivElement>();
  const { ref: headingRef, className: headingClass } = useReveal<HTMLDivElement>();
  const { ref: samedayRef, className: samedayClass } = useReveal<HTMLElement>();
  const { ref: customerPickupRef, className: customerPickupClass } = useReveal<HTMLElement>();
  const { ref: coverageRef, className: coverageClass } = useReveal<HTMLElement>();

  const handleTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = trackingQuery.trim();
    if (query) {
      navigate(`/tracking/${encodeURIComponent(query)}`);
    } else {
      navigate('/shipments');
    }
  };

  return (
    <div className="page-shell light-shell">

      <main className="landing-hero container">
        <div className="hero-copy">
          <h2 style={{ fontSize: 'clamp(2.8rem, 4.6vw, 4.2rem)', color: 'var(--navy)', fontWeight: 800, margin: '0 0 24px', lineHeight: 1.05, letterSpacing: '-0.03em' }}>
            Welcome to <br />
            <span style={{ color: 'var(--green-dark, #078c35)' }}>CPS</span> <br />
            Delivery Services
          </h2>

          <span className="hero-eyebrow">
            <Radar size={14} />
            Express &amp; Same-Day Courier Network
          </span>

          <div style={{ margin: '8px 0 24px' }}>
            <Link to="/request-pickup" className="dark-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', padding: '14px 28px', fontSize: '1.05rem', borderRadius: '8px' }}>
              <PackagePlus size={18} />
              <span>Request Pickup</span>
            </Link>
          </div>
          <p className="lede">
            Professional motorbike and van courier services for same-day doorstep pickups, urgent drops, and
            reliable parcel deliveries across the city.
          </p>

          <form onSubmit={handleTrackSubmit} className="hero-search-row">
            <div className="search-field">
              <Search size={18} />
              <input
                type="text"
                placeholder="Enter tracking ID or pickup code"
                value={trackingQuery}
                onChange={(e) => setTrackingQuery(e.target.value)}
              />
            </div>
            <button type="submit" className="primary-green track-btn" style={{ border: 'none', cursor: 'pointer' }}>
              Track <ArrowRight size={16} />
            </button>
          </form>

          <ul className="hero-capabilities">
            <li><Truck size={16} /> Motorbike &amp; van fleet</li>
            <li><Clock size={16} /> Same-day pickup</li>
            <li><ShieldCheck size={16} /> Proof of delivery</li>
          </ul>
        </div>

        {/* Desktop Showcase Panel */}
        <div className="desktop-hero-showcase">
          <div className="hero-showcase-glow" />
          <div className="hero-showcase-panel">
            <div className="showcase-header">
              <div className="showcase-live-tag">
                <span className="live-pulse-dot" /> Live Courier Operations
              </div>
              <span className="showcase-hub-badge">Kumasi &rarr; 5 Regions</span>
            </div>

            <div className="showcase-title-area">
              <h3>Fast, Insured Doorstep Delivery</h3>
              <p>Reliable local courier runs in Kumasi and daily express dispatches to all major regional capitals.</p>
            </div>

            <div className="showcase-cards-list">
              <div className="showcase-card-item">
                <div className="showcase-card-icon green">
                  <PackageCheck size={20} />
                </div>
                <div>
                  <h4>1. Doorstep Pickup in Kumasi</h4>
                  <p>Book online &mdash; our dispatchers assign the nearest rider to collect directly from your location.</p>
                </div>
              </div>

              <div className="showcase-card-item">
                <div className="showcase-card-icon blue">
                  <Truck size={20} />
                </div>
                <div>
                  <h4>2. Express Same-Day &amp; Regional Transit</h4>
                  <p>1&ndash;3 hr local deliveries, plus daily scheduled runs to Accra, Sunyani, Takoradi, &amp; Tamale.</p>
                </div>
              </div>

              <div className="showcase-card-item">
                <div className="showcase-card-icon amber">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h4>3. Photo Proof &amp; Live Tracking</h4>
                  <p>Real-time SMS notifications, live order tracking, and verified photo signature proof of delivery.</p>
                </div>
              </div>
            </div>

            <div className="showcase-footer-stats">
              <div className="stat-box">
                <strong>1 &ndash; 3 Hrs</strong>
                <span>Kumasi Local Drops</span>
              </div>
              <div className="stat-divider" />
              <div className="stat-box">
                <strong>5 Regions</strong>
                <span>Connected Daily</span>
              </div>
              <div className="stat-divider" />
              <div className="stat-box">
                <strong>100% Insured</strong>
                <span>Verified Photo POD</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <div ref={trustRef} className={`trust-strip ${trustClass}`}>
        <span className="label">Trusted by local businesses that need fast courier coverage</span>
        <ul>
          <li><ShoppingBag size={16} /> Retail</li>
          <li><Pill size={16} /> Pharmacy</li>
          <li><UtensilsCrossed size={16} /> Food</li>
          <li><FileText size={16} /> Documents</li>
        </ul>
      </div>

      <section className="landing-services container">
        <div ref={headingRef} className={`section-heading ${headingClass}`}>
          <h2>Fast, Reliable Delivery Solutions</h2>
          <p>Convenient door-to-door courier pickups, instant parcel deliveries, and live tracking for personal and business orders.</p>
        </div>

        <div className="services-top">
          <article ref={samedayRef} className={`service-tile ${samedayClass}`}>
            <div className="service-tile-media">
              <img src={samedayImg} alt="Same-day courier on a delivery run" />
            </div>
            <div className="service-tile-body">
              <h3>Same-Day Delivery</h3>
              <p>Fast point-to-point courier runs for urgent parcels, documents, gifts, and small goods. Vans and motorbikes available.</p>
            </div>
          </article>

          <article ref={customerPickupRef} className={`service-tile dark ${customerPickupClass}`}>
            <div className="service-tile-body">
              <span className="service-tile-icon"><PackageCheck size={20} /></span>
              <h3>Doorstep Pickup &amp; Tracking</h3>
              <p>Schedule an instant pickup from your home or store. Receive real-time progress updates, SMS notifications, and photo proof of delivery.</p>
              <Link to="/request-pickup" className="service-tile-link">
                Request a Pickup <ArrowRight size={15} />
              </Link>
            </div>
          </article>
        </div>

        <article ref={coverageRef} className={`service-tile wide ${coverageClass}`}>
          <div className="service-tile-media">
            <img src={coverageImg} alt="Map of delivery coverage areas" />
          </div>
          <div className="service-tile-body">
            <span className="service-tile-icon"><MapPinned size={20} /></span>
            <h3>Coverage &amp; Regional Rates</h3>
            <p>Urban courier coverage tuned for rapid pickups, reliable transit times, and seamless customer handoffs.</p>
            <Link to="/services" className="service-tile-link">
              View Coverage &amp; Services <ArrowRight size={15} />
            </Link>
          </div>
        </article>
      </section>
    </div>
  );
}
