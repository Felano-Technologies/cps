import { useParams, useNavigate } from 'react-router-dom';

export default function CustomerTrackingPage() {
  const { parcelId } = useParams();
  const navigate = useNavigate();

  return (
    <div className="page-shell light-shell">
      {/* 
        Fix spacing with footer by applying generous bottom padding to the main container 
        (e.g., 120px padding bottom).
      */}
      <main className="container" style={{ paddingTop: '48px', paddingBottom: '120px', maxWidth: '1100px', margin: '0 auto' }}>
        
        {/* Header Section */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', marginBottom: '8px', letterSpacing: '-0.02em' }}>
              Tracking Details
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '15px', color: '#64748b', fontWeight: 500 }}>Shipment ID:</span>
              <span style={{ 
                background: '#e2e8f0', color: '#0f172a', padding: '4px 10px', 
                borderRadius: '6px', fontWeight: 700, fontSize: '14px', letterSpacing: '0.05em' 
              }}>
                {parcelId || 'CPS-9982-441-A'}
              </span>
            </div>
          </div>
          <button 
            onClick={() => navigate('/shipments')}
            className="neutral-btn"
            style={{ padding: '10px 20px', fontSize: '14px', borderRadius: '10px' }}
          >
            ← Back to Shipments
          </button>
        </div>

        {/* Two-Column Grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
          gap: '32px', 
          alignItems: 'start' 
        }}>
          
          {/* LEFT COLUMN: Map & Shipment Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Live Map Placeholder */}
            <div className="card-style" style={{ padding: '0', overflow: 'hidden', height: '240px', position: 'relative', background: '#e2e8f0' }}>
              {/* Map grid pattern for premium aesthetic */}
              <div style={{ 
                position: 'absolute', inset: 0, 
                backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', 
                backgroundSize: '20px 20px', opacity: 0.5 
              }} />
              <div style={{ 
                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' 
              }}>
                <div style={{ 
                  width: '48px', height: '48px', background: '#078c35', borderRadius: '50%', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 0 0 8px rgba(7, 140, 53, 0.2), 0 10px 20px rgba(0,0,0,0.1)',
                  animation: 'pulse 2s infinite'
                }}>
                  <svg viewBox="0 0 24 24" width="24" height="24" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="10" r="3"/>
                    <path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z"/>
                  </svg>
                </div>
                <div style={{ marginTop: '16px', background: '#ffffff', padding: '8px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 600, color: '#0f172a', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                  Rider is 5 mins away
                </div>
              </div>
              <style>{`
                @keyframes pulse {
                  0% { box-shadow: 0 0 0 0 rgba(7, 140, 53, 0.4); }
                  70% { box-shadow: 0 0 0 20px rgba(7, 140, 53, 0); }
                  100% { box-shadow: 0 0 0 0 rgba(7, 140, 53, 0); }
                }
              `}</style>
            </div>

            {/* Shipment Details Card */}
            <div className="card-style" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginBottom: '20px' }}>Delivery Details</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                <div>
                  <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Origin</div>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a' }}>Accra North Hub</div>
                  <div style={{ fontSize: '14px', color: '#64748b', marginTop: '2px' }}>Spintex, GH</div>
                </div>
                <div>
                  <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Destination</div>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a' }}>Tech Campus HQ</div>
                  <div style={{ fontSize: '14px', color: '#64748b', marginTop: '2px' }}>KNUST, Kumasi, GH</div>
                </div>
              </div>
              
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 600, marginBottom: '4px' }}>Service Type</div>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a' }}>Motorbike Express</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 600, marginBottom: '4px' }}>Weight</div>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a' }}>2.4 kg</div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Vertical Timeline */}
          <div className="card-style" style={{ padding: '32px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginBottom: '32px' }}>Tracking History</h3>
            
            <div style={{ position: 'relative' }}>
              {/* Vertical connecting line */}
              <div style={{ position: 'absolute', left: '15px', top: '24px', bottom: '24px', width: '2px', background: '#e2e8f0', zIndex: 0 }} />

              {/* Step 1: Delivered (Pending) */}
              <div style={{ display: 'flex', gap: '20px', position: 'relative', zIndex: 1, marginBottom: '32px', opacity: 0.5 }}>
                <div style={{ 
                  width: '32px', height: '32px', borderRadius: '50%', background: '#f1f5f9', border: '2px solid #cbd5e1',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <svg viewBox="0 0 24 24" width="16" height="16" stroke="#94a3b8" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Package Delivered</div>
                  <div style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>Pending delivery confirmation</div>
                </div>
              </div>

              {/* Step 2: En Route (Active) */}
              <div style={{ display: 'flex', gap: '20px', position: 'relative', zIndex: 1, marginBottom: '32px' }}>
                <div style={{ 
                  width: '32px', height: '32px', borderRadius: '50%', background: '#078c35', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  boxShadow: '0 0 0 4px rgba(7, 140, 53, 0.15)'
                }}>
                  <div style={{ width: '10px', height: '10px', background: '#ffffff', borderRadius: '50%' }} />
                </div>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#078c35' }}>Rider En Route</div>
                  <div style={{ fontSize: '14px', color: '#475569', marginTop: '4px' }}>Your package is currently with the rider and expected within the hour.</div>
                  <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '6px', fontWeight: 500 }}>Today, 14:15</div>
                </div>
              </div>

              {/* Step 3: Out for Delivery (Completed) */}
              <div style={{ display: 'flex', gap: '20px', position: 'relative', zIndex: 1, marginBottom: '32px' }}>
                <div style={{ 
                  width: '32px', height: '32px', borderRadius: '50%', background: '#078c35', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <svg viewBox="0 0 24 24" width="16" height="16" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Out for Delivery</div>
                  <div style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>Package has been dispatched from the hub.</div>
                  <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '6px', fontWeight: 500 }}>Today, 10:42</div>
                </div>
              </div>

              {/* Step 4: Picked Up (Completed) */}
              <div style={{ display: 'flex', gap: '20px', position: 'relative', zIndex: 1 }}>
                <div style={{ 
                  width: '32px', height: '32px', borderRadius: '50%', background: '#078c35', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <svg viewBox="0 0 24 24" width="16" height="16" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Package Picked Up</div>
                  <div style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>Item collected from the sender.</div>
                  <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '6px', fontWeight: 500 }}>Yesterday, 15:30</div>
                </div>
              </div>
              
            </div>
          </div>
          
        </div>

      </main>
    </div>
  );
}
