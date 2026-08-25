import { useParams, Link } from 'react-router-dom';

export default function OpsTrackingPage() {
  const { parcelId } = useParams();

  return (
    <div className="page-shell light-shell">
      <main className="container" style={{ paddingTop: '32px' }}>
        <div style={{ marginBottom: '24px', fontSize: '0.9rem' }}>
          <Link to="/ops-board" style={{ color: '#64748b', textDecoration: 'none' }}>Live Ops Board</Link>
          <span style={{ margin: '0 8px', color: '#cbd5e1' }}>&gt;</span>
          <span style={{ color: 'var(--navy)', fontWeight: 600 }}>Ops Parcel Tracking</span>
        </div>

        <div className="tracking-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>Ops Parcel Tracking</h1>
          <div className="header-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div className="shipment-badge">{parcelId || 'CPS-9982-441-A'}</div>
            <span className="status-green small-tag">In Transit</span>
            <button className="dark-btn small" style={{ padding: '8px 16px', borderRadius: '8px' }}>Print Label</button>
            <button className="neutral-btn small" style={{ padding: '8px 16px', borderRadius: '8px' }}>Share</button>
          </div>
        </div>

        <div className="tracking-content" style={{ marginTop: '24px' }}>
          <div className="map-card large-map" style={{ borderRadius: '12px', overflow: 'hidden' }}>
            <div className="mini-map" style={{ minHeight: '400px', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#64748b' }}>Live Map View (Accra - Kumasi Route)</span>
            </div>
          </div>

          <aside className="history-panel card-style" style={{ background: '#fff', padding: '24px', borderRadius: '12px' }}>
            <div className="history-title" style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '24px' }}>Tracking History</div>
            
            <div className="history-item green-item" style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
              <div className="history-icon" style={{ color: 'var(--green)' }}>◉</div>
              <div>
                <strong style={{ display: 'block' }}>Rider En Route</strong>
                <div style={{ fontSize: '0.9rem', color: '#64748b', margin: '4px 0' }}>Parcel is with the rider. Expected within the hour.</div>
                <small style={{ color: '#94a3b8' }}>Kumasi, KNUST</small>
              </div>
            </div>
            
            <div className="history-item" style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
              <div className="history-icon" style={{ color: '#cbd5e1' }}>◌</div>
              <div>
                <strong style={{ display: 'block' }}>Collected From Pickup</strong>
                <div style={{ fontSize: '0.9rem', color: '#64748b', margin: '4px 0' }}>Collected and checked in by rider.</div>
                <small style={{ color: '#94a3b8' }}>Kumasi, KNUST</small>
              </div>
            </div>
            
            <div className="history-item" style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
              <div className="history-icon" style={{ color: '#cbd5e1' }}>◌</div>
              <div>
                <strong style={{ display: 'block' }}>Left Dispatch Point</strong>
                <div style={{ fontSize: '0.9rem', color: '#64748b', margin: '4px 0' }}>Rider left the hub and entered service area.</div>
                <small style={{ color: '#94a3b8' }}>Accra, North Kaneshie</small>
              </div>
            </div>
            
            <div className="history-item" style={{ display: 'flex', gap: '16px' }}>
              <div className="history-icon" style={{ color: '#cbd5e1' }}>◌</div>
              <div>
                <strong style={{ display: 'block' }}>Order Created</strong>
                <div style={{ fontSize: '0.9rem', color: '#64748b', margin: '4px 0' }}>System generated</div>
              </div>
            </div>
          </aside>
        </div>

        <div className="details-grid" style={{ marginTop: '24px', marginBottom: '48px' }}>
          <div className="info-block card-style" style={{ background: '#fff', padding: '24px', borderRadius: '12px' }}>
            <div className="card-title" style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>Route Details</div>
            
            <div className="route-detail-row" style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
              <span className="dot-black" style={{ width: '12px', height: '12px', background: '#000', borderRadius: '50%', marginTop: '6px' }} />
              <div>
                <strong style={{ display: 'block' }}>Origin</strong>
                <div style={{ color: '#64748b' }}>Accra North Hub</div>
              </div>
            </div>
            
            <div className="route-detail-row" style={{ display: 'flex', gap: '16px' }}>
              <span className="dot-green" style={{ width: '12px', height: '12px', background: 'var(--green)', borderRadius: '50%', marginTop: '6px' }} />
              <div>
                <strong style={{ display: 'block' }}>Destination</strong>
                <div style={{ color: '#64748b' }}>Tech Campus HQ</div>
                <div style={{ color: '#64748b' }}>KNUST, Kumasi, GH</div>
              </div>
            </div>
          </div>

          <div className="info-block card-style" style={{ background: '#fff', padding: '24px', borderRadius: '12px' }}>
            <div className="card-title" style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>Delivery Details</div>
            
            <div className="spec-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ color: '#64748b' }}>Item</span>
              <strong>Small Parcel</strong>
            </div>
            <div className="spec-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ color: '#64748b' }}>Priority</span>
              <strong>Express</strong>
            </div>
            <div className="spec-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ color: '#64748b' }}>Rider</span>
              <strong>Kwame D.</strong>
            </div>
            
            <div className="signature-box" style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '16px', padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
              <span className="sig-mark" style={{ background: 'var(--green)', color: '#fff', padding: '4px 8px', borderRadius: '4px' }}>✓</span>
              <div>
                <strong style={{ display: 'block' }}>Signature Required</strong>
                <small style={{ color: '#64748b' }}>ID verification at drop-off</small>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
