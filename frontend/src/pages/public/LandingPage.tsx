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
import heroImg from '../../assets/hero.png';
import samedayImg from '../../assets/sameday.png';
import coverageImg from '../../assets/coverage.jpg';
import '../../styles/landing.css';

export default function LandingPage() {
  const trustReveal = useReveal<HTMLDivElement>();
  const headingReveal = useReveal<HTMLDivElement>();
  const samedayReveal = useReveal<HTMLElement>();
  const dispatchReveal = useReveal<HTMLElement>();
  const coverageReveal = useReveal<HTMLElement>();

  return (
    <div className="page-shell light-shell">

      <main className="landing-hero container">
        <div className="hero-copy">
          <span className="hero-eyebrow">
            <Radar size={14} />
            Local courier network
          </span>

          <h1>Fast. Reliable. Local.</h1>
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
            <Link to="/request-pickup" className="dark-btn">
              <PackagePlus size={16} /> Request Pickup
            </Link>
          </div>

          <ul className="hero-capabilities">
            <li><Truck size={16} /> Motorbike &amp; van fleet</li>
            <li><Clock size={16} /> Same-day dispatch</li>
            <li><ShieldCheck size={16} /> Proof of delivery</li>
          </ul>
        </div>

        <div className="hero-visual">
          <div className="hero-visual-glow" aria-hidden="true" />

          <div className="hero-visual-frame">
            <img src={heroImg} alt="Rider preparing a delivery" />
          </div>

          <div className="hero-visual-badge tracking">
            <span className="icon-chip">
              <Radar size={16} />
              <span className="live-dot" />
            </span>
            <div>
              <strong>Live rider tracking</strong>
              <span>Know exactly where your parcel is</span>
            </div>
          </div>

          <div className="hero-visual-badge verified">
            <span className="icon-chip"><ShieldCheck size={16} /></span>
            <div>
              <strong>Verified delivery</strong>
              <span>Signed proof, every drop-off</span>
            </div>
          </div>
        </div>
      </main>

      <div ref={trustReveal.ref} className={`trust-strip ${trustReveal.className}`}>
        <span className="label">Trusted by local businesses that need fast courier coverage</span>
        <ul>
          <li><ShoppingBag size={16} /> Retail</li>
          <li><Pill size={16} /> Pharmacy</li>
          <li><UtensilsCrossed size={16} /> Food</li>
          <li><FileText size={16} /> Documents</li>
        </ul>
      </div>

      <section className="landing-services container">
        <div ref={headingReveal.ref} className={`section-heading ${headingReveal.className}`}>
          <h2>Built for Couriers</h2>
          <p>Simple tools for dispatching riders, monitoring live orders, and keeping every delivery on time.</p>
        </div>

        <div className="services-top">
          <article ref={samedayReveal.ref} className={`service-tile ${samedayReveal.className}`}>
            <div className="service-tile-media">
              <img src={samedayImg} alt="Same-day courier on a delivery run" />
            </div>
            <div className="service-tile-body">
              <h3>Same-Day Delivery</h3>
              <p>Fast point-to-point courier runs for urgent parcels, documents, and small goods. Vans and motorbikes available.</p>
            </div>
          </article>

          <article ref={dispatchReveal.ref} className={`service-tile dark ${dispatchReveal.className}`}>
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

        <article ref={coverageReveal.ref} className={`service-tile wide ${coverageReveal.className}`}>
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
