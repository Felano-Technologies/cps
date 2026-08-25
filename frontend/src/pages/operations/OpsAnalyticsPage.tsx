import { useState } from 'react';

type TimeRange = '7days' | '30days' | 'quarter';

export default function OpsAnalyticsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('7days');

  const getMetrics = () => {
    switch(timeRange) {
      case '30days': 
        return { 
          revenue: 'GHS 98,200', revTrend: '↑ 18.2%', revColor: '#10b981',
          deliveries: '7,450', delTrend: '↑ 8.5%', delColor: '#10b981',
          time: '38 mins', timeTrend: '↓ 4 mins', timeColor: '#10b981'
        };
      case 'quarter': 
        return { 
          revenue: 'GHS 315,000', revTrend: '↑ 24.1%', revColor: '#10b981',
          deliveries: '24,100', delTrend: '↑ 15.3%', delColor: '#10b981',
          time: '45 mins', timeTrend: '↑ 3 mins', timeColor: '#ef4444' // Slower over quarter
        };
      default: 
        return { 
          revenue: 'GHS 24,500', revTrend: '↑ 12.5%', revColor: '#10b981',
          deliveries: '1,842', delTrend: '↑ 5.2%', delColor: '#10b981',
          time: '42 mins', timeTrend: '↓ 2 mins', timeColor: '#10b981'
        };
    }
  };

  const getChartData = () => {
    if (timeRange === '7days') {
      return [
        { label: 'Mon', val: 40 }, { label: 'Tue', val: 55 }, { label: 'Wed', val: 80 },
        { label: 'Thu', val: 65 }, { label: 'Fri', val: 90 }, { label: 'Sat', val: 100, active: true }, { label: 'Sun', val: 30 }
      ];
    } else if (timeRange === '30days') {
      return [
        { label: 'Week 1', val: 60 }, { label: 'Week 2', val: 85, active: true }, 
        { label: 'Week 3', val: 75 }, { label: 'Week 4', val: 95 }
      ];
    } else {
      return [
        { label: 'October', val: 70 }, { label: 'November', val: 85 }, { label: 'December', val: 100, active: true }
      ];
    }
  };

  const metrics = getMetrics();
  const chartData = getChartData();

  return (
    <div className="page-shell light-shell">
      <style>{`
        .analytics-header-bg {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          border-radius: 20px;
          padding: 40px;
          color: white;
          position: relative;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(15, 23, 42, 0.15);
          margin-bottom: 32px;
        }
        
        .analytics-header-bg::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: radial-gradient(rgba(131, 211, 20, 0.15) 1px, transparent 1px);
          background-size: 24px 24px;
        }

        .glass-panel {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.9);
          border-radius: 20px;
          padding: 28px;
          box-shadow: 0 8px 32px rgba(15, 23, 42, 0.04);
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .glass-panel:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 40px rgba(15, 23, 42, 0.08);
        }

        .chart-bar {
          background: linear-gradient(180deg, rgba(7, 140, 53, 0.8) 0%, rgba(7, 140, 53, 0.4) 100%);
          border-radius: 8px 8px 0 0;
          width: 100%;
          max-width: 48px;
          transition: height 0.5s cubic-bezier(0.4, 0, 0.2, 1), background 0.3s;
          position: relative;
        }

        .chart-bar:hover, .chart-bar.active {
          background: linear-gradient(180deg, #0ea5e9 0%, rgba(14, 165, 233, 0.4) 100%);
          box-shadow: 0 -4px 12px rgba(14, 165, 233, 0.3);
        }

        .chart-container {
          flex: 1;
          display: flex;
          align-items: flex-end;
          justify-content: space-around;
          padding-bottom: 32px;
          position: relative;
          border-bottom: 2px solid #e2e8f0;
          margin-top: 24px;
        }
        
        .chart-grid-line {
          position: absolute;
          left: 0;
          right: 0;
          height: 1px;
          background: rgba(0,0,0,0.05);
          z-index: 0;
        }

        .chart-column {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          z-index: 1;
          flex: 1;
          height: 100%;
          justify-content: flex-end;
        }

        .analytics-main-grid {
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 24px;
        }

        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 24px;
          margin-bottom: 32px;
        }

        @media (max-width: 1024px) {
          .analytics-main-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .analytics-header-bg {
            padding: 24px;
            border-radius: 16px;
          }
        }
      `}</style>
      
      <main className="container" style={{ padding: '32px 24px', maxWidth: '1400px' }}>
        
        {/* Premium Header */}
        <div className="analytics-header-bg">
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '24px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <div style={{ width: '12px', height: '12px', background: '#3b82f6', borderRadius: '50%', boxShadow: '0 0 12px #3b82f6' }} />
                <h1 style={{ margin: 0, fontSize: '32px', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>Intelligence & Reporting</h1>
              </div>
              <p style={{ color: '#e2e8f0', fontSize: '16px', fontWeight: 500, margin: 0, maxWidth: '500px', lineHeight: 1.5 }}>
                Track historical fleet performance, revenue trends, and optimize your delivery network.
              </p>
            </div>
            
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '6px', borderRadius: '16px', backdropFilter: 'blur(12px)' }}>
              <select 
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as TimeRange)}
                style={{ 
                  padding: '10px 20px', borderRadius: '12px', fontWeight: 700, border: 'none', 
                  background: '#fff', color: '#0f172a', cursor: 'pointer', appearance: 'none',
                  outline: 'none', minWidth: '150px'
                }}
              >
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
                <option value="quarter">This Quarter</option>
              </select>
            </div>
          </div>
        </div>

        {/* Dynamic KPI Cards */}
        <div className="kpi-grid">
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Revenue</div>
              <div style={{ width: '40px', height: '40px', background: '#f0fdf4', color: '#16a34a', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>💰</div>
            </div>
            <div style={{ fontSize: '40px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>{metrics.revenue}</div>
            <div style={{ fontSize: '15px', color: metrics.revColor, fontWeight: 700, marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ background: `${metrics.revColor}20`, padding: '4px 8px', borderRadius: '6px' }}>{metrics.revTrend}</span>
              <span style={{ color: '#94a3b8', fontWeight: 500 }}>vs previous period</span>
            </div>
          </div>
          
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Successful Deliveries</div>
              <div style={{ width: '40px', height: '40px', background: '#eff6ff', color: '#2563eb', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>📦</div>
            </div>
            <div style={{ fontSize: '40px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>{metrics.deliveries}</div>
            <div style={{ fontSize: '15px', color: metrics.delColor, fontWeight: 700, marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ background: `${metrics.delColor}20`, padding: '4px 8px', borderRadius: '6px' }}>{metrics.delTrend}</span>
              <span style={{ color: '#94a3b8', fontWeight: 500 }}>vs previous period</span>
            </div>
          </div>

          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avg Delivery Time</div>
              <div style={{ width: '40px', height: '40px', background: '#fef2f2', color: '#dc2626', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>⏱️</div>
            </div>
            <div style={{ fontSize: '40px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>{metrics.time}</div>
            <div style={{ fontSize: '15px', color: metrics.timeColor, fontWeight: 700, marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ background: `${metrics.timeColor}20`, padding: '4px 8px', borderRadius: '6px' }}>{metrics.timeTrend}</span>
              <span style={{ color: '#94a3b8', fontWeight: 500 }}>vs previous period</span>
            </div>
          </div>
        </div>

        <div className="analytics-main-grid">
          
          {/* Main Chart Area */}
          <div className="glass-panel" style={{ height: '450px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>Delivery Volume Trends</h3>
              <div style={{ display: 'flex', gap: '16px', fontSize: '13px', fontWeight: 600 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#078c35' }}/> Standard Volume</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#0ea5e9' }}/> Peak Load</div>
              </div>
            </div>
            
            <div className="chart-container">
              <div className="chart-grid-line" style={{ bottom: '25%' }} />
              <div className="chart-grid-line" style={{ bottom: '50%' }} />
              <div className="chart-grid-line" style={{ bottom: '75%' }} />
              <div className="chart-grid-line" style={{ bottom: '100%' }} />

              {chartData.map((data, idx) => (
                <div key={idx} className="chart-column">
                  <div className={`chart-bar ${data.active ? 'active' : ''}`} style={{ height: `${data.val}%` }}>
                    <div style={{ position: 'absolute', top: '-24px', left: '50%', transform: 'translateX(-50%)', fontSize: '12px', fontWeight: 700, color: data.active ? '#0ea5e9' : 'transparent', transition: 'color 0.3s' }}>
                      {data.val * 12}
                    </div>
                  </div>
                  <span style={{ position: 'absolute', bottom: 0, fontSize: '13px', fontWeight: 600, color: '#64748b' }}>{data.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Rider Leaderboard */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ margin: '0 0 24px 0', fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>Top Performing Riders</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[
                { name: 'Kwame D.', score: '99.8%', deliveries: 142, icon: '🏆', bg: '#fef3c7' },
                { name: 'Samuel O.', score: '98.5%', deliveries: 128, icon: '🥈', bg: '#f1f5f9' },
                { name: 'Michael T.', score: '97.2%', deliveries: 115, icon: '🥉', bg: '#ffedd5' },
                { name: 'Isaac A.', score: '96.0%', deliveries: 98, icon: '🏅', bg: '#f0fdf4' },
                { name: 'Eric N.', score: '94.5%', deliveries: 85, icon: '🏅', bg: '#eff6ff' },
              ].map((rider, idx) => (
                <div key={idx} style={{ 
                  display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', 
                  background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0',
                  transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'default'
                }} className="leaderboard-item">
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: rider.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                    {rider.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '15px' }}>{rider.name}</div>
                    <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 600, marginTop: '2px' }}>{rider.deliveries} total trips</div>
                  </div>
                  <div style={{ fontWeight: 800, color: '#078c35', fontSize: '16px', background: '#dcfce7', padding: '6px 10px', borderRadius: '8px' }}>
                    {rider.score}
                  </div>
                </div>
              ))}
            </div>
            <style>{`
              .leaderboard-item:hover { transform: translateX(4px); box-shadow: 0 4px 12px rgba(0,0,0,0.05); background: #fff; }
            `}</style>
          </div>

        </div>

      </main>
    </div>
  );
}
