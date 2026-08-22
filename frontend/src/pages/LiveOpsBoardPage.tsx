import { Link } from 'react-router-dom';

export default function LiveOpsBoardPage() {
  return (
    <div className="page-shell light-shell">
      
      <main className="container dashboard-screen">
        <h1>Operations Board</h1>
        <p className="muted-text">Live overview of riders, active jobs, and delivery progress.</p>

        <div className="summary-row-cards" style={{ marginTop: '24px' }}>
          <div className="stat-card">
            <div className="stat-head">Active Jobs</div>
            <div className="stat-big">342</div>
          </div>
          <div className="stat-card">
            <div className="stat-head">Available Riders</div>
            <div className="stat-big">84</div>
          </div>
          <div className="stat-card dark-card">
            <div className="stat-head">On-Time %</div>
            <div className="stat-big">96.8% <span>+1.2%</span></div>
          </div>
        </div>

        <div className="dashboard-grid">
          <div className="map-card">
            <div className="map-header-row">
              <span>Live Jobs Map</span>
              <div className="map-actions">
                <div className="mini-search">Filter by zone...</div>
              </div>
            </div>
            <div className="map-surface" style={{ position: 'relative' }}>
              <div className="map-routes" />
              {/* Map Pins representing jobs */}
              <div className="map-pin start" style={{ top: '30%', left: '40%' }}></div>
              <div className="map-pin end" style={{ top: '50%', left: '60%' }}></div>
              <div className="map-pin end" style={{ top: '20%', left: '70%', background: 'var(--amber)' }}></div>
              
              <div style={{ position: 'absolute', bottom: '16px', right: '16px', background: 'rgba(255,255,255,0.9)', padding: '8px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                📍 Live tracking active
              </div>
            </div>
          </div>

          <aside className="shipment-list-card">
            <div className="shipment-header">
              <h3>Active Jobs</h3>
              <span className="pill-soft">4 Total</span>
            </div>

            <div className="shipment-item">
              <div className="shipment-main">
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div className="tag-green">JOB-8924</div>
                  <span title="Motorbike">🏍️</span>
                </div>
                <div className="subline">Pharmacy pickup</div>
                <div className="small-meta">ETA: Today, 14:30</div>
              </div>
              <span className="status-green">In Transit</span>
            </div>

            <div className="shipment-item">
              <div className="shipment-main">
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div className="tag-green">JOB-9011</div>
                  <span title="Van">🚐</span>
                </div>
                <div className="subline">Electronics delivery</div>
                <div className="small-meta">ETA: Today, 11:15</div>
              </div>
              <span className="status-green">Out for Delivery</span>
            </div>

            <div className="shipment-item">
              <div className="shipment-main">
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div className="tag-green">JOB-7742</div>
                  <span title="Motorbike">🏍️</span>
                </div>
                <div className="subline">Restaurant drop-off</div>
                <div className="small-meta">Delivered: Yesterday</div>
              </div>
              <span className="status-green">Delivered</span>
            </div>

            <div className="shipment-item">
              <div className="shipment-main">
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div className="tag-green">JOB-4321</div>
                  <span title="Van">🚐</span>
                </div>
                <div className="subline">Retail replenishment</div>
                <div className="small-meta" style={{ color: 'var(--danger)' }}>Action Required</div>
              </div>
              <span className="status-red">Delayed</span>
            </div>

            <Link to="/tracking/JOB-8924" className="neutral-btn wide-btn" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>View Tracking Dashboard</Link>
          </aside>
        </div>
      </main>

    </div>
  );
}
