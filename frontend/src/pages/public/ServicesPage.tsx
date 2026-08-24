import { Link } from 'react-router-dom';

export default function ServicesPage() {
  return (
    <div className="page-shell light-shell">
      <main className="hero-section container" style={{ paddingTop: '64px', paddingBottom: '32px' }}>
        <div className="hero-copy" style={{ maxWidth: '800px' }}>
          <h1>Logistics solutions for every need.</h1>
          <p style={{ fontSize: '1.2rem', color: 'var(--text)' }}>
            From single documents to multi-ton freight, our platform and fleet are equipped to handle your delivery requirements across Ghana.
          </p>
        </div>
      </main>

      <section className="services-wrapper container" style={{ marginTop: '32px', marginBottom: '80px' }}>
        <div className="service-feature-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '32px' }}>
          
          <article className="service-card wide-card" style={{ padding: '32px' }}>
            <h3 style={{ fontSize: '1.8rem', color: 'var(--navy)' }}>Same Day Delivery</h3>
            <p style={{ marginTop: '12px', marginBottom: '24px', fontSize: '1.1rem' }}>When it absolutely has to be there today. Fast, point-to-point courier runs.</p>
            <Link to="/services/same-day" className="dark-btn" style={{ textDecoration: 'none', display: 'inline-block' }}>Learn More</Link>
          </article>

          <article className="service-card wide-card" style={{ padding: '32px' }}>
            <h3 style={{ fontSize: '1.8rem', color: 'var(--navy)' }}>Express Delivery</h3>
            <p style={{ marginTop: '12px', marginBottom: '24px', fontSize: '1.1rem' }}>Skip the queue. Guaranteed priority routing and zero stops between pickup and destination.</p>
            <Link to="/services/express" className="dark-btn" style={{ textDecoration: 'none', display: 'inline-block' }}>Learn More</Link>
          </article>

          <article className="service-card wide-card" style={{ padding: '32px' }}>
            <h3 style={{ fontSize: '1.8rem', color: 'var(--navy)' }}>Standard Delivery</h3>
            <p style={{ marginTop: '12px', marginBottom: '24px', fontSize: '1.1rem' }}>Reliable, cost-effective everyday delivery. Perfect for regular e-commerce orders.</p>
            <Link to="/services/standard" className="dark-btn" style={{ textDecoration: 'none', display: 'inline-block' }}>Learn More</Link>
          </article>

          <article className="service-card wide-card" style={{ padding: '32px' }}>
            <h3 style={{ fontSize: '1.8rem', color: 'var(--navy)' }}>Bulk Delivery</h3>
            <p style={{ marginTop: '12px', marginBottom: '24px', fontSize: '1.1rem' }}>High-volume shipping solutions for B2B logistics, warehouse transfers, and oversized cargo.</p>
            <Link to="/services/bulk" className="dark-btn" style={{ textDecoration: 'none', display: 'inline-block' }}>Learn More</Link>
          </article>

        </div>
      </section>
    </div>
  );
}
