import { useParams } from 'react-router-dom';

export default function CustomerTrackingPage() {
  const { parcelId } = useParams();

  return (
    <div className="page-shell light-shell">
      <main className="container" style={{ paddingTop: '48px', maxWidth: '800px', margin: '0 auto' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div className="shipment-badge" style={{ fontSize: '1.2rem', padding: '12px 24px', display: 'inline-block', marginBottom: '16px' }}>
            {parcelId || 'CPS-9982-441-A'}
          </div>
          <h1>Tracking Status</h1>
          <p className="muted-text">Real-time updates for your delivery.</p>
        </div>

        <div className="card-style" style={{ background: '#fff', padding: '32px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          
          <div style={{ textAlign: 'center', paddingBottom: '32px', borderBottom: '1px solid var(--border)', marginBottom: '32px' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--green)', marginBottom: '8px' }}>
              In Transit
            </div>
            <div style={{ color: '#64748b' }}>
              Your package is currently with the rider and expected within the hour.
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '32px' }}>
            <div>
              <div style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '4px' }}>From</div>
              <strong style={{ fontSize: '1.1rem' }}>Accra North Hub</strong>
            </div>
            <div>
              <div style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '4px' }}>To</div>
              <strong style={{ fontSize: '1.1rem', display: 'block' }}>Tech Campus HQ</strong>
              <span style={{ color: '#64748b' }}>KNUST, Kumasi, GH</span>
            </div>
          </div>

          <div style={{ marginTop: '32px', background: '#f8fafc', padding: '16px', borderRadius: '12px' }}>
            <div style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '8px' }}>Current Milestone</div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <span style={{ color: 'var(--green)', fontSize: '1.2rem' }}>◉</span>
              <strong style={{ fontSize: '1.1rem' }}>Rider En Route</strong>
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}
