export default function DeliveryDetailsPage() {
  return (
    <div className="page-shell route-shell" style={{ padding: '24px' }}>
      <div className="route-card">
        <div className="route-header-row">
          <h2>Job #9982</h2>
          <button className="neutral-btn small">Back</button>
        </div>
        <div style={{ marginTop: '20px' }}>
          <h3>Delivery Details</h3>
          <p>This is a placeholder for the mobile-first delivery details screen where riders can view specific instructions, collect signatures, and mark a job as complete.</p>
          <div style={{ marginTop: '24px' }}>
            <button className="primary-green wide-btn">Mark as Delivered</button>
          </div>
        </div>
      </div>
    </div>
  );
}
