import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
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
import InstallAppBanner from '../../components/InstallAppBanner';
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

      {/* Hero Section: Replaced by Install Showcase on Desktop & Install CTA Button on Mobile */}
      <InstallAppBanner
        trackingQuery={trackingQuery}
        setTrackingQuery={setTrackingQuery}
        onTrackSubmit={handleTrackSubmit}
      />

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
