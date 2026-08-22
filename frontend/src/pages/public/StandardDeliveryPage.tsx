import { Link } from 'react-router-dom';

export default function StandardDeliveryPage() {
  return (
    <div className="page-shell light-shell">
      <main className="hero-section container" style={{ paddingTop: '64px', paddingBottom: '32px' }}>
        <div className="hero-copy" style={{ maxWidth: '800px' }}>
          <h1>Standard Delivery</h1>
          <p style={{ fontSize: '1.2rem', color: 'var(--text)' }}>
            Reliable, cost-effective everyday delivery. Perfect for regular e-commerce orders, scheduled drops, and non-urgent parcels.
          </p>
          <div style={{ marginTop: '32px' }}>
            <Link to="/request-pickup" className="primary-green track-btn" style={{ textDecoration: 'none', display: 'inline-flex', padding: '16px 32px', borderRadius: '12px', fontWeight: 700 }}>
              Schedule Standard Delivery
            </Link>
          </div>
        </div>
      </main>

      <section className="services-wrapper container" style={{ marginTop: '32px', marginBottom: '80px' }}>
        <h2>Standard Excellence</h2>
        <div className="service-feature-grid" style={{ marginTop: '32px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
          <article className="service-card dark-green-card" style={{ padding: '32px' }}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '16px', color: 'var(--lime)' }}>💰 Cost-Effective</h3>
            <p style={{ color: '#e2e8f0' }}>Optimized zone-based routing allows us to keep delivery costs low without sacrificing reliability.</p>
          </article>
          <article className="service-card dark-green-card" style={{ padding: '32px' }}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '16px', color: 'var(--lime)' }}>📅 Next-Day Guarantee</h3>
            <p style={{ color: '#e2e8f0' }}>Standard doesn't mean slow. We ensure delivery by the end of the next business day.</p>
          </article>
          <article className="service-card dark-green-card" style={{ padding: '32px' }}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '16px', color: 'var(--lime)' }}>🔄 Scheduled Pickups</h3>
            <p style={{ color: '#e2e8f0' }}>Set a recurring schedule for daily dispatch, perfect for retail stores and online sellers.</p>
          </article>
        </div>
      </section>
    </div>
  );
}
