import { Link } from 'react-router-dom';
import samedayImg from '../assets/sameday.png';
import coverageImg from '../assets/coverage.jpg';

export default function LandingPage() {
  return (
    <div className="page-shell light-shell">
      
      <main className="hero-section container">
        <div className="hero-copy">
          <h1>Fast. Reliable. Local.</h1>
          <p>
            Professional motorbike and van courier operations for same-day pickups, urgent drops, and
            time-sensitive deliveries across the city.
          </p>

          <div className="search-box-row">
            <div className="input-shell tracking-input">
              <span className="circle-icon" />
              <input placeholder="Enter tracking ID or pickup code" />
            </div>
            <Link to="/shipments" className="primary-green track-btn" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Track</Link>
            <Link to="/request-pickup" className="dark-btn" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Request Pickup</Link>
          </div>
        </div>

        <div className="hero-visual">
          <div className="operations-card" aria-label="Operations center visual" />
        </div>
      </main>

      <div className="brand-row">
        <span>TRUSTED BY LOCAL BUSINESSES THAT NEED FAST COURIER COVERAGE</span>
        <div className="trust-list">
          <span>Retail</span>
          <span>Pharmacy</span>
          <span>Food</span>
          <span>Documents</span>
        </div>
      </div>

      <section className="services-wrapper container">
        <h2>Built for Couriers</h2>
        <p>Simple tools for dispatching riders, monitoring live orders, and keeping every delivery on time.</p>

        <div className="service-feature-grid">
          <article className="service-card wide-card">
            <div className="mini-photo van-photo" style={{ backgroundImage: `url(${samedayImg})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
            <div className="service-text">
              <h3>Same-Day Delivery</h3>
              <p>Fast point-to-point courier runs for urgent parcels, documents, and small goods. Vans and motorbikes available.</p>
            </div>
          </article>

          <article className="service-card dark-green-card">
            <div className="mini-photo cargo-photo" />
            <div className="service-text">
              <h3>Rider Dispatch</h3>
              <p>Assign the nearest rider, track progress, and manage exceptions in real time.</p>
              <Link to="/ops-board" className="text-link">View Dispatch Board →</Link>
            </div>
          </article>
        </div>

        <article className="service-card ship-card">
          <div style={{ width: '100%', maxWidth: '360px', borderRadius: '2rem', overflow: 'hidden', flexShrink: 0 }}>
            <img src={coverageImg} alt="Coverage Areas" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </div>
          <div className="service-text">
            <h3>Coverage by Area</h3>
            <p>
              Urban courier coverage tuned for rider zones, peak-hour demand, and fast handoffs.
            </p>
            <button className="primary-green small inline-btn">View Coverage</button>
          </div>
        </article>
      </section>
    </div>
  );
}
