import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function RequestPickupPage() {
  const [vehicle, setVehicle] = useState('motorbike');
  const navigate = useNavigate();

  return (
    <div className="page-shell light-shell">
      
      <main className="create-shell container">
        <h1>Create Delivery</h1>
        <p className="muted-text">Enter pickup and drop-off details to dispatch a rider or driver.</p>

        <div className="progress-bar">
          <div className="step done">
            <span className="step-circle">✓</span>
            <span>Pickup</span>
          </div>
          <div className="step current">
            <span className="step-circle">●</span>
            <span>Drop-off</span>
          </div>
          <div className="step">
            <span className="step-circle">3</span>
            <span>Timing</span>
          </div>
          <div className="step">
            <span className="step-circle">4</span>
            <span>Confirm</span>
          </div>
        </div>

        <div className="step-layout">
          <div className="form-card large-card">
            <div className="card-title">Delivery Details</div>

            <div className="field-grid two-col" style={{ marginBottom: '16px' }}>
              <label>
                <span>Vehicle Type</span>
                <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                  <button 
                    type="button" 
                    onClick={() => setVehicle('motorbike')}
                    style={{ flex: 1, padding: '12px', borderRadius: '12px', border: `2px solid ${vehicle === 'motorbike' ? 'var(--green)' : 'var(--border)'}`, background: vehicle === 'motorbike' ? 'var(--success-bg)' : '#fff', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    <span style={{ fontSize: '1.2rem' }}>🏍️</span> Motorbike
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setVehicle('van')}
                    style={{ flex: 1, padding: '12px', borderRadius: '12px', border: `2px solid ${vehicle === 'van' ? 'var(--green)' : 'var(--border)'}`, background: vehicle === 'van' ? 'var(--success-bg)' : '#fff', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    <span style={{ fontSize: '1.2rem' }}>🚐</span> Van
                  </button>
                </div>
              </label>
              <label>
                <span>Service Level</span>
                <select defaultValue="express">
                  <option value="express">Express (ASAP)</option>
                  <option value="sameday">Same Day (by 5PM)</option>
                  <option value="scheduled">Scheduled Time</option>
                </select>
              </label>
            </div>

            <div className="field-grid two-col" style={{ marginBottom: '16px' }}>
              <label>
                <span>Pickup Address</span>
                <input placeholder="123 Origin St" />
              </label>
              <label>
                <span>Drop-off Address</span>
                <input placeholder="456 Destination Ave" />
              </label>
            </div>
            
            <div className="field-grid two-col">
              <label>
                <span>Pickup Area / Zone</span>
                <select defaultValue="central">
                  <option value="central">Central District</option>
                  <option value="north">North Quarter</option>
                  <option value="south">South Hub</option>
                </select>
              </label>
              <label>
                <span>Drop-off Area / Zone</span>
                <select defaultValue="north">
                  <option value="central">Central District</option>
                  <option value="north">North Quarter</option>
                  <option value="south">South Hub</option>
                </select>
              </label>
            </div>
          </div>

          <aside className="side-stack">
            <div className="summary-card">
              <div className="card-title">Summary</div>
              <div className="summary-row"><span>Pickup</span><strong>Central District</strong></div>
              <div className="summary-row"><span>Drop-off</span><strong>North Quarter</strong></div>
              <div className="summary-row"><span>Vehicle</span><strong>{vehicle === 'motorbike' ? 'Motorbike' : 'Van'}</strong></div>
              <div className="summary-row"><span>ETA</span><strong>18 min</strong></div>
              <button className="primary-green wide-btn" onClick={() => navigate('/shipments')}>Dispatch Rider →</button>
              <button className="neutral-btn wide-btn" style={{ marginTop: '12px' }}>Save Draft</button>
            </div>

            <div className="info-card" style={{ marginTop: '24px' }}>
              <div className="info-header" style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px', fontWeight: 'bold' }}>
                <span className="check-mini" style={{ width: '20px', height: '20px', background: 'var(--green)', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>✓</span>
                <span>Dispatch Tip</span>
              </div>
              <p style={{ fontSize: '0.9rem', color: '#64748b' }}>
                Keep pickup notes short and precise. Clear landmarks and unit numbers help riders
                move faster in dense areas.
              </p>
            </div>
          </aside>
        </div>

        <div className="form-card below-card" style={{ marginTop: '24px' }}>
          <div className="card-title">Pickup Notes</div>

          <div className="field-grid one-col">
            <label>
              <span>Delivery Notes</span>
              <input placeholder="e.g. Leave at reception and call rider on arrival" />
            </label>
            <div className="split-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
              <label>
                <span>Recipient Phone</span>
                <input placeholder="+1 (555) 000-0000" />
              </label>
              <label className="checkbox-wrap" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px', marginTop: '24px' }}>
                <input type="checkbox" style={{ width: '18px', height: '18px' }} />
                <span>Requires Signature on Delivery</span>
              </label>
            </div>
          </div>
        </div>
      </main>

    </div>
  );
}
