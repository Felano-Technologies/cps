export default function MyShipmentsPage() {
  return (
    <div className="page-shell light-shell">

      <main className="container orders-screen">
        <div className="section-head-row">
          <div>
            <h2>Order Management</h2>
            <p>Monitor incoming orders and assign them to the fleet.</p>
          </div>
          <div className="toolbar-actions">
            <button className="dark-btn small">Filter</button>
            <button className="primary-green small">+ Create Order</button>
          </div>
        </div>

        <div className="summary-row-cards">
          <div className="stat-card">
            <div className="stat-head">Pending Orders</div>
            <div className="stat-big">24</div>
          </div>
          <div className="stat-card">
            <div className="stat-head">Active Drivers</div>
            <div className="stat-big">18</div>
          </div>
          <div className="stat-card dark-card">
            <div className="stat-head">Efficiency Rate</div>
            <div className="stat-big">94% <span>+2%</span></div>
          </div>
        </div>

        <div className="table-panel">
          <div className="search-header">
            <span className="search-icon" />
            <input value="Search Order ID or Customer..." readOnly />
          </div>

          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Destination</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>#ORD-9021</td>
                <td><div className="customer-pip">AC</div>Acme Corp</td>
                <td>124 Industrial Pkwy, Sector 7</td>
                <td><span className="tag danger">● Unassigned</span></td>
                <td><button className="primary-green table-btn">Assign ▼</button></td>
              </tr>
              <tr>
                <td>#ORD-9020</td>
                <td><div className="customer-pip">TS</div>Tech Solutions</td>
                <td>890 Innovation Dr, Suite 400</td>
                <td><span className="tag success">● In Transit</span></td>
                <td><button className="mini-action">✎</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>

      <footer className="footer-bar black-footer">
        <div className="brand-title small-brand">CPS Delivery Services</div>
        <div className="footer-links">
          <span>Privacy Policy</span>
          <span>Terms of Service</span>
          <span>Carrier Terms</span>
          <span>Contact Support</span>
          <span>Corporate</span>
        </div>
        <span>© 2024 CPS Delivery Services Infrastructure. All rights reserved.</span>
      </footer>
    </div>
  );
}
