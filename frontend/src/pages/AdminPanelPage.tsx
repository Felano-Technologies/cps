export default function AdminPanelPage() {
  return (
    <div className="page-shell light-shell">
      <main className="container" style={{ paddingTop: '34px' }}>
        <div className="section-head-row">
          <div>
            <h2>Admin Panel</h2>
            <p>System configuration and user management.</p>
          </div>
        </div>

        <div className="summary-row-cards">
          <div className="stat-card">
            <div className="stat-head">Total Users</div>
            <div className="stat-big">1,492</div>
          </div>
          <div className="stat-card">
            <div className="stat-head">Active Integrations</div>
            <div className="stat-big">8</div>
          </div>
          <div className="stat-card dark-card">
            <div className="stat-head">System Status</div>
            <div className="stat-big">All Systems Normal</div>
          </div>
        </div>

        <div className="table-panel" style={{ marginTop: '24px' }}>
          <div className="table-header-row" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <h3>Recent System Activity</h3>
          </div>
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>User</th>
                <th>Action</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>10:42 AM</td>
                <td>admin@cps.com</td>
                <td>Updated zone boundaries</td>
                <td><span className="tag success">Success</span></td>
              </tr>
              <tr>
                <td>09:15 AM</td>
                <td>system</td>
                <td>Daily backup completed</td>
                <td><span className="tag success">Success</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
