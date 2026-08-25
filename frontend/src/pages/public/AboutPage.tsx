export default function AboutPage() {
  return (
    <div className="page-shell light-shell">
      <main className="hero-section container" style={{ paddingTop: '64px', paddingBottom: '32px' }}>
        <div className="hero-copy" style={{ maxWidth: '800px' }}>
          <h1>Building the infrastructure for local commerce.</h1>
          <p style={{ fontSize: '1.2rem', color: 'var(--text)' }}>
            CPS Delivery Services was founded to solve the hardest problem in local retail: getting products into the hands of customers quickly, reliably, and affordably.
          </p>
        </div>
      </main>

      <section className="container" style={{ marginTop: '32px', marginBottom: '80px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '48px' }}>
        <div>
          <h2 style={{ fontSize: '2rem', color: 'var(--navy)', marginBottom: '16px' }}>Our Mission</h2>
          <p style={{ fontSize: '1.1rem', lineHeight: '1.8', color: 'var(--text)' }}>
            We believe that local businesses shouldn't be held back by complex logistics. Our platform empowers sellers across Ghana to offer rapid delivery speeds to their customers, powered by a robust fleet of local riders and drivers.
          </p>
        </div>
        <div>
          <h2 style={{ fontSize: '2rem', color: 'var(--navy)', marginBottom: '16px' }}>The Network</h2>
          <p style={{ fontSize: '1.1rem', lineHeight: '1.8', color: 'var(--text)' }}>
            What started as a small fleet has grown into a city-wide operations network. From our Kumasi logistics hub, we coordinate hundreds of daily routes, ensuring packages are picked up and dropped off precisely when promised.
          </p>
        </div>
      </section>
    </div>
  );
}
