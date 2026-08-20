export default function TrackingPage() {
  return (
    <div className="page-shell admin-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">Dispatch Console</div>
        <div className="sidebar-subtitle">Motorbike courier control</div>
        <button className="primary-green sidebar-create">+ New Job</button>

        <nav className="sidebar-nav">
          <span>Jobs</span>
          <span>Riders</span>
          <span className="active-menu">Tracking</span>
          <span>Fleet</span>
          <span>Settings</span>
        </nav>

        <div className="sidebar-footer">
          <span>Settings</span>
          <span>Support</span>
          <div className="user-box">Dispatch Lead</div>
        </div>
      </aside>

      <main className="admin-main">
        <div className="back-link">← Back to Tracking List</div>

        <div className="tracking-header-row">
          <h1>Parcel Tracking</h1>
          <div className="header-actions">
            <div className="shipment-badge">CPS-9982-441-A</div>
            <span className="status-green small-tag">In Transit</span>
            <button className="dark-btn small">Print Label</button>
            <button className="neutral-btn small">Share</button>
          </div>
        </div>

        <div className="tracking-content">
          <div className="map-card large-map">
            <div className="mini-map" />
          </div>

          <aside className="history-panel">
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

        <div className="details-grid">
          <div className="info-block">
            <div className="card-title">Route Details</div>
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

          <div className="info-block">
            <div className="card-title">Delivery Details</div>
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
