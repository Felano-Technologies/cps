import { useParams, Link } from 'react-router-dom';

export default function TrackingDetailsPage() {
  const { parcelId } = useParams();

  return (
    <div className="page-shell light-shell">
      <main className="container" style={{ paddingTop: '32px' }}>
        <div style={{ marginBottom: '24px', fontSize: '0.9rem' }}>
          <Link to="/ops-board" style={{ color: '#64748b', textDecoration: 'none' }}>Live Ops Board</Link>
          <span style={{ margin: '0 8px', color: '#cbd5e1' }}>&gt;</span>
          <span style={{ color: 'var(--navy)', fontWeight: 600 }}>Parcel Tracking</span>
        </div>

        <div className="tracking-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>Parcel Tracking</h1>
          <div className="header-actions">
            <div className="shipment-badge">{parcelId || 'CPS-9982-441-A'}</div>
            <span className="status-green small-tag">In Transit</span>
            <button className="dark-btn small">Print Label</button>
            <button className="neutral-btn small">Share</button>
          </div>
        </div>

        <div className="tracking-content" style={{ display: 'grid', gap: '24px', marginTop: '24px' }}>
          <div className="map-card large-map">
            <div className="mini-map" style={{ minHeight: '400px' }} />
          </div>

          <aside className="history-panel card-style">
            <div className="history-title">Tracking History</div>
            <div className="history-item green-item">
              <div className="history-icon">◉</div>
              <div>
                <strong>Rider En Route</strong>
                <div>Parcel is with the rider. Expected within the hour.</div>
                <small>Seattle, WA</small>
              </div>
            </div>
            <div className="history-item">
              <div className="history-icon">◌</div>
              <div>
                <strong>Collected From Pickup</strong>
                <div>Collected and checked in by rider.</div>
                <small>Seattle, WA</small>
              </div>
            </div>
            <div className="history-item">
              <div className="history-icon">◌</div>
              <div>
                <strong>Left Dispatch Point</strong>
                <div>Rider left the hub and entered service area.</div>
                <small>Portland, OR</small>
              </div>
            </div>
            <div className="history-item">
              <div className="history-icon">◌</div>
              <div>
                <strong>Job Created</strong>
                <div>System generated</div>
              </div>
            </div>
          </aside>
        </div>

        <div className="details-grid" style={{ display: 'grid', gap: '24px', marginTop: '24px', marginBottom: '48px' }}>
          <div className="info-block card-style">
            <div className="card-title" style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>Route Details</div>
            <div className="route-detail-row">
              <span className="dot-black" />
              <div>
                <strong>Origin</strong>
                <div>North Hub</div>
              </div>
            </div>
            <div className="route-detail-row">
              <span className="dot-green" />
              <div>
                <strong>Destination</strong>
                <div>Tech Campus HQ</div>
                <div>880 5th Ave, Seattle, WA</div>
              </div>
            </div>
          </div>

          <div className="info-block card-style">
            <div className="card-title" style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>Delivery Details</div>
            <div className="spec-row"><span>Item</span><strong>Small Parcel</strong></div>
            <div className="spec-row"><span>Priority</span><strong>Express</strong></div>
            <div className="spec-row"><span>Rider</span><strong>J. Doe</strong></div>
            <div className="signature-box">
              <span className="sig-mark">✓</span>
              <div>
                <strong>Signature Required</strong>
                <small>ID verification at drop-off</small>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
