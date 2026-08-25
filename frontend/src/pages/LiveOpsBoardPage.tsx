import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import OrderPrintModal from '../components/OrderPrintModal';
import EmptyState from '../components/EmptyState';

type OpsOrderStatus = 'In Transit' | 'Out for Delivery' | 'Delivered' | 'Delayed' | 'Urgent';

interface OpsOrder {
  id: string;
  type: string;
  vehicle: '🏍️' | '🚐' | '🚚';
  eta: string;
  status: OpsOrderStatus;
}

const mockLiveOrders: OpsOrder[] = [
  { id: 'ORD-8924', type: 'Pharmacy pickup', vehicle: '🏍️', eta: 'Today, 14:30', status: 'In Transit' },
  { id: 'ORD-9011', type: 'Electronics delivery', vehicle: '🚐', eta: 'Today, 11:15', status: 'Out for Delivery' },
  { id: 'ORD-7742', type: 'Restaurant drop-off', vehicle: '🏍️', eta: 'Delivered: Yesterday', status: 'Delivered' },
  { id: 'ORD-4321', type: 'Retail replenishment', vehicle: '🚐', eta: 'Action Required', status: 'Delayed' },
  { id: 'ORD-9982', type: 'Medical supplies', vehicle: '🏍️', eta: 'Immediate Dispatch', status: 'Urgent' },
  { id: 'ORD-8100', type: 'Groceries', vehicle: '🏍️', eta: 'Today, 16:00', status: 'In Transit' },
];

