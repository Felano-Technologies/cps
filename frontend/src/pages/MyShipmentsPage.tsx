import { useNavigate } from 'react-router-dom';
import '../styles/MyShipmentsPage.css';

export default function MyshipmentsPage() {
  const navigate = useNavigate();

  return (
    <div className="page-shell light-shell">
      <main className="page-container">
        <div className="page-header">
          <h1>My Shipments</h1>
          <p className="page-subtitle">Track and manage your requested pickups and deliveries.</p>
        </div>

        <div className="search-filter-section">
          <div className="search-box">
            <input className="search-input" placeholder="Search by Job ID or Destination..." />
          </div>
          <div className="filter-buttons">
            <button className="filter-btn active">All Shipments</button>
            <button className="filter-btn">In Transit</button>
            <button className="filter-btn">Delivered</button>
            <button className="filter-btn">Delayed</button>
          </div>
        </div>

        <div className="shipments-container">
          <div className="shipments-list">
            {/* Active Shipment */}
            <div className="shipment-card status-active" onClick={() => navigate('/tracking/JOB-9021')}>
              <div className="card-header">
                <div className="shipment-info">
                  <h3 className="job-id">JOB-9021</h3>
                  <p className="destination">124 Spintex Road, Accra</p>
                </div>
                <div className="status-badge">
                  <span className="badge status-active">In Transit</span>
                </div>
              </div>
              <div className="card-body">
                <div className="detail-row">
                  <span className="detail-label">Service</span>
                  <span className="detail-value">Motorbike Express</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">ETA</span>
                  <span className="detail-value" style={{ color: '#22863a' }}>Today, 14:30</span>
                </div>
              </div>
              <div className="card-footer">
                <button className="btn-track">
                  Track Parcel <span className="arrow">→</span>
                </button>
              </div>
            </div>

            {/* Delivered Shipment */}
            <div className="shipment-card status-delivered" onClick={() => navigate('/tracking/JOB-8820')}>
              <div className="card-header">
                <div className="shipment-info">
                  <h3 className="job-id">JOB-8820</h3>
                  <p className="destination">Tech Hub, KNUST Campus</p>
                </div>
                <div className="status-badge">
                  <span className="badge status-delivered">Delivered</span>
                </div>
              </div>
              <div className="card-body">
                <div className="detail-row">
                  <span className="detail-label">Service</span>
                  <span className="detail-value">Van Delivery</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Delivered At</span>
                  <span className="detail-value">Yesterday, 16:45</span>
                </div>
              </div>
              <div className="card-footer">
                <button className="btn-track">
                  View Details <span className="arrow">→</span>
                </button>
              </div>
            </div>

            {/* Delayed Shipment */}
            <div className="shipment-card status-delayed" onClick={() => navigate('/tracking/JOB-9104')}>
              <div className="card-header">
                <div className="shipment-info">
                  <h3 className="job-id">JOB-9104</h3>
                  <p className="destination">Adum, Kumasi</p>
                </div>
                <div className="status-badge">
                  <span className="badge status-delayed">Delayed</span>
                </div>
              </div>
              <div className="card-body">
                <div className="detail-row">
                  <span className="detail-label">Service</span>
                  <span className="detail-value">Motorbike Courier</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Status</span>
                  <span className="detail-value" style={{ color: '#ef4444' }}>Traffic delay at Kejetia</span>
                </div>
              </div>
              <div className="card-footer">
                <button className="btn-track">
                  Track Parcel <span className="arrow">→</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
