export default function OpsAnalyticsPage() {
  return (
    <div className="page-shell light-shell">
      <style>{`
        .chart-bar {
          background: #078c35;
          border-radius: 4px 4px 0 0;
          width: 40px;
          transition: height 0.3s ease;
        }
        .chart-bar:hover {
          background: #0ea5e9;
        }
        .glass-panel {
          background: #fff;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 10px 25px rgba(15, 23, 42, 0.03);
          padding: 24px;
        }
      `}</style>
      
      <main className="container" style={{ padding: '32px 24px', maxWidth: '1200px' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', marginBottom: '8px', letterSpacing: '-0.02em' }}>Analytics Dashboard</h1>
            <p style={{ color: '#64748b', fontSize: '16px', fontWeight: 500 }}>Historical performance, revenue trends, and fleet efficiency.</p>
          </div>
          <select className="neutral-btn" style={{ padding: '10px 16px', borderRadius: '10px', fontWeight: 600, border: '1px solid #cbd5e1', background: '#fff' }}>
            <option>Last 7 Days</option>
            <option>Last 30 Days</option>
            <option>This Quarter</option>
          </select>
        </div>

        {/* Top KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', marginBottom: '32px' }}>
          <div className="glass-panel">
            <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Revenue</div>
            <div style={{ fontSize: '36px', fontWeight: 800, color: '#0f172a', margin: '8px 0' }}>GHS 24,500</div>
            <div style={{ fontSize: '14px', color: '#078c35', fontWeight: 700 }}>↑ 12.5% vs last week</div>
          </div>
          <div className="glass-panel">
            <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Successful Deliveries</div>
            <div style={{ fontSize: '36px', fontWeight: 800, color: '#0f172a', margin: '8px 0' }}>1,842</div>
            <div style={{ fontSize: '14px', color: '#078c35', fontWeight: 700 }}>↑ 5.2% vs last week</div>
          </div>
          <div className="glass-panel">
            <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avg Delivery Time</div>
            <div style={{ fontSize: '36px', fontWeight: 800, color: '#0f172a', margin: '8px 0' }}>42 mins</div>
            <div style={{ fontSize: '14px', color: '#ef4444', fontWeight: 700 }}>↓ 2 mins vs last week</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px' }}>
          
          {/* Main Chart Area */}
          <div className="glass-panel" style={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ margin: '0 0 24px 0', fontSize: '18px', color: '#0f172a' }}>Delivery Volume (Last 7 Days)</h3>
            
            <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', paddingBottom: '32px', position: 'relative', borderBottom: '2px solid #e2e8f0' }}>
              {/* Simple CSS Chart */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <div className="chart-bar" style={{ height: '40%' }}></div>
                <span style={{ position: 'absolute', bottom: 0, fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Mon</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <div className="chart-bar" style={{ height: '55%' }}></div>
                <span style={{ position: 'absolute', bottom: 0, fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Tue</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <div className="chart-bar" style={{ height: '80%' }}></div>
                <span style={{ position: 'absolute', bottom: 0, fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Wed</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <div className="chart-bar" style={{ height: '65%' }}></div>
                <span style={{ position: 'absolute', bottom: 0, fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Thu</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <div className="chart-bar" style={{ height: '90%' }}></div>
                <span style={{ position: 'absolute', bottom: 0, fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Fri</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <div className="chart-bar" style={{ height: '100%', background: '#3b82f6' }}></div>
                <span style={{ position: 'absolute', bottom: 0, fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Sat</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <div className="chart-bar" style={{ height: '30%' }}></div>
                <span style={{ position: 'absolute', bottom: 0, fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Sun</span>
              </div>
            </div>
          </div>

          {/* Rider Leaderboard */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ margin: '0 0 24px 0', fontSize: '18px', color: '#0f172a' }}>Top Riders</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[
                { name: 'Kwame D.', score: '99.8%', deliveries: 142, icon: '🥇' },
                { name: 'Samuel O.', score: '98.5%', deliveries: 128, icon: '🥈' },
                { name: 'Michael T.', score: '97.2%', deliveries: 115, icon: '🥉' },
                { name: 'Isaac A.', score: '96.0%', deliveries: 98, icon: '👤' },
              ].map((rider, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '24px' }}>{rider.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{rider.name}</div>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>{rider.deliveries} deliveries</div>
                  </div>
                  <div style={{ fontWeight: 800, color: '#078c35' }}>{rider.score}</div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}
