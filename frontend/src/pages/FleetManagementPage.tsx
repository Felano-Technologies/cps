export default function FleetManagementPage() {
  return (
    <div className="page-shell light-shell">
      
      <main className="container fleet-screen">
        <div className="fleet-head-row">
          <div>
            <h2>Fleet Overview</h2>
            <p>Real-time status for riders, bikes, vans, and active delivery zones.</p>
          </div>
          <div className="fleet-controls" style={{ display: 'flex', gap: '8px' }}>
            <button className="neutral-btn small active-menu" style={{ background: 'var(--green)', color: '#000', fontWeight: 'bold' }}>All Vehicles</button>
            <button className="neutral-btn small">🏍️ Motorbikes Only</button>
            <button className="neutral-btn small">🚐 Vans Only</button>
            <button className="neutral-btn small">More Filters</button>
          </div>
        </div>

        <div className="stats-grid-4">
          <div className="stat-box-lite card-style">
            <div className="tiny-label">Active Riders/Drivers</div>
            <div className="big-number">1,248</div>
            <small>↑ 4.2% vs last week</small>
          </div>
          <div className="stat-box-lite card-style">
            <div className="tiny-label">On-Time Rate</div>
            <div className="big-number">98.4%</div>
            <small>↑ 0.8%, vs last week</small>
          </div>
          <div className="stat-box-lite card-style">
            <div className="tiny-label">Fleet Health</div>
            <div className="big-number" style={{ color: 'var(--green-dark)' }}>Good</div>
            <div className="meter" style={{ height: '4px', background: '#e2e8f0', borderRadius: '2px', overflow: 'hidden', marginTop: '8px' }}>
              <div style={{ height: '100%', width: '85%', background: 'var(--green)' }}></div>
            </div>
            <small>15% scheduled for maintenance</small>
          </div>
          <div className="stat-box-lite card-style">
            <div className="tiny-label">Avg Utilization</div>
            <div className="big-number">82<span>%</span></div>
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
                  <th>Vehicle</th>
                  <th>Current Location</th>
                  <th>Task Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><div className="customer-pip" style={{ background: 'var(--green)', color: '#000' }}>JD</div>John Doe<br /><small style={{ color: '#64748b' }}>BK-1042</small></td>
                  <td style={{ fontSize: '1.2rem' }} title="Motorbike">🏍️</td>
                  <td>Chicago, IL</td>
                  <td><span className="tag success">En Route</span></td>
                  <td>→</td>
                </tr>
                <tr>
                  <td><div className="customer-pip" style={{ background: 'var(--green)', color: '#000' }}>SJ</div>Sarah Jenkins<br /><small style={{ color: '#64748b' }}>VN-2199</small></td>
                  <td style={{ fontSize: '1.2rem' }} title="Van">🚐</td>
                  <td>Atlanta, GA</td>
                  <td><span className="tag success">Loading</span></td>
                  <td>→</td>
                </tr>
                <tr>
                  <td><div className="customer-pip" style={{ background: '#f59e0b', color: '#fff' }}>MR</div>Michael Ross<br /><small style={{ color: '#64748b' }}>BK-0883</small></td>
                  <td style={{ fontSize: '1.2rem' }} title="Motorbike">🏍️</td>
                  <td>Dallas, TX</td>
                  <td><span className="tag warning" style={{ background: '#fef3c7', color: '#b45309' }}>Maintenance</span></td>
                  <td>→</td>
                </tr>
                <tr>
                  <td><div className="customer-pip" style={{ background: 'var(--green)', color: '#000' }}>AL</div>Amanda Lee<br /><small style={{ color: '#64748b' }}>VN-3321</small></td>
                  <td style={{ fontSize: '1.2rem' }} title="Van">🚐</td>
                  <td>Accra, GH</td>
                  <td><span className="tag success">Available</span></td>
                  <td>→</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="map-mini-card">
            <div className="map-caption" style={{ marginBottom: '12px' }}>Live Heatmap</div>
            <div className="map-mini-surface" style={{ minHeight: '320px', borderRadius: '12px', border: '1px solid var(--border)' }} />
            <div className="stats-lower">
              <div><span>Highest Density</span><strong>Midwest Hub</strong></div>
              <div><span>Active Units</span><strong>412</strong></div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
