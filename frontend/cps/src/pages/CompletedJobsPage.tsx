export default function CompletedJobsPage() {
  return (
    <div className="page-shell route-shell" style={{ padding: '24px' }}>
      <div className="route-card">
        <div className="route-header-row">
          <h2>Completed Jobs</h2>
        </div>
        <div style={{ marginTop: '20px' }}>
          <p>Placeholder for the rider's job history and ratings.</p>
          <div className="stop-item">
            <div className="stop-number">✓</div>
            <div className="stop-copy">
              <div className="stop-address">Job #9011</div>
              <div className="stop-detail">Completed Today, 2:15 PM</div>
            </div>
          </div>
          <div className="stop-item">
            <div className="stop-number">✓</div>
            <div className="stop-copy">
              <div className="stop-address">Job #8820</div>
              <div className="stop-detail">Completed Yesterday, 4:30 PM</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
