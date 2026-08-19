
export default function LandingScreen() {
  return (
    <div className="page-shell light-shell">
      
      <main className="hero-section container">
        <div className="hero-copy">
          <h1>Fast. Reliable. Local.</h1>
          <p>
            Professional motorbike courier operations for same-day pickups, urgent drops, and
            time-sensitive deliveries across the city.
          </p>

          <div className="search-box-row">
            <div className="input-shell tracking-input">
              <span className="circle-icon" />
              <input value="Enter tracking ID or pickup code" readOnly />
            </div>
            <button className="primary-green track-btn">Track</button>
            <button className="dark-btn">Request Pickup</button>
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
        <p>Simple tools for dispatching riders, monitoring live jobs, and keeping every delivery on time.</p>

        <div className="service-feature-grid">
          <article className="service-card wide-card">
            <div className="mini-photo van-photo" />
            <div className="service-text">
              <h3>Same-Day Delivery</h3>
              <p>Fast point-to-point courier runs for urgent parcels, documents, and small goods.</p>
            </div>
          </article>

          <article className="service-card dark-green-card">
            <div className="mini-icon globe-mini" />
            <div className="service-text">
              <h3>Rider Dispatch</h3>
              <p>Assign the nearest rider, track progress, and manage exceptions in real time.</p>
              <button className="text-link">View Dispatch Board →</button>
            </div>
          </article>
        </div>

        <article className="service-card ship-card">
          <div className="mini-photo cargo-photo" />
          <div className="service-text">
            <h3>Coverage by Area</h3>
            <p>
              Urban courier coverage tuned for rider zones, peak-hour demand, and fast handoffs.
            </p>
            <button className="primary-green small inline-btn">View Coverage</button>
          </div>
        </article>
      </section>

      <footer className="footer-bar">
        <div className="brand-title small-brand">CPS Delivery Services</div>
        <div className="footer-links">
          <span>Service Terms</span>
          <span>Support</span>
          <span>Coverage</span>
          <span>Contact</span>
        </div>
        <span>© 2026 CPS Delivery Services. All rights reserved.</span>
      </footer>
    </div>
  );
}