export default function LiveOpsBoardPage() {
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredOrders = useMemo(() => {
    return mockLiveOrders.filter(order => {
      const matchesFilter = activeFilter === 'All' || order.status === activeFilter;
      const matchesSearch = order.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            order.type.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [activeFilter, searchQuery]);

  const getStatusColor = (status: OpsOrderStatus) => {
    switch (status) {
      case 'In Transit': return { bg: '#e0ffe0', text: '#22863a', dot: '#22863a' };
      case 'Out for Delivery': return { bg: '#dbeafe', text: '#1e40af', dot: '#3b82f6' };
      case 'Delivered': return { bg: '#f1f5f9', text: '#475569', dot: '#94a3b8' };
      case 'Delayed': return { bg: '#fee2e2', text: '#991b1b', dot: '#ef4444' };
      case 'Urgent': return { bg: '#fef9c3', text: '#854d0e', dot: '#eab308' };
      default: return { bg: '#f1f5f9', text: '#475569', dot: '#94a3b8' };
    }
  };

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
        
        .radar-map {
          background: #0f172a;
          border-radius: 16px;
          position: relative;
          overflow: hidden;
          box-shadow: inset 0 0 60px rgba(0,0,0,0.5), 0 10px 30px rgba(15, 23, 42, 0.2);
        }
        .radar-grid {
          position: absolute;
          inset: 0;
          background-image: 
            linear-gradient(rgba(131, 211, 20, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(131, 211, 20, 0.1) 1px, transparent 1px);
          background-size: 30px 30px;
          opacity: 0.5;
        }
        .radar-sweep {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 150%;
          height: 150%;
          background: conic-gradient(from 0deg, transparent 70%, rgba(131, 211, 20, 0.4) 100%);
          transform-origin: 0 0;
          animation: sweep 4s linear infinite;
          pointer-events: none;
        }
        @keyframes sweep {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .map-node {
          position: absolute;
          width: 12px;
          height: 12px;
          background: #83d314;
          border-radius: 50%;
          box-shadow: 0 0 10px #83d314, 0 0 20px #83d314;
          transform: translate(-50%, -50%);
        }
        .map-node.warning {
          background: #ef4444;
          box-shadow: 0 0 10px #ef4444, 0 0 20px #ef4444;
        }
        .map-node::after {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          border-radius: 50%;
          border: 1px solid #83d314;
          animation: ripple 2s infinite ease-out;
        }
        .map-node.warning::after {
          border-color: #ef4444;
        }
        @keyframes ripple {
          0% { transform: scale(0.5); opacity: 1; }
          100% { transform: scale(2.5); opacity: 0; }
        }

        .filter-pill {
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          border: 1px solid #e2e8f0;
          background: #fff;
          color: #64748b;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .filter-pill:hover {
          border-color: #cbd5e1;
        }
        .filter-pill.active {
          background: #0f172a;
          color: #fff;
          border-color: #0f172a;
        }

        .dashboard-main-grid {
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 24px;
          padding: 0 24px;
          align-items: start;
        }

        @media (max-width: 1024px) {
          .dashboard-main-grid {
            grid-template-columns: 1fr;
          }
          .radar-map {
            height: 400px !important;
          }
        }
        @media (max-width: 768px) {
          .kpi-row, .header-row, .dashboard-main-grid {
            padding: 0 16px !important;
          }
        }
      `}</style>
      
      <main className="container" style={{ padding: '32px 0', maxWidth: '1400px' }}>
        
        {/* Header Section */}
        <div className="header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '32px', padding: '0 24px' }}>
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', marginBottom: '8px', letterSpacing: '-0.02em' }}>Operations Command Center</h1>
            <p className="muted-text" style={{ fontSize: '16px', color: '#64748b' }}>Live overview of riders, active orders, and delivery progress.</p>
          </div>
          <button 
            className="primary-green" 
            style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 700, borderRadius: '12px' }}
            onClick={() => setIsPrintModalOpen(true)}
          >
            🖨️ Print Receipt
          </button>
        </div>

        {/* KPI Row */}
        <div className="kpi-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '32px', padding: '0 24px' }}>
          <div className="glass-card" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Orders</div>
              <div style={{ fontSize: '36px', fontWeight: 800, color: '#0f172a', marginTop: '8px' }}>342</div>
            </div>
            <div style={{ width: '48px', height: '48px', background: '#e0ffe0', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>📦</div>
          </div>
          <div className="glass-card" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Available Fleet</div>
              <div style={{ fontSize: '36px', fontWeight: 800, color: '#0f172a', marginTop: '8px' }}>84</div>
            </div>
            <div style={{ width: '48px', height: '48px', background: '#dbeafe', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>🏍️</div>
          </div>
          <div className="glass-card" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0f172a', color: '#fff' }}>
            <div>
              <div style={{ fontSize: '14px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>On-Time SLA</div>
              <div style={{ fontSize: '36px', fontWeight: 800, color: '#fff', marginTop: '8px', display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                96.8%
                <span style={{ fontSize: '16px', color: '#4ade80', fontWeight: 600 }}>↑ 1.2%</span>
              </div>
            </div>
            <div style={{ width: '48px', height: '48px', background: 'rgba(255,255,255,0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>⏱️</div>
          </div>
        </div>

        {/* Main Dashboard Grid */}
        <div className="dashboard-main-grid">
          
          {/* Live Radar Map */}
          <div className="radar-map" style={{ height: '600px', width: '100%' }}>
            <div className="radar-grid" />
            <div className="radar-sweep" />
            
            {/* Map Header Overlay */}
            <div style={{ position: 'absolute', top: '24px', left: '24px', right: '24px', display: 'flex', justifyContent: 'space-between', zIndex: 10 }}>
              <div style={{ background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)', padding: '12px 20px', borderRadius: '12px', color: '#fff', display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ width: '8px', height: '8px', background: '#83d314', borderRadius: '50%', boxShadow: '0 0 10px #83d314' }} />
                <span style={{ fontWeight: 600, fontSize: '15px' }}>Live Fleet Tracking</span>
              </div>
              <div style={{ background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)', padding: '12px 20px', borderRadius: '12px', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}>
                <span style={{ fontSize: '14px', color: '#94a3b8', marginRight: '8px' }}>Zone:</span>
                <strong style={{ fontSize: '15px' }}>Greater Accra</strong>
              </div>
            </div>

            {/* Glowing Map Nodes */}
            <div className="map-node" style={{ top: '35%', left: '42%' }}></div>
            <div className="map-node" style={{ top: '55%', left: '60%' }}></div>
            <div className="map-node warning" style={{ top: '25%', left: '68%' }}></div>
            <div className="map-node" style={{ top: '70%', left: '30%' }}></div>
            <div className="map-node" style={{ top: '45%', left: '75%' }}></div>
            <div className="map-node warning" style={{ top: '65%', left: '50%' }}></div>

            <div style={{ position: 'absolute', bottom: '24px', left: '24px', background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)', padding: '12px 20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', background: '#83d314', borderRadius: '50%' }} />
                <span style={{ color: '#e2e8f0', fontSize: '13px', fontWeight: 500 }}>Active Rider</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', background: '#ef4444', borderRadius: '50%' }} />
                <span style={{ color: '#e2e8f0', fontSize: '13px', fontWeight: 500 }}>Delayed / Issue</span>
              </div>
            </div>
          </div>

          {/* Interactive Sidebar */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: '600px', overflow: 'hidden' }}>
            <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0', background: '#ffffff', borderTopLeftRadius: '16px', borderTopRightRadius: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginBottom: '16px' }}>Dispatch Queue</h3>
              
              <div style={{ position: 'relative', marginBottom: '16px' }}>
                <input 
                  type="text" 
                  placeholder="Search by Order ID or Type..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '100%', padding: '10px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
                {['All', 'In Transit', 'Delayed', 'Urgent'].map(filter => (
                  <button 
                    key={filter} 
                    className={`filter-pill ${activeFilter === filter ? 'active' : ''}`}
                    onClick={() => setActiveFilter(filter)}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', background: '#f8fafc' }}>
              {filteredOrders.length > 0 ? (
                filteredOrders.map(order => {
                  const colors = getStatusColor(order.status);
                  return (
                    <div key={order.id} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', marginBottom: '12px', transition: 'box-shadow 0.2s' }} className="hover-shadow">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '18px' }}>{order.vehicle}</span>
                          <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '15px' }}>{order.id}</span>
                        </div>
                        <span style={{ 
                          background: colors.bg, color: colors.text, 
                          padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 700,
                          display: 'flex', alignItems: 'center', gap: '6px'
                        }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: colors.dot }}></span>
                          {order.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '14px', color: '#475569', fontWeight: 500, marginBottom: '4px' }}>
                        {order.type}
                      </div>
                      <div style={{ fontSize: '13px', color: '#94a3b8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>ETA: {order.eta}</span>
                        <Link to={`/ops/tracking/${order.id}`} style={{ color: '#078c35', fontWeight: 600, textDecoration: 'none' }}>
                          Track →
                        </Link>
                      </div>
                    </div>
                  );
                })
              ) : (
                <EmptyState 
                  icon="📋"
                  title="No Orders Found"
                  message="There are no orders matching your current dispatch filter. Try clearing your search or switching tabs."
                  actionLabel="Clear Filters"
                  onAction={() => { setSearchQuery(''); setActiveFilter('All'); }}
                  style={{ margin: '16px' }}
                />
              )}
            </div>
            <style>{`
              .hover-shadow:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
            `}</style>
          </div>
          
        </div>
        
        {isPrintModalOpen && <OrderPrintModal onClose={() => setIsPrintModalOpen(false)} />}
      </main>
    </div>
  );
}
