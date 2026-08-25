export default function ContactPage() {
  return (
    <div className="page-shell light-shell">
      <main className="hero-section container" style={{ paddingTop: '64px', paddingBottom: '32px' }}>
        <div className="hero-copy" style={{ maxWidth: '800px' }}>
          <h1>Get in touch.</h1>
          <p style={{ fontSize: '1.2rem', color: 'var(--text)' }}>
            Have a question about our services or need help with an active shipment? Our support team is here for you.
          </p>
        </div>
      </main>

      <section className="container" style={{ marginTop: '32px', marginBottom: '80px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '48px' }}>
        
        <div className="contact-form-card" style={{ background: '#fff', padding: '40px', borderRadius: '24px', boxShadow: '0 12px 40px rgba(15,23,42,0.06)' }}>
          <h3 style={{ marginBottom: '24px', fontSize: '1.5rem', color: 'var(--navy)' }}>Send us a message</h3>
          <form style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="input-shell" style={{ width: '100%' }}>
              <input placeholder="Your Name" style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', padding: '16px 0', fontFamily: 'inherit' }} />
            </div>
            <div className="input-shell" style={{ width: '100%' }}>
              <input type="email" placeholder="Your Email" style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', padding: '16px 0', fontFamily: 'inherit' }} />
            </div>
            <div className="input-shell" style={{ width: '100%' }}>
              <textarea placeholder="How can we help?" style={{ width: '100%', minHeight: '120px', border: 'none', background: 'transparent', outline: 'none', padding: '16px 0', fontFamily: 'inherit', resize: 'vertical' }}></textarea>
            </div>
            <button type="button" className="primary-green track-btn" style={{ padding: '16px', borderRadius: '12px', fontWeight: 700, marginTop: '8px', cursor: 'pointer', border: 'none' }}>Send Message</button>
          </form>
        </div>

        <div>
          <h3 style={{ marginBottom: '24px', fontSize: '1.5rem', color: 'var(--navy)' }}>Direct Contact</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <strong style={{ display: 'block', color: 'var(--navy)', marginBottom: '4px' }}>Phone & WhatsApp</strong>
              <a href="tel:+233534583364" style={{ color: 'var(--text)', textDecoration: 'none' }}>+233 53 458 3364</a>
            </div>
            <div>
              <strong style={{ display: 'block', color: 'var(--navy)', marginBottom: '4px' }}>Email Support</strong>
              <a href="mailto:cpsdeliverygh@gmail.com" style={{ color: 'var(--text)', textDecoration: 'none' }}>cpsdeliverygh@gmail.com</a>
            </div>
            <div>
              <strong style={{ display: 'block', color: 'var(--navy)', marginBottom: '4px' }}>Office Address</strong>
              <span style={{ color: 'var(--text)' }}>CPS Delivery Hub<br/>Ayeduase Gate<br/>Near KNUST, Kumasi</span>
            </div>
            <div>
              <strong style={{ display: 'block', color: 'var(--navy)', marginBottom: '4px' }}>Operating Hours</strong>
              <span style={{ color: 'var(--text)' }}>Monday - Friday: 8:00 AM - 5:00 PM</span>
            </div>
          </div>
        </div>

      </section>
    </div>
  );
}
