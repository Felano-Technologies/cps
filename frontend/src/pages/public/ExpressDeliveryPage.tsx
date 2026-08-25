import { Link } from 'react-router-dom';

export default function ExpressDeliveryPage() {
  return (
    <div className="page-shell light-shell">
      <main className="hero-section container" style={{ paddingTop: '64px', paddingBottom: '32px' }}>
        <div className="hero-copy" style={{ maxWidth: '800px' }}>
          <h1>Express Delivery</h1>
          <p style={{ fontSize: '1.2rem', color: 'var(--text)' }}>
            Skip the queue. Our express service guarantees priority routing and zero stops between pickup and destination.
          </p>
          <div style={{ marginTop: '32px' }}>
            <Link to="/request-pickup" className="primary-green track-btn" style={{ textDecoration: 'none', display: 'inline-flex', padding: '16px 32px', borderRadius: '12px', fontWeight: 700 }}>
              Book Express Delivery
            </Link>
          </div>
        </div>
      </main>

      <section className="services-wrapper container" style={{ marginTop: '32px', marginBottom: '80px' }}>
        <h2>The Express Advantage</h2>
        <div className="service-feature-grid" style={{ marginTop: '32px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
          <article className="service-card dark-green-card" style={{ padding: '32px' }}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '16px', color: 'var(--lime)' }}>🚀 Direct Routing</h3>
            <p style={{ color: '#e2e8f0' }}>Your package goes straight to its destination with absolutely zero detours or consolidated stops.</p>
          </article>
          <article className="service-card dark-green-card" style={{ padding: '32px' }}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '16px', color: 'var(--lime)' }}>⭐ Priority Fleet</h3>
            <p style={{ color: '#e2e8f0' }}>Access our premium tier of elite riders and drivers dedicated specifically to express orders.</p>
          </article>
          <article className="service-card dark-green-card" style={{ padding: '32px' }}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '16px', color: 'var(--lime)' }}>⏱️ SLA Guaranteed</h3>
            <p style={{ color: '#e2e8f0' }}>We guarantee strict pickup and delivery windows, ensuring your most critical shipments are never delayed.</p>
          </article>
        </div>
      </section>
    </div>
  );
}
