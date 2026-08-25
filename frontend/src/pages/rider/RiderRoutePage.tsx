import { useState } from 'react';

interface RouteStop {
  id: string;
  address: string;
  details: string;
  parcels: number;
  status: 'pending' | 'active' | 'completed' | 'failed';
}

const initialStops: RouteStop[] = [
  { id: '9', address: '1400 1st Ave', details: 'Suite 200, Building B', parcels: 3, status: 'active' },
  { id: '10', address: '801 2nd Ave', details: 'Front desk drop-off', parcels: 1, status: 'pending' },
  { id: '11', address: '1001 4th Ave', details: 'Loading dock access', parcels: 5, status: 'pending' },
];

export default function RiderRoutePage() {
  const [stops, setStops] = useState<RouteStop[]>(initialStops);
  
  const completedBase = 8;
  const completedCount = completedBase + stops.filter(s => s.status === 'completed').length;
  const totalStops = completedBase + stops.length;
  
  const activeStop = stops.find(s => s.status === 'active');

  const handleUpdateStatus = (id: string, newStatus: 'completed' | 'failed') => {
    setStops(prev => {
      const updated = [...prev];
      const idx = updated.findIndex(s => s.id === id);
      if (idx !== -1) {
        updated[idx].status = newStatus;
        // Make the next pending stop active
        const nextIdx = updated.findIndex((s, i) => i > idx && s.status === 'pending');
        if (nextIdx !== -1) {
          updated[nextIdx].status = 'active';
        }
      }
      return updated;
    });
  };

  return (
    <div className="page-shell route-shell" style={{ display: 'flex', justifyContent: 'center', padding: '24px 16px', background: '#f8fafc' }}>
      <div className="route-card card-style" style={{ width: 'min(480px, 100%)', margin: '0 auto', border: '1px solid #e2e8f0', background: '#fff', padding: '20px', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
        
        <div className="route-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
          <div className="route-brand-row" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="green-icon" style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#078c35', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
              🏍️
            </div>
            <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#0f172a' }}>Today's Route</h2>
          </div>
          <button className="neutral-btn small bell-btn" style={{ padding: '8px', borderRadius: '50%' }}>🔔</button>
        </div>

        <div className="route-main-card" style={{ marginTop: '20px' }}>
          <div className="route-title-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span className="route-label" style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, letterSpacing: '0.05em' }}>CURRENT ROUTE</span>
            <span className="progress-pill" style={{ background: '#dcfce7', color: '#166534', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>
              {completedCount === totalStops ? 'Completed' : 'In Progress'}
            </span>
          </div>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1.8rem', color: '#0f172a' }}>Route 42A - Downtown</h3>
          
          <div className="route-metrics" style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ textAlign: 'center' }}>
              <span style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '4px' }}>Total Stops</span>
              <strong style={{ fontSize: '1.2rem', color: '#0f172a' }}>{totalStops}</strong>
            </div>
            <div style={{ textAlign: 'center' }}>
              <span style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '4px' }}>Completed</span>
              <strong style={{ fontSize: '1.2rem', color: '#166534' }}>{completedCount}</strong>
            </div>
            <div style={{ textAlign: 'center' }}>
              <span style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '4px' }}>Est. Time</span>
              <strong style={{ fontSize: '1.2rem', color: '#0f172a' }}>{completedCount === totalStops ? '0m' : '4h 15m'}</strong>
            </div>
          </div>
        </div>

        {activeStop && (
          <div className="next-stop-row" style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '24px', padding: '16px', background: '#fff', border: '2px solid #078c35', borderRadius: '12px', boxShadow: '0 4px 12px rgba(7, 140, 53, 0.15)' }}>
            <div style={{ flex: 1 }}>
              <div className="next-label" style={{ color: '#166534', fontSize: '0.8rem', fontWeight: 800, marginBottom: '4px', letterSpacing: '0.05em' }}>NEXT STOP</div>
              <div className="next-address" style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>{activeStop.address}</div>
            </div>
            <div className="next-button" style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#078c35', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
              ➜
            </div>
          </div>
        )}

        <div className="stops-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '32px', marginBottom: '16px' }}>
          <h4 style={{ margin: 0, fontSize: '1.2rem', color: '#0f172a' }}>Stops</h4>
          <span style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 600 }}>{totalStops - completedCount} remaining</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {stops.map(stop => (
            <div 
              key={stop.id} 
              className={`stop-item ${stop.status === 'active' ? 'active-stop' : ''}`} 
              style={{ 
                display: 'flex', 
                gap: '16px', 
                padding: '16px', 
                background: stop.status === 'completed' ? '#f0fdf4' : (stop.status === 'active' ? '#f8fafc' : '#ffffff'),
                borderRadius: '8px', 
                border: '1px solid',
                borderColor: stop.status === 'completed' ? '#bbf7d0' : (stop.status === 'active' ? '#078c35' : '#e2e8f0'),
                borderLeftWidth: stop.status === 'active' ? '4px' : '1px'
              }}
            >
              <div className="stop-number" style={{ 
                width: '32px', height: '32px', borderRadius: '50%', 
                background: stop.status === 'completed' ? '#166534' : (stop.status === 'active' ? '#078c35' : '#e2e8f0'), 
                color: stop.status === 'completed' || stop.status === 'active' ? '#fff' : '#64748b', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' 
              }}>
                {stop.status === 'completed' ? '✓' : stop.id}
              </div>
              
              <div className="stop-copy" style={{ flex: 1, opacity: stop.status === 'completed' ? 0.6 : 1 }}>
                <div className="stop-address" style={{ fontWeight: 700, color: '#0f172a', textDecoration: stop.status === 'completed' ? 'line-through' : 'none' }}>
                  {stop.address}
                </div>
                <div className="stop-detail" style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '4px' }}>{stop.details}</div>
                <div className="sub-detail" style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '4px', fontWeight: 600 }}>
                  📦 {stop.parcels} Parcel{stop.parcels > 1 ? 's' : ''}
                </div>
              </div>
              
              {stop.status === 'active' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'center' }}>
                  <button 
                    onClick={() => handleUpdateStatus(stop.id, 'completed')}
                    style={{ background: '#078c35', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}
                  >
                    Delivered
                  </button>
                  <button 
                    onClick={() => handleUpdateStatus(stop.id, 'failed')}
                    style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', padding: '8px 16px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}
                  >
                    Failed
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
