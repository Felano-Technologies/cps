import { Routes, Route, NavLink, Navigate } from 'react-router-dom';

function BillingView() {
  return (
    <>
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

        <div className="view-invoices" style={{ marginTop: '16px', color: '#666', cursor: 'pointer' }}>View All Invoices</div>
      </div>
    </>
  );
}

function AccountView() {
  return (
    <div className="card-style">
      <h3>Account Details</h3>
      <p style={{ marginTop: '12px' }}>This is a placeholder for managing user profile, password, and preferences.</p>
    </div>
  );
}

function NotificationsView() {
  return (
    <div className="card-style">
      <h3>Notifications</h3>
      <p style={{ marginTop: '12px' }}>This is a placeholder for configuring email and SMS notification preferences.</p>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div className="page-shell light-shell">
      <main className="container billing-screen">
        <div className="billing-header-row" style={{ marginBottom: '24px' }}>
          <div>
            <h2>Settings</h2>
            <p>Manage your account, billing, and preferences.</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start' }} className="settings-layout">
          {/* Sidebar Navigation */}
          <aside style={{ width: '240px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <NavLink 
              to="/settings/billing" 
              className={({ isActive }) => `neutral-btn ${isActive ? 'active-menu' : ''}`} 
              style={{ textAlign: 'left', border: 'none', background: 'transparent' }}
            >
              Billing &amp; Invoices
            </NavLink>
            <NavLink 
              to="/settings/account" 
              className={({ isActive }) => `neutral-btn ${isActive ? 'active-menu' : ''}`} 
              style={{ textAlign: 'left', border: 'none', background: 'transparent' }}
            >
              Account Details
            </NavLink>
            <NavLink 
              to="/settings/notifications" 
              className={({ isActive }) => `neutral-btn ${isActive ? 'active-menu' : ''}`} 
              style={{ textAlign: 'left', border: 'none', background: 'transparent' }}
            >
              Notifications
            </NavLink>
          </aside>

          {/* Main Content Area */}
          <div style={{ flex: 1 }}>
            <Routes>
              <Route path="/" element={<Navigate to="billing" replace />} />
              <Route path="billing" element={<BillingView />} />
              <Route path="account" element={<AccountView />} />
              <Route path="notifications" element={<NotificationsView />} />
            </Routes>
          </div>
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
        <span>© 2026 CPS Delivery Services Infrastructure. All rights reserved.</span>
      </footer>
    </div>
  );
}
