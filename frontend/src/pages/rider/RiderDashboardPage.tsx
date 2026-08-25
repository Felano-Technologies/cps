import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProofOfDeliveryModal from '../../components/ProofOfDeliveryModal';
import ReportIssueModal from '../../components/ReportIssueModal';

interface RouteStop {
  id: string;
  address: string;
  details: string;
  parcels: number;
  status: 'pending' | 'active' | 'completed' | 'failed';
  contact: string;
  eta: string;
}

const initialStops: RouteStop[] = [
  { id: '1', address: '1400 1st Ave', details: 'Suite 200, Building B', parcels: 3, status: 'active', contact: '024 123 4567', eta: '10:15 AM' },
  { id: '2', address: '801 2nd Ave', details: 'Front desk drop-off', parcels: 1, status: 'pending', contact: '055 987 6543', eta: '10:45 AM' },
  { id: '3', address: '1001 4th Ave', details: 'Loading dock access', parcels: 5, status: 'pending', contact: '050 111 2222', eta: '11:20 AM' },
];

export default function RiderDashboardPage() {
  const [isOnline, setIsOnline] = useState(false);
  const [stops, setStops] = useState<RouteStop[]>(initialStops);
  const [podOpen, setPodOpen] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);
  const [interactingStopId, setInteractingStopId] = useState<string | null>(null);
  
  const navigate = useNavigate();

  const handleCompleteStop = () => {
    if (!interactingStopId) return;
    setStops(prev => {
      const updated = [...prev];
      const idx = updated.findIndex(s => s.id === interactingStopId);
      updated[idx].status = 'completed';
      
      const activeIdx = updated.findIndex(s => s.status === 'active');
      if (activeIdx === -1) {
        const nextIdx = updated.findIndex(s => s.status === 'pending');
        if (nextIdx !== -1) updated[nextIdx].status = 'active';
      }
      return updated;
    });
    setPodOpen(false);
    setInteractingStopId(null);
  };

  const handleIssueSubmit = (reason: string) => {
    if (!interactingStopId) return;
    alert(`Exception logged for Order ${interactingStopId}: ${reason}`);
    
    setStops(prev => {
      const updated = [...prev];
      const idx = updated.findIndex(s => s.id === interactingStopId);
      updated[idx].status = 'failed';
      
      const activeIdx = updated.findIndex(s => s.status === 'active');
      if (activeIdx === -1) {
        const nextIdx = updated.findIndex(s => s.status === 'pending');
        if (nextIdx !== -1) updated[nextIdx].status = 'active';
      }
      return updated;
    });
    setIssueOpen(false);
    setInteractingStopId(null);
  };

  const handleSetActive = (id: string) => {
    setStops(prev => prev.map(s => ({
      ...s,
      status: s.id === id ? 'active' : (s.status === 'active' ? 'pending' : s.status)
    })));
  };

  const interactingStop = stops.find(s => s.id === interactingStopId);
  const activeStop = stops.find(s => s.status === 'active');
  const completedCount = stops.filter(s => s.status === 'completed' || s.status === 'failed').length;

  return (
    <div style={{ background: '#f4f4f5', minHeight: '100vh', paddingBottom: '20px', color: '#0f172a', fontFamily: 'Inter, system-ui, sans-serif' }}>
      
      {/* iOS Style Sticky Header */}
      <div style={{ 
        position: 'sticky', top: 0, zIndex: 50, background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(16px)',
        padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#e2e8f0', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
            <img src="https://i.pravatar.cc/150?u=a042581f4e29026704d" alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 800, letterSpacing: '-0.02em', color: '#0f172a' }}>Kwame D.</h1>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: isOnline ? '#22c55e' : '#94a3b8' }} />
              {isOnline ? 'Online' : 'Offline'}
            </div>
          </div>
        </div>
        <button style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0f172a', cursor: 'pointer' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
        </button>
      </div>

      <main style={{ padding: '20px' }}>
        
        {/* Massive Shift Toggle Card */}
        <div style={{ 
          background: isOnline ? '#ffffff' : '#f8fafc', borderRadius: '24px', padding: '24px', marginBottom: '24px',
          border: '1px solid', borderColor: isOnline ? '#e2e8f0' : '#cbd5e1',
          boxShadow: isOnline ? '0 10px 40px rgba(0,0,0,0.06)' : 'none', transition: 'all 0.3s ease'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ margin: '0 0 4px 0', fontSize: '22px', fontWeight: 800, letterSpacing: '-0.02em' }}>{isOnline ? 'You are Online' : 'You are Offline'}</h2>
              <p style={{ margin: 0, fontSize: '14px', color: '#64748b', fontWeight: 500 }}>{isOnline ? 'Receiving active dispatch signals.' : 'Toggle to start receiving jobs.'}</p>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', position: 'relative' }}>
              <input type="checkbox" checked={isOnline} onChange={() => setIsOnline(!isOnline)} style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }} />
              <div style={{ width: '64px', height: '36px', borderRadius: '18px', background: isOnline ? '#078c35' : '#cbd5e1', transition: 'background 0.3s', position: 'relative' }}>
                <div style={{ position: 'absolute', top: '2px', left: isOnline ? '30px' : '2px', width: '32px', height: '32px', background: '#fff', borderRadius: '50%', transition: 'left 0.4s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }} />
              </div>
            </label>
          </div>
        </div>

        {isOnline && (
          <>
            {/* Quick Stats Ribbon */}
            <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '16px', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
              <style>{`::-webkit-scrollbar { display: none; }`}</style>
              
              <div style={{ minWidth: '140px', background: '#ffffff', borderRadius: '16px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, marginBottom: '4px' }}>Earnings</div>
                <div style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.02em' }}>₵145</div>
              </div>
              
              <div style={{ minWidth: '140px', background: '#ffffff', borderRadius: '16px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, marginBottom: '4px' }}>Deliveries</div>
                <div style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.02em' }}>{completedCount} <span style={{ fontSize: '14px', color: '#94a3b8' }}>/ {stops.length}</span></div>
              </div>

              <div style={{ minWidth: '140px', background: '#ffffff', borderRadius: '16px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, marginBottom: '4px' }}>Rating</div>
                <div style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.02em', color: '#078c35' }}>4.9</div>
              </div>
            </div>

            {/* Active Route Widget */}
            {activeStop && (
              <div style={{ 
                background: '#ffffff', borderRadius: '24px', overflow: 'hidden', marginBottom: '32px',
                border: '1px solid #e2e8f0', boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)'
              }}>
                <div style={{ 
                  height: '140px', position: 'relative', background: '#e2e8f0',
                  backgroundImage: 'radial-gradient(rgba(15,23,42,0.1) 1px, transparent 1px)', backgroundSize: '20px 20px'
                }}>
                  <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
                    <path d="M 20 120 Q 150 40 300 80" fill="none" stroke="#3b82f6" strokeWidth="6" strokeDasharray="10 10" />
                    <circle cx="300" cy="80" r="10" fill="#078c35" stroke="#fff" strokeWidth="3" />
                  </svg>
                  <div style={{ position: 'absolute', top: '16px', left: '16px', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(4px)', padding: '6px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: 800, color: '#0f172a', letterSpacing: '0.05em' }}>
                    ACTIVE ROUTE
                  </div>
                </div>
                
                <div style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div>
                      <h3 style={{ margin: '0 0 4px 0', fontSize: '22px', fontWeight: 800, letterSpacing: '-0.02em' }}>{activeStop.address}</h3>
                      <p style={{ margin: 0, fontSize: '14px', color: '#64748b', fontWeight: 500 }}>{activeStop.details}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', marginBottom: '2px' }}>ETA</div>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: '#078c35' }}>{activeStop.eta}</div>
                    </div>
                  </div>
                  <button 
                    onClick={() => navigate('/route')}
                    style={{ width: '100%', background: '#0f172a', color: '#fff', padding: '16px', borderRadius: '16px', border: 'none', fontWeight: 800, fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 4px 16px rgba(15,23,42,0.2)' }}
                  >
                    Open GPS Navigation
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                  </button>
                </div>
              </div>
            )}

            {/* Daily Itinerary */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, letterSpacing: '-0.01em' }}>Today's Itinerary</h3>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748b', background: '#e2e8f0', padding: '4px 10px', borderRadius: '12px' }}>{stops.length} Total</span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {stops.map(stop => (
                  <div key={stop.id} style={{ 
                    background: '#ffffff', borderRadius: '20px', padding: '20px', 
                    border: '1px solid', borderColor: stop.status === 'active' ? '#078c35' : '#e2e8f0',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.03)', position: 'relative', overflow: 'hidden'
                  }}>
                    {stop.status === 'active' && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: '#078c35' }} />}
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div style={{ 
                        fontSize: '11px', fontWeight: 800, padding: '4px 10px', borderRadius: '8px', textTransform: 'uppercase', letterSpacing: '0.05em',
                        background: stop.status === 'completed' ? '#f0fdf4' : stop.status === 'failed' ? '#fef2f2' : stop.status === 'active' ? '#f0fdf4' : '#f8fafc',
                        color: stop.status === 'completed' ? '#16a34a' : stop.status === 'failed' ? '#dc2626' : stop.status === 'active' ? '#16a34a' : '#64748b',
                        border: '1px solid', borderColor: stop.status === 'completed' ? '#bbf7d0' : stop.status === 'failed' ? '#fecaca' : stop.status === 'active' ? '#bbf7d0' : '#e2e8f0'
                      }}>
                        {stop.status}
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{stop.eta}</div>
                    </div>
                    
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 800, color: '#0f172a', textDecoration: stop.status === 'completed' || stop.status === 'failed' ? 'line-through' : 'none' }}>
                      {stop.address}
                    </h4>
                    <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#64748b', fontWeight: 500 }}>{stop.details} • {stop.parcels} Units</p>

                    {/* Inline Actions */}
                    {(stop.status === 'pending' || stop.status === 'active') && (
                      <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                        {stop.status === 'pending' && (
                          <button 
                            onClick={() => handleSetActive(stop.id)}
                            style={{ flex: 1, padding: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', fontWeight: 700, color: '#0f172a', cursor: 'pointer' }}
                          >
                            Set Active
                          </button>
                        )}
                        <button 
                          onClick={() => { setInteractingStopId(stop.id); setPodOpen(true); }}
                          style={{ flex: stop.status === 'active' ? 1 : 'none', padding: '10px 24px', background: '#078c35', border: 'none', borderRadius: '12px', fontWeight: 700, color: '#fff', cursor: 'pointer' }}
                        >
                          Deliver
                        </button>
                        <button 
                          onClick={() => { setInteractingStopId(stop.id); setIssueOpen(true); }}
                          style={{ padding: '10px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', color: '#ef4444', cursor: 'pointer' }}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

      </main>

      {podOpen && interactingStop && (
        <ProofOfDeliveryModal stopAddress={interactingStop.address} onClose={() => { setPodOpen(false); setInteractingStopId(null); }} onSubmit={handleCompleteStop} />
      )}

      {issueOpen && interactingStop && (
        <ReportIssueModal stopAddress={interactingStop.address} onClose={() => { setIssueOpen(false); setInteractingStopId(null); }} onSubmit={handleIssueSubmit} />
      )}

    </div>
  );
}