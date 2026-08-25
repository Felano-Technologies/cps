import { useState } from 'react';
import { Link } from 'react-router-dom';
import EmptyState from '../../components/EmptyState';

interface OpsAlert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  desc: string;
  time: string;
  orderId?: string;
  rider?: string;
  resolved: boolean;
}

const initialAlerts: OpsAlert[] = [
  { id: 'ALT-1', type: 'critical', title: 'Vehicle Breakdown', desc: 'Rider reported a flat tire. Needs immediate reassignment.', time: '10 mins ago', rider: 'Kwame D.', orderId: 'ORD-9982', resolved: false },
  { id: 'ALT-2', type: 'warning', title: 'Customer Not Home', desc: 'Rider is waiting at destination but customer is unreachable.', time: '22 mins ago', rider: 'Samuel O.', orderId: 'ORD-9011', resolved: false },
  { id: 'ALT-3', type: 'info', title: 'Traffic Delay', desc: 'Heavy traffic on Spintex Road. Route 42A delayed by ~15 mins.', time: '1 hr ago', resolved: false },
  { id: 'ALT-4', type: 'critical', title: 'Address Not Found', desc: 'GPS coordinates do not match physical address.', time: '2 hrs ago', rider: 'Isaac A.', orderId: 'ORD-7742', resolved: true },
];

