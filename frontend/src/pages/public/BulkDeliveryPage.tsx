import { Link } from 'react-router-dom';

export default function BulkDeliveryPage() {
  return (
    <div className="page-shell light-shell">
      <main className="hero-section container" style={{ paddingTop: '64px', paddingBottom: '32px' }}>
        <div className="hero-copy" style={{ maxWidth: '800px' }}>
          <h1>Bulk & Freight Delivery</h1>
          <p style={{ fontSize: '1.2rem', color: 'var(--text)' }}>
            High-volume shipping solutions for B2B logistics, warehouse transfers, and oversized cargo.
          </p>
          <div style={{ marginTop: '32px' }}>
            <Link to="/request-pickup" className="primary-green track-btn" style={{ textDecoration: 'none', display: 'inline-flex', padding: '16px 32px', borderRadius: '12px', fontWeight: 700 }}>
              Request Bulk Transport
            </Link>
          </div>
        </div>
      </main>

      <section className="services-wrapper container" style={{ marginTop: '32px', marginBottom: '80px' }}>
        <h2>Built for Volume</h2>
        <div className="service-feature-grid" style={{ marginTop: '32px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
          <article className="service-card dark-green-card" style={{ padding: '32px' }}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '16px', color: 'var(--lime)' }}>🚛 Van & Truck Fleet</h3>
            <p style={{ color: '#e2e8f0' }}>Access our specialized fleet of cargo vans and box trucks for heavy or high-volume shipments.</p>
          </article>
          <article className="service-card dark-green-card" style={{ padding: '32px' }}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '16px', color: 'var(--lime)' }}>🗺️ Multi-Drop Routes</h3>
            <p style={{ color: '#e2e8f0' }}>Seamlessly plan and execute complex multi-stop delivery routes across the city in one booking.</p>
          </article>
          <article className="service-card dark-green-card" style={{ padding: '32px' }}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '16px', color: 'var(--lime)' }}>🏢 Account Management</h3>
            <p style={{ color: '#e2e8f0' }}>Volume clients receive a dedicated logistics manager to oversee supply chain operations.</p>
          </article>
        </div>
      </section>
    </div>
  );
}
