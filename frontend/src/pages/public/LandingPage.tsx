import { Link } from 'react-router-dom';
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
} from 'lucide-react';
import { useReveal } from '../../hooks/useReveal';
import samedayImg from '../../assets/sameday.png';
import coverageImg from '../../assets/coverage.jpg';
import '../../styles/landing.css';

export default function LandingPage() {
  const { ref: trustRef, className: trustClass } = useReveal<HTMLDivElement>();
  const { ref: headingRef, className: headingClass } = useReveal<HTMLDivElement>();
  const { ref: samedayRef, className: samedayClass } = useReveal<HTMLElement>();
  const { ref: dispatchRef, className: dispatchClass } = useReveal<HTMLElement>();
  const { ref: coverageRef, className: coverageClass } = useReveal<HTMLElement>();

  return (
    <div className="page-shell light-shell">

      <main className="landing-hero container">
        <div className="hero-copy">
          <h2 style={{ fontSize: 'clamp(2.8rem, 4.6vw, 4.2rem)', color: 'var(--navy)', fontWeight: 800, margin: '0 0 24px', lineHeight: 1.05, letterSpacing: '-0.03em' }}>
            Welcome to <br />
            <span style={{ color: 'forestgreen' }}>CPS</span> <br />
            Delivery Services
          </h2>

          <span className="hero-eyebrow">
            <Radar size={14} />
            Local courier network
          </span>

          <div style={{ margin: '8px 0 24px' }}>
            <Link to="/request-pickup" className="dark-btn" style={{ display: 'inline-flex', padding: '14px 28px', fontSize: '1.05rem', borderRadius: '8px' }}>
              <PackagePlus size={18} /> Request Pickup
            </Link>
          </div>
          <p className="lede">
            Professional motorbike and van courier operations for same-day pickups, urgent drops, and
            time-sensitive deliveries across the city.
          </p>

          <div className="hero-search-row">
            <div className="search-field">
              <Search size={18} />
              <input placeholder="Enter tracking ID or pickup code" />
            </div>
            <Link to="/shipments" className="primary-green track-btn">
              Track <ArrowRight size={16} />
            </Link>
          </div>

          <ul className="hero-capabilities">
            <li><Truck size={16} /> Motorbike &amp; van fleet</li>
            <li><Clock size={16} /> Same-day dispatch</li>
            <li><ShieldCheck size={16} /> Proof of delivery</li>
          </ul>
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
          <h2>Built for Couriers</h2>
          <p>Simple tools for dispatching riders, monitoring live orders, and keeping every delivery on time.</p>
        </div>

        <div className="services-top">
          <article ref={samedayRef} className={`service-tile ${samedayClass}`}>
            <div className="service-tile-media">
              <img src={samedayImg} alt="Same-day courier on a delivery run" />
            </div>
            <div className="service-tile-body">
              <h3>Same-Day Delivery</h3>
              <p>Fast point-to-point courier runs for urgent parcels, documents, and small goods. Vans and motorbikes available.</p>
            </div>
          </article>

          <article ref={dispatchRef} className={`service-tile dark ${dispatchClass}`}>
            <div className="service-tile-body">
              <span className="service-tile-icon"><Radar size={20} /></span>
              <h3>Rider Dispatch</h3>
              <p>Assign the nearest rider, track progress, and manage exceptions in real time.</p>
              <Link to="/ops-board" className="service-tile-link">
                View Dispatch Board <ArrowRight size={15} />
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
            <h3>Coverage by Area</h3>
            <p>Urban courier coverage tuned for rider zones, peak-hour demand, and fast handoffs.</p>
            <Link to="/services" className="service-tile-link">
              View Coverage <ArrowRight size={15} />
            </Link>
          </div>
        </article>
      </section>
    </div>
  );
}
