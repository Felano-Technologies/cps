import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/MyShipmentsPage.css';

interface Shipment {
  id: string;
  destination: string;
  service: string;
  status: 'In Transit' | 'Delivered' | 'Delayed' | 'Pending';
  time: string;
}

const mockShipments: Shipment[] = [
  { id: 'JOB-9021', destination: '124 Spintex Road, Accra', service: 'Motorbike Express', status: 'In Transit', time: 'Today, 14:30' },
  { id: 'JOB-8820', destination: 'Tech Hub, KNUST Campus', service: 'Van Delivery', status: 'Delivered', time: 'Yesterday, 16:45' },
  { id: 'JOB-9104', destination: 'Adum, Kumasi', service: 'Motorbike Courier', status: 'Delayed', time: 'Traffic delay' },
  { id: 'JOB-9112', destination: 'East Legon, Accra', service: 'Same Day Delivery', status: 'Pending', time: 'Awaiting Pickup' },
  { id: 'JOB-8700', destination: 'Airport Residential', service: 'Express Courier', status: 'Delivered', time: 'Aug 21, 10:00' },
  { id: 'JOB-9055', destination: 'Osu Oxford Street', service: 'Van Delivery', status: 'In Transit', time: 'Today, 18:00' },
];

export default function MyShipmentsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>('All Shipments');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredShipments = useMemo(() => {
    return mockShipments.filter(shipment => {
      const matchesTab = activeTab === 'All Shipments' || shipment.status === activeTab;
      const matchesSearch = 
        shipment.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        shipment.destination.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [activeTab, searchQuery]);

  return (
    <div className="page-shell light-shell">
      <main className="container page-content">
        <div className="page-header" style={{ marginBottom: '40px' }}>
          <h1 style={{ fontSize: '36px', fontWeight: 800, color: '#0f172a', marginBottom: '12px', letterSpacing: '-0.02em' }}>My Shipments</h1>
          <p style={{ color: '#64748b', fontSize: '16px', fontWeight: 500, margin: 0 }}>Track and manage your requested pickups and deliveries.</p>
        </div>

        <div className="card-style" style={{ padding: '0', overflow: 'hidden' }}>
          <div className="shipment-controls">
            <div className="shipment-tabs">
              {['All Shipments', 'In Transit', 'Delivered', 'Delayed'].map(tab => (
                <button 
                  key={tab}
                  className={`shipment-tab ${activeTab === tab ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>
            
            <div className="shipment-search">
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="#94a3b8" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }}>
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input 
                type="text" 
                placeholder="Search by Job ID or Destination..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <table className="responsive-table shipments-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0' }}>
            <thead>
              <tr style={{ textAlign: 'left', background: '#f8fafc' }}>
                <th style={{ padding: '20px 24px', fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Job ID</th>
                <th style={{ padding: '20px 24px', fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Destination</th>
                <th style={{ padding: '20px 24px', fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Service</th>
                <th style={{ padding: '20px 24px', fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                <th style={{ padding: '20px 24px', fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ETA / Time</th>
                <th style={{ padding: '20px 24px', fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredShipments.length > 0 ? (
                filteredShipments.map((shipment) => (
                  <tr key={shipment.id} className="shipment-row">
                    <td data-label="Job ID" style={{ padding: '20px 24px', fontWeight: 700, color: '#0f172a', borderBottom: '1px solid #f1f5f9' }}>{shipment.id}</td>
                    <td data-label="Destination" style={{ padding: '20px 24px', color: '#475569', borderBottom: '1px solid #f1f5f9', fontSize: '15px', fontWeight: 500 }}>{shipment.destination}</td>
                    <td data-label="Service" style={{ padding: '20px 24px', color: '#64748b', borderBottom: '1px solid #f1f5f9', fontSize: '14px' }}>{shipment.service}</td>
                    <td data-label="Status" style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9' }}>
                      <span className={`status-badge badge-${shipment.status.toLowerCase().replace(' ', '-')}`}>
                        {shipment.status}
                      </span>
                    </td>
                    <td data-label="ETA / Time" style={{ padding: '20px 24px', color: '#475569', borderBottom: '1px solid #f1f5f9', fontSize: '14px', fontWeight: 500 }}>{shipment.time}</td>
                    <td data-label="Action" style={{ padding: '20px 24px', textAlign: 'center', borderBottom: '1px solid #f1f5f9' }}>
                      <button 
                        onClick={() => navigate(`/tracking/${shipment.id}`)}
                        style={{ padding: '8px 16px', fontSize: '13px', backgroundColor: '#e0f3cb', color: '#078c35', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', transition: 'background-color 0.2s' }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#ccebb1'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#e0f3cb'}
                      >
                        Track
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ padding: '60px 20px', textAlign: 'center' }}>
                    <div style={{ color: '#94a3b8', fontSize: '16px', fontWeight: 500 }}>No shipments found.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
