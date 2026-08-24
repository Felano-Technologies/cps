export default function RiderRoutePage() {
  return (
    <div className="page-shell route-shell" style={{ display: 'flex', justifyContent: 'center', padding: '24px 16px', background: 'var(--bg)' }}>
      <div className="route-card card-style" style={{ width: 'min(480px, 100%)', margin: '0 auto', border: '1px solid var(--border)', background: '#fff', padding: '20px' }}>
        <div className="route-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
          <div className="route-brand-row" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="green-icon" style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
              🏍️
            </div>
            <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Today's Route</h2>
          </div>
          <button className="neutral-btn small bell-btn" style={{ padding: '8px', borderRadius: '50%' }}>🔔</button>
        </div>

        <div className="route-main-card" style={{ marginTop: '20px' }}>
          <div className="route-title-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span className="route-label" style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, letterSpacing: '0.05em' }}>CURRENT ROUTE</span>
            <span className="progress-pill" style={{ background: 'var(--success-bg)', color: 'var(--green-dark)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>In Progress</span>
          </div>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1.8rem' }}>Route 42A - Downtown</h3>
          
          <div className="route-metrics" style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: '#f8fafc', borderRadius: '8px' }}>
            <div style={{ textAlign: 'center' }}>
              <span style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '4px' }}>Total Stops</span>
              <strong style={{ fontSize: '1.2rem', color: 'var(--navy)' }}>24</strong>
            </div>
            <div style={{ textAlign: 'center' }}>
              <span style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '4px' }}>Completed</span>
              <strong style={{ fontSize: '1.2rem', color: 'var(--green-dark)' }}>8</strong>
            </div>
            <div style={{ textAlign: 'center' }}>
              <span style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '4px' }}>Est. Time</span>
              <strong style={{ fontSize: '1.2rem', color: 'var(--navy)' }}>4h 15m</strong>
            </div>
          </div>
        </div>

        <div className="route-map-card" style={{ marginTop: '24px' }}>
          <div className="small-map" style={{ height: '200px', background: '#e2e8f0', borderRadius: '8px', border: '1px solid var(--border)' }} />
        </div>

        <div className="next-stop-row" style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '24px', padding: '16px', background: '#fff', border: '2px solid var(--green)', borderRadius: '12px', boxShadow: '0 4px 12px rgba(131, 211, 20, 0.15)' }}>
          <div style={{ flex: 1 }}>
            <div className="next-label" style={{ color: 'var(--green-dark)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>NEXT STOP (0.8 mi)</div>
            <div className="next-address" style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--navy)' }}>Harper Road, Adum, Kumasi</div>
          </div>
          <div className="next-button" style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--green)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', cursor: 'pointer' }}>
            ➜
          </div>
        </div>

        <div className="stops-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '32px', marginBottom: '16px' }}>
          <h4 style={{ margin: 0, fontSize: '1.2rem' }}>Upcoming Stops</h4>
          <span style={{ color: '#64748b', fontSize: '0.9rem' }}>16 remaining</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="stop-item active-stop" style={{ display: 'flex', gap: '16px', padding: '16px', background: '#f8fafc', borderRadius: '8px', borderLeft: '4px solid var(--green)' }}>
            <div className="stop-number" style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--green)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>9</div>
            <div className="stop-copy" style={{ flex: 1 }}>
              <div className="stop-address" style={{ fontWeight: 700, color: 'var(--navy)' }}>1400 1st Ave</div>
              <div className="stop-detail" style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '4px' }}>Suite 200, Building B</div>
              <div className="sub-detail" style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '4px' }}><span className="mini-box" /> 3 Parcels</div>
            </div>
            <button className="primary-green route-action" style={{ alignSelf: 'center', padding: '8px 16px', fontSize: '0.9rem' }}>Arrive</button>
          </div>

          <div className="stop-item" style={{ display: 'flex', gap: '16px', padding: '16px', border: '1px solid var(--border)', borderRadius: '8px' }}>
            <div className="stop-number" style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e2e8f0', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>10</div>
            <div className="stop-copy" style={{ flex: 1 }}>
              <div className="stop-address" style={{ fontWeight: 700, color: 'var(--navy)' }}>801 2nd Ave</div>
              <div className="stop-detail" style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '4px' }}>Front desk drop-off</div>
              <div className="sub-detail" style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '4px' }}><span className="mini-box" /> 1 Parcel</div>
            </div>
          </div>

          <div className="stop-item" style={{ display: 'flex', gap: '16px', padding: '16px', border: '1px solid var(--border)', borderRadius: '8px' }}>
            <div className="stop-number" style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e2e8f0', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>11</div>
            <div className="stop-copy" style={{ flex: 1 }}>
              <div className="stop-address" style={{ fontWeight: 700, color: 'var(--navy)' }}>1001 4th Ave</div>
              <div className="stop-detail" style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '4px' }}>Loading dock access</div>
              <div className="sub-detail" style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '4px' }}><span className="mini-box" /> 5 Parcels</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
