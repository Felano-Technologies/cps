export default function FAQPage() {
  return (
    <div className="page-shell light-shell">
      <main className="hero-section container" style={{ paddingTop: '64px', paddingBottom: '32px' }}>
        <div className="hero-copy" style={{ maxWidth: '800px' }}>
          <h1>Frequently Asked Questions</h1>
          <p style={{ fontSize: '1.2rem', color: 'var(--text)' }}>
            Everything you need to know about our logistics network, pricing, and how to get started.
          </p>
        </div>
      </main>

      <section className="container" style={{ marginTop: '32px', marginBottom: '80px', maxWidth: '800px', marginLeft: 'auto', marginRight: 'auto' }}>
        
        <style>{`
          .faq-details { background: #fff; border-radius: 16px; margin-bottom: 16px; box-shadow: 0 4px 12px rgba(15,23,42,0.03); overflow: hidden; }
          .faq-summary { padding: 24px; font-weight: 700; font-size: 1.1rem; color: var(--navy); cursor: pointer; list-style: none; display: flex; justify-content: space-between; align-items: center; }
          .faq-summary::-webkit-details-marker { display: none; }
          .faq-summary::after { content: '+'; font-size: 1.5rem; color: var(--lime); font-weight: 400; }
          .faq-details[open] .faq-summary::after { content: '−'; }
          .faq-content { padding: 0 24px 24px 24px; color: var(--text); line-height: 1.6; }
        `}</style>

        <details className="faq-details">
          <summary className="faq-summary">How do I track my shipment?</summary>
          <div className="faq-content">
            You can track your package directly from our homepage using the tracking ID provided when your order was dispatched. If you created an account, you can also view all your active shipments in your dashboard.
          </div>
        </details>

        <details className="faq-details">
          <summary className="faq-summary">What is the cutoff time for Same Day Delivery?</summary>
          <div className="faq-content">
            For same-day delivery, your request must be placed by 2:00 PM. Requests placed after 2:00 PM will automatically roll over to priority delivery the following morning.
          </div>
        </details>

        <details className="faq-details">
          <summary className="faq-summary">Do you provide packing materials?</summary>
          <div className="faq-content">
            Currently, items must be properly boxed or bagged before our rider arrives. For regular merchants, we can provide branded poly-mailers for an additional fee.
          </div>
        </details>

        <details className="faq-details">
          <summary className="faq-summary">What locations do you currently cover?</summary>
          <div className="faq-content">
            Our primary operations network covers the greater Kumasi area, including Ayeduase, KNUST, and surrounding zones. For bulk freight, we can arrange inter-city transport upon request.
          </div>
        </details>

      </section>
    </div>
  );
}
