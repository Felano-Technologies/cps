import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import OrderPrintModal from '../components/OrderPrintModal';

interface TrackingEvent {
  title: string;
  desc: string;
  location?: string;
  time: string;
  completed: boolean;
  active?: boolean;
}

interface TrackingData {
  id: string;
  status: string;
  origin: string;
  destination: string;
  destinationFull: string;
  itemType: string;
  priority: string;
  rider: string;
  signature: boolean;
  history: TrackingEvent[];
}

const mockDb: Record<string, TrackingData> = {
  'default': {
    id: 'CPS-9982-441-A',
    status: 'In Transit',
    origin: 'Accra North Hub',
    destination: 'Tech Campus HQ',
    destinationFull: 'KNUST, Kumasi, GH',
    itemType: 'Small Parcel',
    priority: 'Express',
    rider: 'Kwame D.',
    signature: true,
    history: [
      { title: 'Rider En Route', desc: 'Parcel is with the rider. Expected within the hour.', location: 'Kumasi, KNUST', time: '10:45 AM', completed: false, active: true },
      { title: 'Collected From Pickup', desc: 'Collected and checked in by rider.', location: 'Kumasi, KNUST', time: '10:15 AM', completed: true },
      { title: 'Left Dispatch Point', desc: 'Rider left the hub and entered service area.', location: 'Accra, North Kaneshie', time: '08:30 AM', completed: true },
      { title: 'Order Created', desc: 'System generated', time: '07:00 AM', completed: true },
    ]
  }
};