export default function OpsAlertsPage() {
  const [alerts, setAlerts] = useState<OpsAlert[]>(initialAlerts);
  const [filter, setFilter] = useState<'active' | 'resolved'>('active');

  const filteredAlerts = alerts.filter(a => filter === 'active' ? !a.resolved : a.resolved);

  const handleResolve = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, resolved: true } : a));
  };

  return (
    <div className="page-shell light-shell">
      <style>{`
        .alerts-header-bg {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          border-radius: 20px;
          padding: 40px;
          color: white;
          position: relative;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(15, 23, 42, 0.15);
          margin-bottom: 32px;
        }
        
        .alerts-header-bg::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: radial-gradient(rgba(255,255,255,0.1) 1px, transparent 1px);
          background-size: 24px 24px;
          opacity: 0.5;
        }

        .alert-card {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.9);
          border-radius: 20px;
          padding: 24px;
          display: flex;
          gap: 24px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 8px 32px rgba(15, 23, 42, 0.04);
          position: relative;
          overflow: hidden;
        }

        .alert-card:hover {
          transform: translateY(-2px) scale(1.005);
          box-shadow: 0 16px 48px rgba(15, 23, 42, 0.08);
        }

        /* Pulse Animations for Icons */
        @keyframes pulse-critical {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          70% { box-shadow: 0 0 0 16px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
        @keyframes pulse-warning {
          0% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4); }
          70% { box-shadow: 0 0 0 16px rgba(245, 158, 11, 0); }
          100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); }
        }
        
        .icon-critical {
          background: #fef2f2;
          color: #ef4444;
          border: 2px solid #fecaca;
          animation: pulse-critical 2s infinite;
        }
        .icon-warning {
          background: #fffbeb;
          color: #f59e0b;
          border: 2px solid #fde68a;
          animation: pulse-warning 2.5s infinite;
        }
        .icon-info {
          background: #eff6ff;
          color: #3b82f6;
          border: 2px solid #bfdbfe;
        }
        .icon-resolved {
          background: #f1f5f9;
          color: #94a3b8;
          border: 2px solid #e2e8f0;
        }

        .alert-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.02em;
          background: rgba(255,255,255,0.8);
          border: 1px solid rgba(0,0,0,0.05);
          backdrop-filter: blur(4px);
        }

        @media (max-width: 768px) {
          .alert-card {
            flex-direction: column;
            gap: 16px;
          }
          .alerts-header-bg {
            padding: 24px;
            border-radius: 16px;
          }
        }
      `}</style>
      
      <main className="container" style={{ padding: '32px 24px', maxWidth: '1100px' }}>
        
        {/* Premium Header */}
        <div className="alerts-header-bg">
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '24px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <div style={{ width: '12px', height: '12px', background: '#ef4444', borderRadius: '50%', boxShadow: '0 0 12px #ef4444' }} />
                <h1 style={{ margin: 0, fontSize: '32px', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>Live Alerts Center</h1>
              </div>
              <p style={{ color: '#e2e8f0', fontSize: '16px', fontWeight: 500, margin: 0, maxWidth: '500px', lineHeight: 1.5 }}>
                Monitor and triage real-time exceptions from the field. Critical issues require immediate dispatcher intervention.
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.1)', padding: '6px', borderRadius: '16px', backdropFilter: 'blur(12px)' }}>
              <button 
                onClick={() => setFilter('active')} 
                style={{ 
                  padding: '10px 20px', borderRadius: '12px', fontWeight: 700, border: 'none', 
                  background: filter === 'active' ? '#fff' : 'transparent', 
                  color: filter === 'active' ? '#0f172a' : '#cbd5e1', 
                  cursor: 'pointer', transition: 'all 0.2s',
                  boxShadow: filter === 'active' ? '0 4px 12px rgba(0,0,0,0.1)' : 'none' 
                }}
              >
                Active ({alerts.filter(a => !a.resolved).length})
              </button>
              <button 
                onClick={() => setFilter('resolved')} 
                style={{ 
                  padding: '10px 20px', borderRadius: '12px', fontWeight: 700, border: 'none', 
                  background: filter === 'resolved' ? '#fff' : 'transparent', 
                  color: filter === 'resolved' ? '#0f172a' : '#cbd5e1', 
                  cursor: 'pointer', transition: 'all 0.2s',
                  boxShadow: filter === 'resolved' ? '0 4px 12px rgba(0,0,0,0.1)' : 'none' 
                }}
              >
                Resolved
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {filteredAlerts.length > 0 ? (
            filteredAlerts.map(alert => {
              const iconClass = alert.resolved ? 'icon-resolved' : `icon-${alert.type}`;
              const IconContent = alert.type === 'critical' ? '⚠️' : alert.type === 'warning' ? '⏳' : 'ℹ️';
              
              // Subtle gradient background overlay for unresolved cards
              const bgOverlay = !alert.resolved ? (
                alert.type === 'critical' ? 'linear-gradient(90deg, rgba(254, 226, 226, 0.4) 0%, transparent 100%)' :
                alert.type === 'warning' ? 'linear-gradient(90deg, rgba(254, 243, 199, 0.4) 0%, transparent 100%)' :
                'linear-gradient(90deg, rgba(219, 234, 254, 0.4) 0%, transparent 100%)'
              ) : 'none';

              return (
                <div key={alert.id} className="alert-card" style={{ backgroundImage: bgOverlay }}>
                  
                  {/* Left: Animated Icon */}
                  <div style={{ flexShrink: 0 }}>
                    <div className={iconClass} style={{ 
                      width: '56px', height: '56px', borderRadius: '16px', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' 
                    }}>
                      {alert.resolved ? '✓' : IconContent}
                    </div>
                  </div>
                  
                  {/* Middle: Content */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em' }}>{alert.title}</h3>
                      <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>{alert.time}</span>
                    </div>
                    <p style={{ color: '#475569', margin: '0 0 20px 0', fontSize: '16px', lineHeight: 1.5, maxWidth: '600px' }}>
                      {alert.desc}
                    </p>
                    
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                      {alert.orderId && (
                        <Link to={`/ops/tracking/${alert.orderId}`} className="alert-tag" style={{ color: '#334155', textDecoration: 'none' }}>
                          <span style={{ fontSize: '16px' }}>📦</span> {alert.orderId}
                        </Link>
                      )}
                      {alert.rider && (
                        <div className="alert-tag" style={{ color: '#475569' }}>
                          <span style={{ fontSize: '16px' }}>👤</span> {alert.rider}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Right: Actions */}
                  {!alert.resolved && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', justifyContent: 'center', minWidth: '160px' }}>
                      <button 
                        onClick={() => handleResolve(alert.id)}
                        style={{ 
                          padding: '12px 16px', borderRadius: '12px', fontSize: '14px', fontWeight: 800, 
                          background: '#078c35', color: '#fff', border: 'none', cursor: 'pointer',
                          boxShadow: '0 4px 12px rgba(7, 140, 53, 0.2)', transition: 'all 0.2s', textAlign: 'center'
                        }}
                      >
                        Resolve Issue
                      </button>
                      <button 
                        className="neutral-btn" 
                        style={{ padding: '12px 16px', borderRadius: '12px', fontSize: '14px', fontWeight: 700, textAlign: 'center' }}
                      >
                        Contact Rider
                      </button>
                    </div>
                  )}
                  
                </div>
              );
            })
          ) : (
            <EmptyState 
              icon="✅"
              title="All Clear!"
              message={filter === 'active' ? "There are no active alerts right now. Your fleet is operating smoothly." : "No resolved issues found in recent history."}
            />
          )}
        </div>
      </main>
    </div>
  );
}
