export default function RouteScreen() {
  return (
    <div className="page-shell route-shell">
      <div className="route-card">
        <div className="route-header-row">
          <div className="route-brand-row">
            <div className="green-icon">🏍</div>
            <h2>Today's Route</h2>
          </div>
          <button className="neutral-btn small bell-btn">🔔</button>
        </div>

        <div className="route-main-card">
          <div className="route-title-row">
            <span className="route-label">CURRENT ROUTE</span>
            <span className="progress-pill">In Progress</span>
          </div>
          <h3>Route 42A - Downtown</h3>
          <div className="route-metrics">
            <div>
              <span>Total Stops</span>
              <strong>24</strong>
            </div>
            <div>
              <span>Completed</span>
              <strong>8</strong>
            </div>
            <div>
              <span>Est. Time</span>
              <strong>4h 15m</strong>
            </div>
          </div>
        </div>

        <div className="route-map-card">
          <div className="small-map" />
        </div>

        <div className="next-stop-row">
          <div className="next-label">NEXT STOP (0.8 mi)</div>
          <div className="next-address">1400 1st Ave, Seattle, WA</div>
          <div className="next-button">➜</div>
        </div>

        <div className="stops-header-row">
          <h4>Upcoming Stops</h4>
          <span>16 remaining</span>
        </div>

        <div className="stop-item active-stop">
          <div className="stop-number">9</div>
          <div className="stop-copy">
            <div className="stop-address">1400 1st Ave</div>
            <div className="stop-detail">Suite 200, Building B</div>
            <div className="sub-detail"><span className="mini-box" /> 3 Parcels</div>
          </div>
          <button className="primary-green route-action">Arrive</button>
        </div>

        <div className="stop-item">
          <div className="stop-number">10</div>
          <div className="stop-copy">
            <div className="stop-address">801 2nd Ave</div>
            <div className="stop-detail">Front desk drop-off</div>
            <div className="sub-detail"><span className="mini-box" /> 1 Parcel</div>
          </div>
        </div>

        <div className="stop-item">
          <div className="stop-number">11</div>
          <div className="stop-copy">
            <div className="stop-address">1001 4th Ave</div>
            <div className="stop-detail">Loading dock access</div>
            <div className="sub-detail"><span className="mini-box" /> 5 Parcels</div>
          </div>
        </div>

        <div className="bottom-nav">
          <button className="nav-item active">Route</button>
          <button className="nav-item">Orders</button>
          <button className="nav-item">Tracking</button>
          <button className="nav-item">Profile</button>
        </div>
      </div>
    </div>
  );
}
