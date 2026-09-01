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
import heroImg from '../../assets/hero.png';
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

        <div className="hero-visual">
          <div className="hero-visual-glow" />
          <div className="hero-visual-frame">
            <img
              src={heroImg}
              alt="CPS Courier Dispatch and Parcel Delivery Operations"
              width={600}
              height={750}
              loading="eager"
            />
          </div>

          <div className="hero-visual-badge tracking">
            <div className="icon-chip">
              <MapPinned size={18} />
              <span className="live-dot" />
            </div>
            <div>
              <strong>Live Tracking Active</strong>
              <span>GPS dispatched rider</span>
            </div>
          </div>

          <div className="hero-visual-badge verified">
            <div className="icon-chip">
              <PackageCheck size={18} />
            </div>
            <div>
              <strong>100% Verified Delivery</strong>
              <span>Recipient signature &amp; POD</span>
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
