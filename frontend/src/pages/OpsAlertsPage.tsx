import { useState } from 'react';
import { Link } from 'react-router-dom';
import EmptyState from '../components/EmptyState';

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
      <main className="container" style={{ padding: '32px 24px', maxWidth: '1000px' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', marginBottom: '8px', letterSpacing: '-0.02em' }}>Alerts & Issues</h1>
            <p style={{ color: '#64748b', fontSize: '16px', fontWeight: 500 }}>Triage and resolve active exceptions in the field.</p>
          </div>
          
          <div style={{ display: 'flex', gap: '8px', background: '#e2e8f0', padding: '6px', borderRadius: '12px' }}>
            <button 
              onClick={() => setFilter('active')} 
              style={{ padding: '8px 16px', borderRadius: '8px', fontWeight: 600, border: 'none', background: filter === 'active' ? '#fff' : 'transparent', color: filter === 'active' ? '#0f172a' : '#64748b', cursor: 'pointer', boxShadow: filter === 'active' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}
            >
              Active ({alerts.filter(a => !a.resolved).length})
            </button>
            <button 
              onClick={() => setFilter('resolved')} 
              style={{ padding: '8px 16px', borderRadius: '8px', fontWeight: 600, border: 'none', background: filter === 'resolved' ? '#fff' : 'transparent', color: filter === 'resolved' ? '#0f172a' : '#64748b', cursor: 'pointer', boxShadow: filter === 'resolved' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}
            >
              Resolved
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredAlerts.length > 0 ? (
            filteredAlerts.map(alert => (
              <div key={alert.id} style={{ 
                background: '#fff', borderRadius: '16px', padding: '24px', 
                border: '1px solid', borderColor: alert.type === 'critical' && !alert.resolved ? '#fecaca' : '#e2e8f0',
                borderLeft: `6px solid ${alert.type === 'critical' ? '#ef4444' : alert.type === 'warning' ? '#f59e0b' : '#3b82f6'}`,
                boxShadow: '0 4px 12px rgba(15, 23, 42, 0.03)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>{alert.title}</h3>
                  <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>{alert.time}</span>
                </div>
                
                <p style={{ color: '#475569', margin: '0 0 16px 0', fontSize: '15px', lineHeight: 1.5 }}>{alert.desc}</p>
                
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    {alert.orderId && (
                      <Link to={`/ops/tracking/${alert.orderId}`} style={{ display: 'inline-block', fontSize: '13px', background: '#f1f5f9', color: '#334155', padding: '6px 12px', borderRadius: '6px', fontWeight: 600, textDecoration: 'none' }}>
                        📦 {alert.orderId}
                      </Link>
                    )}
                    {alert.rider && (
                      <div style={{ display: 'inline-block', fontSize: '13px', background: '#f8fafc', color: '#475569', padding: '6px 12px', borderRadius: '6px', fontWeight: 600, border: '1px solid #e2e8f0' }}>
                        👤 {alert.rider}
                      </div>
                    )}
                  </div>
                  
                  {!alert.resolved && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="neutral-btn" style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: 600 }}>Contact Rider</button>
                      <button 
                        onClick={() => handleResolve(alert.id)}
                        style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: 700, background: '#078c35', color: '#fff', border: 'none', cursor: 'pointer' }}
                      >
                        Resolve Issue
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
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
