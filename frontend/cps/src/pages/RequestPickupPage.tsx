
export default function RequestPickupPage() {
  return (
    <div className="page-shell light-shell">
      
      <main className="create-shell container">
        <h1>Create Delivery</h1>
        <p className="muted-text">Enter pickup and drop-off details to dispatch a rider.</p>

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

            <div className="field-grid two-col">
              <label>
                <span>Pickup Name</span>
                <input value="2.5" readOnly />
              </label>
              <label>
                <span>Service Type</span>
                <select value="Motorbike Courier">
                  <option value="Motorbike Courier">Motorbike Courier</option>
                </select>
              </label>
            </div>

            <div className="field-grid three-col">
              <label>
                <span>Pickup Area</span>
                <input value="Central District" readOnly />
              </label>
              <label>
                <span>Drop-off Area</span>
                <input value="North Quarter" readOnly />
              </label>
              <label>
                <span>Priority</span>
                <input value="Express" readOnly />
              </label>
            </div>
          </div>

          <aside className="side-stack">
            <div className="summary-card">
              <div className="card-title">Summary</div>
              <div className="summary-row"><span>Pickup</span><strong>Central District</strong></div>
              <div className="summary-row"><span>Drop-off</span><strong>North Quarter</strong></div>
              <div className="summary-row"><span>ETA</span><strong>18 min</strong></div>
              <button className="primary-green wide-btn">Dispatch Rider →</button>
              <button className="neutral-btn">Save Draft</button>
            </div>

            <div className="info-card">
              <div className="info-header">
                <span className="check-mini">✓</span>
                <span>Dispatch Tip</span>
              </div>
              <p>
                Keep pickup notes short and precise. Clear landmarks and unit numbers help riders
                move faster in dense areas.
              </p>
            </div>
          </aside>
        </div>

        <div className="form-card below-card">
          <div className="card-title">Pickup Notes</div>

          <div className="field-grid one-col">
            <label>
              <span>Delivery Notes</span>
              <input value="Leave at reception and call rider on arrival" readOnly />
            </label>
            <div className="split-row">
              <label>
                <span>Recipient Phone</span>
                <input value="+44 7000 000000" readOnly />
              </label>
              <label className="checkbox-wrap">
                <input type="checkbox" checked readOnly />
                <span>Requires Signature</span>
              </label>
            </div>
          </div>
        </div>
      </main>

      <footer className="footer-bar black-footer">
        <div className="brand-title small-brand">CPS Delivery Services</div>
        <div className="footer-links">
          <span>Service Terms</span>
          <span>Support</span>
          <span>Coverage</span>
          <span>Contact</span>
        </div>
        <span>© 2026 CPS Delivery Services. All rights reserved.</span>
      </footer>
    </div>
  );
}
