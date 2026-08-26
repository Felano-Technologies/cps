import { Link } from 'react-router-dom';
import { Building2, Target, Route, Zap, ShieldCheck, MapPin, ArrowRight } from 'lucide-react';
import { useReveal } from '../../hooks/useReveal';
import '../../styles/about.css';

const VALUES = [
  {
    icon: Zap,
    title: 'Fast',
    text: 'Same-day pickups and rapid dispatch, so orders move the moment they are placed.',
  },
  {
    icon: ShieldCheck,
    title: 'Reliable',
    text: 'Every stop is tracked and confirmed, so packages arrive when they were promised.',
  },
  {
    icon: MapPin,
    title: 'Local',
    text: 'A Kumasi-based team and rider network that knows the city and its streets.',
  },
];

export default function AboutPage() {
  const { ref: pillarsRef, className: pillarsClass } = useReveal<HTMLDivElement>();
  const { ref: valuesRef, className: valuesClass } = useReveal<HTMLDivElement>();
  const { ref: ctaRef, className: ctaClass } = useReveal<HTMLDivElement>();

  return (
    <div className="page-shell light-shell">
      <main className="about-hero container">
        <span className="hero-eyebrow">
          <Building2 size={14} />
          About CPS
        </span>
        <h1>Building the infrastructure for local commerce.</h1>
        <p className="lede">
          CPS Delivery Services was founded to solve the hardest problem in local retail: getting products
          into the hands of customers quickly, reliably, and affordably.
        </p>
      </main>

      <div ref={pillarsRef} className={`about-pillars container ${pillarsClass}`}>
        <article className="about-pillar">
          <span className="pillar-icon"><Target size={22} /></span>
          <h2>Our Mission</h2>
          <p>
            We believe that local businesses shouldn't be held back by complex logistics. Our platform
            empowers sellers across Ghana to offer rapid delivery speeds to their customers, powered by a
            robust fleet of local riders and drivers.
          </p>
        </article>
        <article className="about-pillar">
          <span className="pillar-icon"><Route size={22} /></span>
          <h2>The Network</h2>
          <p>
            What started as a small fleet has grown into a city-wide operations network. From our Kumasi
            logistics hub, we coordinate hundreds of daily routes, ensuring packages are picked up and
            dropped off precisely when promised.
          </p>
        </article>
      </div>

      <section ref={valuesRef} className={`about-values container ${valuesClass}`}>
        <div className="about-values-heading">
          <h2>What we stand for</h2>
          <p>The three things every delivery on our network is built around.</p>
        </div>
        <div className="about-values-grid">
          {VALUES.map(({ icon: Icon, title, text }) => (
            <div className="about-value" key={title}>
              <span className="pillar-icon"><Icon size={18} /></span>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </section>

      <div ref={ctaRef} className={`about-cta ${ctaClass}`}>
        <div>
          <h2>Ready to ship with us?</h2>
          <p>Create an account or reach out to our team to get started.</p>
        </div>
        <div className="about-cta-actions">
          <Link to="/signup" className="primary-green">
            Get Started <ArrowRight size={16} />
          </Link>
          <Link to="/contact" className="neutral-btn" style={{ background: 'transparent', borderColor: 'rgba(255,255,255,0.3)', color: '#fff' }}>
            Contact Us
          </Link>
        </div>
      </div>
    </div>
  );
}
