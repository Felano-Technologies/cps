import { Link } from 'react-router-dom';

export default function SameDayDeliveryPage() {
  return (
    <div className="page-shell light-shell">
      <main className="hero-section container" style={{ paddingTop: '64px', paddingBottom: '32px' }}>
        <div className="hero-copy" style={{ maxWidth: '800px' }}>
          <h1>Same Day Delivery</h1>
          <p style={{ fontSize: '1.2rem', color: 'var(--text)' }}>
            When it absolutely has to be there today. Fast, point-to-point courier runs across the city for urgent parcels, documents, and time-sensitive goods.
          </p>
          <div style={{ marginTop: '32px' }}>
            <Link to="/request-pickup" className="primary-green track-btn" style={{ textDecoration: 'none', display: 'inline-flex', padding: '16px 32px', borderRadius: '12px', fontWeight: 700 }}>
              Request Same Day Pickup
            </Link>
          </div>
        </div>
      </main>

      <section className="services-wrapper container" style={{ marginTop: '32px', marginBottom: '80px' }}>
        <h2>Why Choose Same Day?</h2>
        <div className="service-feature-grid" style={{ marginTop: '32px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
          <article className="service-card dark-green-card" style={{ padding: '32px' }}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '16px', color: 'var(--lime)' }}>⚡ Lightning Fast</h3>
            <p style={{ color: '#e2e8f0' }}>Priority dispatching ensures a rider is assigned and on the way within minutes of your request.</p>
          </article>
          <article className="service-card dark-green-card" style={{ padding: '32px' }}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '16px', color: 'var(--lime)' }}>📍 Live Tracking</h3>
            <p style={{ color: '#e2e8f0' }}>Monitor your package in real-time from pickup to drop-off with live GPS tracking links.</p>
          </article>
          <article className="service-card dark-green-card" style={{ padding: '32px' }}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '16px', color: 'var(--lime)' }}>🔒 Secure Handoffs</h3>
            <p style={{ color: '#e2e8f0' }}>Mandatory digital signatures and photo proof of delivery for complete peace of mind.</p>
          </article>
        </div>
      </section>
    </div>
  );
}
