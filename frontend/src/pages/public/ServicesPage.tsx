import { Link } from 'react-router-dom';
import { Zap, Rocket, Truck, Boxes, ArrowRight } from 'lucide-react';
import { useReveal } from '../../hooks/useReveal';
import '../../styles/services.css';

const SERVICES = [
  {
    icon: Zap,
    title: 'Same Day Delivery',
    text: 'When it absolutely has to be there today. Fast, point-to-point courier runs.',
    to: '/services/same-day',
  },
  {
    icon: Rocket,
    title: 'Express Delivery',
    text: 'Skip the queue. Guaranteed priority routing and zero stops between pickup and destination.',
    to: '/services/express',
  },
  {
    icon: Truck,
    title: 'Standard Delivery',
    text: 'Reliable, cost-effective everyday delivery. Perfect for regular e-commerce orders.',
    to: '/services/standard',
  },
  {
    icon: Boxes,
    title: 'Bulk Delivery',
    text: 'High-volume shipping solutions for B2B logistics, warehouse transfers, and oversized cargo.',
    to: '/services/bulk',
  },
];

function ServiceCard({ icon: Icon, title, text, to }: (typeof SERVICES)[number]) {
  const { ref, className } = useReveal<HTMLElement>();
  return (
    <article ref={ref} className={`service-offer-card ${className}`}>
      <span className="service-offer-icon"><Icon size={24} /></span>
      <h3>{title}</h3>
      <p>{text}</p>
      <Link to={to} className="service-offer-link">
        Learn More <ArrowRight size={15} />
      </Link>
    </article>
  );
}

export default function ServicesPage() {
  return (
    <div className="page-shell light-shell">
      <main className="services-hero container">
        <h1>Logistics solutions for every need.</h1>
        <p className="lede">
          From single documents to multi-ton freight, our platform and fleet are equipped to handle your
          delivery requirements across Ghana.
        </p>
      </main>

      <section className="services-grid-wrap container">
        <div className="services-cards-grid">
          {SERVICES.map(service => (
            <ServiceCard key={service.title} {...service} />
          ))}
        </div>
      </section>
    </div>
  );
}
