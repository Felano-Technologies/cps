
export default function FleetManagementPage() {
  return (
    <div className="page-shell light-shell">
      
      <main className="container fleet-screen">
        <div className="fleet-head-row">
          <div>
            <h2>Fleet Overview</h2>
            <p>Real-time status for riders, bikes, and active delivery zones.</p>
          </div>
          <div className="fleet-controls">
            <button className="neutral-btn small">All Regions</button>
            <button className="neutral-btn small">All Statuses</button>
            <button className="neutral-btn small">More Filters</button>
          </div>
        </div>

        <div className="stats-grid-4">
          <div className="stat-box-lite">
            <div className="tiny-label">Active Riders</div>
            <div className="big-number">1,248</div>
            <small>↑ 4.2% vs last week</small>
          </div>
          <div className="stat-box-lite">
            <div className="tiny-label">On-Time Rate</div>
            <div className="big-number">98.4%</div>
            <small>↑ 0.8%, vs last week</small>
          </div>
          <div className="stat-box-lite">
            <div className="tiny-label">Bike Health</div>
            <div className="big-number greened">Good</div>
            <div className="meter"><span /></div>
            <small>15% scheduled for maintenance</small>
          </div>
          <div className="stat-box-lite">
            <div className="tiny-label">Avg Range</div>
            <div className="big-number">8.2<span>km</span></div>
            <small>↓ 1.1% vs last week</small>
          </div>
        </div>

        <div className="fleet-table-layout">
          <div className="table-card">
            <div className="table-header-row">
              <h3>Detailed Fleet List</h3>
              <button className="mini-options">⋮</button>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Driver / Vehicle ID</th>
                  <th>Current Location</th>
                  <th>Task Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><div className="customer-pip green">JD</div>John Doe<br />BK-1042</td>
                  <td>Chicago, IL</td>
                  <td><span className="tag success">En Route</span></td>
                  <td>→</td>
                </tr>
                <tr>
                  <td><div className="customer-pip green">SJ</div>Sarah Jenkins<br />BK-2199</td>
                  <td>Atlanta, GA</td>
                  <td><span className="tag success">Loading</span></td>
                  <td>→</td>
                </tr>
                <tr>
                  <td><div className="customer-pip orange">MR</div>Michael Ross<br />BK-0883</td>
                  <td>Dallas, TX</td>
                  <td><span className="tag warning">Maintenance</span></td>
                  <td>→</td>
                </tr>
                <tr>
                  <td><div className="customer-pip green">AL</div>Amanda Lee<br />BK-3321</td>
                  <td>Seattle, WA</td>
                  <td><span className="tag success">Completed</span></td>
                  <td>→</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="map-mini-card">
            <div className="map-caption">Live Heatmap</div>
            <div className="map-mini-surface" />
            <div className="stats-lower">
              <div><span>Highest Density</span><strong>Midwest Hub</strong></div>
              <div><span>Active Units</span><strong>412</strong></div>
            </div>
          </div>
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