export default function OpsTrackingPage() {
  const { parcelId } = useParams();
  const [data, setData] = useState<TrackingData | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  useEffect(() => {
    // Simulate API fetch
    const fetchId = parcelId || 'default';
    setData(mockDb[fetchId] || mockDb['default']);
  }, [parcelId]);

  const handleStatusChange = (newStatus: string) => {
    if (!data) return;
    
    const newEvent: TrackingEvent = {
      title: `Status Updated: ${newStatus}`,
      desc: `Operations marked this package as ${newStatus}.`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      completed: false,
      active: true
    };

    const updatedHistory = data.history.map(evt => 
      evt.active ? { ...evt, active: false, completed: true } : evt
    );

    setData({
      ...data,
      status: newStatus,
      history: [newEvent, ...updatedHistory]
    });
  };

  const handleAssignRider = (newRider: string) => {
    if (!data) return;
    
    const newEvent: TrackingEvent = {
      title: `Rider Assigned: ${newRider}`,
      desc: `Operations re-routed package to ${newRider}.`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      completed: false,
      active: true
    };

    const updatedHistory = data.history.map(evt => 
      evt.active ? { ...evt, active: false, completed: true } : evt
    );

    setData({
      ...data,
      rider: newRider,
      history: [newEvent, ...updatedHistory]
    });
  };

  if (!data) return <div className="page-shell light-shell"><main className="container" style={{ padding: '48px' }}>Loading tracking data...</main></div>;

  return (
    <div className="page-shell light-shell">
      <style>{`
        .glass-card {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.8);
          box-shadow: 0 8px 32px rgba(15, 23, 42, 0.05);
          border-radius: 16px;
        }
        
        .animated-map {
          background: #0f172a;
          border-radius: 16px;
          position: relative;
          overflow: hidden;
          box-shadow: inset 0 0 60px rgba(0,0,0,0.5), 0 10px 30px rgba(15, 23, 42, 0.2);
        }

        .map-grid-bg {
          position: absolute;
          inset: 0;
          background-image: 
            linear-gradient(rgba(131, 211, 20, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(131, 211, 20, 0.1) 1px, transparent 1px);
          background-size: 30px 30px;
          opacity: 0.4;
        }

        .route-line {
          position: absolute;
          top: 60%;
          left: 10%;
          width: 80%;
          height: 2px;
          background: rgba(255,255,255,0.2);
          transform: rotate(-15deg);
          transform-origin: left center;
        }

        .rider-node {
          position: absolute;
          top: 60%;
          left: 70%;
          width: 16px;
          height: 16px;
          background: #83d314;
          border-radius: 50%;
          transform: translate(-50%, -50%) rotate(-15deg);
          box-shadow: 0 0 20px #83d314;
        }

        .rider-pulse {
          position: absolute;
          inset: -10px;
          border-radius: 50%;
          border: 2px solid #83d314;
          animation: mapPulse 2s infinite ease-out;
        }

        @keyframes mapPulse {
          0% { transform: scale(0.5); opacity: 1; }
          100% { transform: scale(2.5); opacity: 0; }
        }

        .tracking-main-grid {
          display: grid;
          grid-template-columns: 1fr 400px;
          gap: 24px;
          align-items: start;
        }

        .details-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr));
          gap: 24px;
        }
        
        .header-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        /* Timeline styles */
        .timeline-container {
          position: relative;
          padding-left: 32px;
        }
        .timeline-line {
          position: absolute;
          left: 11px;
          top: 8px;
          bottom: 0;
          width: 2px;
          background: #e2e8f0;
          z-index: 0;
        }
        .timeline-item {
          position: relative;
          z-index: 1;
          margin-bottom: 32px;
        }
        .timeline-item:last-child {
          margin-bottom: 0;
        }
        .timeline-dot {
          position: absolute;
          left: -32px;
          top: 4px;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #fff;
          border: 2px solid #cbd5e1;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .timeline-dot.completed {
          background: #078c35;
          border-color: #078c35;
          color: #fff;
        }
        .timeline-dot.active {
          background: #fff;
          border: 3px solid #078c35;
          box-shadow: 0 0 0 4px rgba(7, 140, 53, 0.2);
        }
        .timeline-dot.active::after {
          content: '';
          width: 8px;
          height: 8px;
          background: #078c35;
          border-radius: 50%;
        }

        @media (max-width: 1024px) {
          .tracking-main-grid {
            grid-template-columns: 1fr;
          }
          .animated-map {
            height: 350px !important;
          }
        }
        @media (max-width: 768px) {
          .tracking-page-content {
            padding: 16px !important;
          }
          .header-actions {
            flex-direction: column;
            width: 100%;
          }
          .header-actions > * {
            width: 100%;
          }
        }
      `}</style>

      <main className="container tracking-page-content" style={{ padding: '32px 24px', maxWidth: '1400px', marginBottom: '80px' }}>
        
        {/* Breadcrumb */}
        <div style={{ marginBottom: '24px', fontSize: '14px', fontWeight: 500 }}>
          <Link to="/ops-board" style={{ color: '#64748b', textDecoration: 'none', transition: 'color 0.2s' }}>Operations Board</Link>
          <span style={{ margin: '0 12px', color: '#cbd5e1' }}>/</span>
          <span style={{ color: '#0f172a', fontWeight: 700 }}>Parcel Tracking</span>
        </div>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', marginBottom: '8px', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '12px' }}>
              Tracking Details
              <span style={{ fontSize: '14px', background: '#dcfce7', color: '#166534', padding: '6px 12px', borderRadius: '20px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                {data.status}
              </span>
            </h1>
            <div style={{ fontSize: '16px', color: '#64748b', fontFamily: 'monospace', fontWeight: 600, background: '#f1f5f9', display: 'inline-block', padding: '4px 12px', borderRadius: '8px' }}>
              ID: {data.id}
            </div>
          </div>
          
          <div className="header-actions">
            <select 
              value="" 
              onChange={(e) => { if(e.target.value) handleAssignRider(e.target.value) }}
              className="neutral-btn" 
              style={{ padding: '10px 20px', borderRadius: '10px', fontWeight: 600, border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer', appearance: 'none', color: '#0f172a' }}
            >
              <option value="" disabled>👤 Assign Rider...</option>
              <option value="Kwame D.">Kwame D.</option>
              <option value="Samuel O.">Samuel O.</option>
              <option value="Isaac A.">Isaac A.</option>
              <option value="Michael T.">Michael T.</option>
            </select>

            <select 
              value="" 
              onChange={(e) => { if(e.target.value) handleStatusChange(e.target.value) }}
              className="neutral-btn" 
              style={{ padding: '10px 20px', borderRadius: '10px', fontWeight: 600, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', appearance: 'none' }}
            >
              <option value="" disabled>Update Status...</option>
              <option value="In Transit">In Transit</option>
              <option value="Out for Delivery">Out for Delivery</option>
              <option value="Delivered">Delivered</option>
              <option value="Delayed">Delayed</option>
              <option value="Exception">Exception</option>
            </select>

            <button className="neutral-btn" style={{ padding: '10px 20px', borderRadius: '10px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
              Share Link
            </button>
            <button 
              className="primary-green" 
              style={{ padding: '10px 20px', borderRadius: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}
              onClick={() => setIsPrintModalOpen(true)}
            >
              🖨️ Print Label
            </button>
          </div>
        </div>

        {/* Main Grid: Map + Timeline */}
        <div className="tracking-main-grid" style={{ marginBottom: '24px' }}>
          
          {/* Animated Map */}
          <div className="animated-map" style={{ height: '600px', width: '100%' }}>
            <div className="map-grid-bg" />
            
            {/* Route visuals */}
            <div className="route-line" />
            <div style={{ position: 'absolute', top: '60%', left: '10%', transform: 'translate(-50%, -50%)', width: '12px', height: '12px', background: '#fff', borderRadius: '50%' }} />
            <div style={{ position: 'absolute', top: '60%', left: '90%', transform: 'translate(-50%, -50%) rotate(-15deg)', width: '12px', height: '12px', background: '#fff', borderRadius: '50%' }} />
            
            <div className="rider-node">
              <div className="rider-pulse" />
            </div>

            <div style={{ position: 'absolute', top: '24px', left: '24px', background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)', padding: '12px 20px', borderRadius: '12px', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <div style={{ width: '8px', height: '8px', background: '#83d314', borderRadius: '50%', boxShadow: '0 0 10px #83d314' }} />
                <span style={{ fontWeight: 600, fontSize: '15px' }}>Live Route Tracking</span>
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>{data.origin} → {data.destination}</div>
            </div>
          </div>

          {/* Vertical Timeline */}
          <div className="glass-card" style={{ padding: '32px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginBottom: '32px' }}>Tracking History</h3>
            
            <div className="timeline-container">
              <div className="timeline-line" />
              
              {data.history.map((evt, idx) => (
                <div key={idx} className="timeline-item">
                  <div className={`timeline-dot ${evt.completed ? 'completed' : ''} ${evt.active ? 'active' : ''}`}>
                    {evt.completed && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
                      <strong style={{ fontSize: '16px', color: evt.active ? '#0f172a' : '#334155' }}>{evt.title}</strong>
                      <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 600 }}>{evt.time}</span>
                    </div>
                    <div style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.5, marginBottom: '8px' }}>{evt.desc}</div>
                    {evt.location && (
                      <div style={{ display: 'inline-block', fontSize: '12px', background: '#f1f5f9', color: '#475569', padding: '4px 10px', borderRadius: '6px', fontWeight: 600 }}>
                        📍 {evt.location}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Details Row */}
        <div className="details-grid">
          
          <div className="glass-card" style={{ padding: '32px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>🗺️</span> Route Details
            </h3>
            
            <div style={{ position: 'relative', paddingLeft: '24px' }}>
              <div style={{ position: 'absolute', left: '5px', top: '6px', bottom: '6px', width: '2px', background: '#e2e8f0', zIndex: 0 }} />
              
              <div style={{ position: 'relative', zIndex: 1, marginBottom: '24px' }}>
                <div style={{ position: 'absolute', left: '-24px', top: '4px', width: '12px', height: '12px', background: '#0f172a', borderRadius: '50%' }} />
                <div style={{ fontSize: '13px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Origin</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>{data.origin}</div>
              </div>
              
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ position: 'absolute', left: '-24px', top: '4px', width: '12px', height: '12px', background: '#078c35', borderRadius: '50%', boxShadow: '0 0 0 3px #dcfce7' }} />
                <div style={{ fontSize: '13px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Destination</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>{data.destination}</div>
                <div style={{ fontSize: '14px', color: '#64748b', marginTop: '2px' }}>{data.destinationFull}</div>
              </div>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '32px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>📦</span> Delivery Specs
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#64748b', fontWeight: 500 }}>Package Type</span>
                <strong style={{ color: '#0f172a' }}>{data.itemType}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#64748b', fontWeight: 500 }}>Service Priority</span>
                <strong style={{ color: '#0f172a' }}>{data.priority}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#64748b', fontWeight: 500 }}>Assigned Rider</span>
                <strong style={{ color: '#0f172a' }}>{data.rider}</strong>
              </div>
              
              {data.signature && (
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginTop: '8px', padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ width: '40px', height: '40px', background: '#dcfce7', color: '#166534', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <div>
                    <strong style={{ display: 'block', color: '#0f172a', fontSize: '15px' }}>Signature Required</strong>
                    <div style={{ color: '#64748b', fontSize: '13px', marginTop: '2px' }}>ID verification at drop-off</div>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </main>

      {isPrintModalOpen && <OrderPrintModal onClose={() => setIsPrintModalOpen(false)} />}
    </div>
  );
}
