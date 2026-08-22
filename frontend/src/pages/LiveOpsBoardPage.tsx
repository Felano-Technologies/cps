
export default function LiveOpsBoardPage() {
  return (
    <div className="page-shell light-shell">
      
      <main className="container dashboard-screen">
        <h1>Operations Board</h1>
        <p className="muted-text">Live overview of riders, active jobs, and delivery progress.</p>

        <div className="dashboard-grid">
          <div className="map-card">
            <div className="map-header-row">
              <span>Live Jobs</span>
              <div className="map-actions">
                <span className="mini-icon-box">≡</span>
                <div className="mini-search">Search riders</div>
              </div>
            </div>
            <div className="map-surface">
              <div className="map-routes" />
              <div className="map-pin start">•</div>
              <div className="map-pin end">•</div>
            </div>
          </div>

          <aside className="shipment-list-card">
            <div className="shipment-header">
              <h3>Active Jobs</h3>
              <span className="pill-soft">4 Total</span>
            </div>

            <div className="shipment-item">
              <div className="shipment-main">
                <div className="tag-green">JOB-8924</div>
                <div className="subline">Pharmacy pickup</div>
                <div className="small-meta">ETA: Today, 14:30</div>
              </div>
              <span className="status-green">In Transit</span>
            </div>

            <div className="shipment-item">
              <div className="shipment-main">
                <div className="tag-green">JOB-9011</div>
                <div className="subline">Document delivery</div>
                <div className="small-meta">ETA: Today, 11:15</div>
              </div>
              <span className="status-green">Out for Delivery</span>
            </div>

            <div className="shipment-item">
              <div className="shipment-main">
                <div className="tag-green">JOB-7742</div>
                <div className="subline">Restaurant drop-off</div>
                <div className="small-meta">Delivered: Yesterday</div>
              </div>
              <span className="status-green">Delivered</span>
            </div>

            <div className="shipment-item">
              <div className="shipment-main">
                <div className="tag-green">JOB-4321</div>
                <div className="subline">Retail replenishment</div>
                <div className="small-meta">Action Required</div>
              </div>
              <span className="status-red">Delayed</span>
            </div>

            <button className="neutral-btn wide-btn">View All Jobs</button>
          </aside>
        </div>
      </main>

      <footer className="footer-bar black-footer">
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
