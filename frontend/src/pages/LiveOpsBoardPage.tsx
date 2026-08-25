import { useState } from 'react';
import { Link } from 'react-router-dom';
import OrderPrintModal from '../components/OrderPrintModal';

export default function LiveOpsBoardPage() {
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  return (
    <div className="page-shell light-shell">
      
      <main className="container dashboard-screen">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1>Operations Board</h1>
            <p className="muted-text">Live overview of riders, active orders, and delivery progress.</p>
          </div>
          <button 
            className="primary-green" 
            style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '8px' }}
            onClick={() => setIsPrintModalOpen(true)}
          >
            🖨️ Print Label / Receipt
          </button>
        </div>

        <div className="summary-row-cards" style={{ marginTop: '24px' }}>
          <div className="stat-card">
            <div className="stat-head">Active Orders</div>
            <div className="stat-big">342</div>
          </div>
          <div className="stat-card">
            <div className="stat-head">Available Riders</div>
            <div className="stat-big">84</div>
          </div>
          <div className="stat-card dark-card">
            <div className="stat-head">On-Time %</div>
            <div className="stat-big">96.8% <span>+1.2%</span></div>
          </div>
        </div>

        <div className="dashboard-grid">
          <div className="map-card">
            <div className="map-header-row">
              <span>Live Orders Map</span>
              <div className="map-actions">
                <div className="mini-search">Filter by zone...</div>
              </div>
            </div>
            <div className="map-surface" style={{ position: 'relative' }}>
              <div className="map-routes" />
              {/* Map Pins representing orders */}
              <div className="map-pin start" style={{ top: '30%', left: '40%' }}></div>
              <div className="map-pin end" style={{ top: '50%', left: '60%' }}></div>
              <div className="map-pin end" style={{ top: '20%', left: '70%', background: 'var(--amber)' }}></div>
              
              <div style={{ position: 'absolute', bottom: '16px', right: '16px', background: 'rgba(255,255,255,0.9)', padding: '8px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                📍 Live tracking active
              </div>
            </div>
          </div>

          <aside className="shipment-list-card">
            <div className="shipment-header">
              <h3>Active Orders</h3>
              <span className="pill-soft">4 Total</span>
            </div>

            <div className="shipment-item">
              <div className="shipment-main">
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div className="tag-green">ORD-8924</div>
                  <span title="Motorbike">🏍️</span>
                </div>
                <div className="subline">Pharmacy pickup</div>
                <div className="small-meta">ETA: Today, 14:30</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                <span className="status-green">In Transit</span>
                <button onClick={() => setIsPrintModalOpen(true)} style={{ background: 'none', border: '1px solid var(--border)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer' }}>Print</button>
              </div>
            </div>

            <div className="shipment-item">
              <div className="shipment-main">
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div className="tag-green">ORD-9011</div>
                  <span title="Van">🚐</span>
                </div>
                <div className="subline">Electronics delivery</div>
                <div className="small-meta">ETA: Today, 11:15</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                <span className="status-green">Out for Delivery</span>
                <button onClick={() => setIsPrintModalOpen(true)} style={{ background: 'none', border: '1px solid var(--border)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer' }}>Print</button>
              </div>
            </div>

            <div className="shipment-item">
              <div className="shipment-main">
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div className="tag-green">ORD-7742</div>
                  <span title="Motorbike">🏍️</span>
                </div>
                <div className="subline">Restaurant drop-off</div>
                <div className="small-meta">Delivered: Yesterday</div>
              </div>
              <span className="status-green">Delivered</span>
            </div>

            <div className="shipment-item">
              <div className="shipment-main">
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div className="tag-green">ORD-4321</div>
                  <span title="Van">🚐</span>
                </div>
                <div className="subline">Retail replenishment</div>
                <div className="small-meta" style={{ color: 'var(--danger)' }}>Action Required</div>
              </div>
              <span className="status-red">Delayed</span>
            </div>

            <Link to="/ops/tracking/ORD-8924" className="neutral-btn wide-btn" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>View Tracking Dashboard</Link>
          </aside>
        </div>
        
        {isPrintModalOpen && <OrderPrintModal onClose={() => setIsPrintModalOpen(false)} />}
      </main>

    </div>
  );
}
