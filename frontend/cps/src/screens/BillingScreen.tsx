import cpsLogo from '../assets/cps-logo.png';

export default function BillingScreen() {
  return (
    <div className="page-shell light-shell">
      <header className="topbar">
        <div className="brand-title"><img src={cpsLogo} alt="CPS Delivery Services" className="brand-logo" /></div>
        <nav className="nav-links">
          <span>Dashboard</span>
          <span>Shipments</span>
          <span>Fleet</span>
          <span className="active">Billing</span>
          <span>Profile</span>
        </nav>
        <button className="primary-green small">+ Make Payment</button>
      </header>

      <main className="container billing-screen">
        <div className="billing-header-row">
          <div>
            <h2>Billing &amp; Invoicing</h2>
            <p>Manage your payment methods and view past invoices.</p>
          </div>
        </div>

        <div className="billing-grid">
          <div className="payment-summary card-style">
            <div className="label-row">
              <span>CURRENT BALANCE</span>
              <span className="mini-icon-box">◫</span>
            </div>
            <div className="balance-amount">$3,450.00</div>
            <div className="date-line">Due in 3 days</div>
            <button className="dark-btn wide-action">Pay Balance</button>
          </div>

          <div className="payment-methods card-style">
            <div className="section-heading-row">
              <h3>Payment Methods</h3>
              <button className="neutral-btn small">Add New</button>
            </div>

              <div className="payment-method active-option">
                <div className="payment-icon">◫</div>
                <div className="payment-meta">
                  <strong>Corporate Visa</strong>
                  <small>•••• •••• •••• 4242</small>
                  <span>Expires 12/25</span>
                </div>
                <span className="default-tag">DEFAULT</span>
              </div>

              <div className="payment-method">
                <div className="payment-icon">▣</div>
                <div className="payment-meta">
                  <strong>Chase Checking</strong>
                  <small>Acct ending in 8901</small>
                </div>
                <button className="mini-action">⋮</button>
              </div>
            </div>
          </div>

        <div className="invoice-panel card-style">
          <div className="section-heading-row">
            <h3>Recent Invoices</h3>
            <div className="inline-buttons">
              <button className="neutral-btn small">Filter</button>
              <button className="neutral-btn small">Export All</button>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Invoice ID</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>INV-2023-1042</td>
                <td>Oct 15, 2023</td>
                <td>$1,250.00</td>
                <td><span className="tag success">Paid</span></td>
                <td>⇩</td>
              </tr>
              <tr>
                <td>INV-2023-1041</td>
                <td>Sep 15, 2023</td>
                <td>$3,450.00</td>
                <td><span className="tag danger">Unpaid</span></td>
                <td>⇩</td>
              </tr>
              <tr>
                <td>INV-2023-1040</td>
                <td>Aug 15, 2023</td>
                <td>$2,100.00</td>
                <td><span className="tag success">Paid</span></td>
                <td>⇩</td>
              </tr>
            </tbody>
          </table>

          <div className="view-invoices">View All Invoices</div>
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
