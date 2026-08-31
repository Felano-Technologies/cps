import { Link } from 'react-router-dom';
import {
  Zap,
  Rocket,
  Truck,
  Boxes,
  ArrowRight,
  MapPin,
  Clock,
  Globe,
  PackagePlus,
} from 'lucide-react';
import { useReveal } from '../../hooks/useReveal';
import '../../styles/services.css';

const SERVICES = [
  {
    icon: Zap,
    title: 'Same Day Delivery',
    text: 'When it absolutely has to be there today. Fast, point-to-point courier runs across Kumasi and express regional routes.',
    to: '/services/same-day',
  },
  {
    icon: Rocket,
    title: 'Express Delivery',
    text: 'Skip the queue. Guaranteed priority routing and zero unnecessary stops between pickup and destination.',
    to: '/services/express',
  },
  {
    icon: Truck,
    title: 'Standard Delivery',
    text: 'Reliable, cost-effective everyday delivery. Perfect for regular e-commerce orders, retail packages, and documents.',
    to: '/services/standard',
  },
  {
    icon: Boxes,
    title: 'Bulk & Business Delivery',
    text: 'High-volume shipping solutions for B2B logistics, multi-drop batch deliveries, and merchant warehouse fulfillment.',
    to: '/services/bulk',
  },
];

interface RegionZone {
  id: string;
  name: string;
  isPickupHub: boolean;
  badge: string;
  badgeBg: string;
  badgeColor: string;
  transitTime: string;
  serviceType: string;
  description: string;
}

const REGIONS_DATA: RegionZone[] = [
  {
    id: 'kumasi',
    name: 'Kumasi',
    isPickupHub: true,
    badge: 'Sole Pickup Hub & Local Delivery',
    badgeBg: '#dcfce7',
    badgeColor: '#15803d',
    transitTime: '1 – 3 Hours / Same-Day',
    serviceType: 'Doorstep Pickup & Intra-City Delivery',
    description: 'Our primary operational hub. We pick up parcels directly from your doorstep anywhere in Kumasi and deliver locally or dispatch to our 4 regional destinations.',
  },
  {
    id: 'accra',
    name: 'Accra',
    isPickupHub: false,
    badge: 'Regional Delivery Destination',
    badgeBg: '#e0f2fe',
    badgeColor: '#0369a1',
    transitTime: 'Same-Day / Next-Day (24 Hours)',
    serviceType: 'Inter-City Express Delivery',
    description: 'Packages picked up in Kumasi are dispatched daily for fast, secure delivery across all areas in Accra.',
  },
  {
    id: 'sunyani',
    name: 'Sunyani',
    isPickupHub: false,
    badge: 'Regional Delivery Destination',
    badgeBg: '#f3e8ff',
    badgeColor: '#7e22ce',
    transitTime: 'Next-Day (24 Hours)',
    serviceType: 'Middle Belt Regional Delivery',
    description: 'Packages picked up in Kumasi are dispatched directly for next-day delivery to recipients across Sunyani.',
  },
  {
    id: 'takoradi',
    name: 'Takoradi',
    isPickupHub: false,
    badge: 'Regional Delivery Destination',
    badgeBg: '#fef3c7',
    badgeColor: '#b45309',
    transitTime: 'Next-Day (24 – 48 Hours)',
    serviceType: 'Western Coast Express Delivery',
    description: 'Packages picked up in Kumasi are safely delivered to commercial and residential addresses in Takoradi.',
  },
  {
    id: 'tamale',
    name: 'Tamale',
    isPickupHub: false,
    badge: 'Regional Delivery Destination',
    badgeBg: '#ffedd5',
    badgeColor: '#c2410c',
    transitTime: 'Next-Day (24 – 48 Hours)',
    serviceType: 'Northern Regional Delivery',
    description: 'Packages picked up in Kumasi are dispatched on scheduled routes for secure delivery across Tamale.',
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
      <style>{`
        .locations-banner {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          border-radius: 24px;
          padding: 44px 40px;
          color: white;
          position: relative;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(15, 23, 42, 0.15);
          margin-bottom: 32px;
        }
        .locations-banner::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px);
          background-size: 24px 24px;
          opacity: 0.6;
        }
        .pickup-notice-card {
          background: #f0fdf4;
          border: 2px solid #86efac;
          border-radius: 18px;
          padding: 24px 28px;
          display: flex;
          align-items: center;
          gap: 20px;
          margin-bottom: 36px;
          box-shadow: 0 4px 16px rgba(7, 140, 53, 0.06);
        }
        .region-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          padding: 28px;
          display: flex;
          flex-direction: column;
          gap: 18px;
          box-shadow: 0 4px 20px rgba(15, 23, 42, 0.04);
          transition: all 0.25s ease;
        }
        .region-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 16px 36px rgba(15, 23, 42, 0.08);
          border-color: #cbd5e1;
        }
        .region-card.hub-card {
          border: 2px solid #86efac;
          background: linear-gradient(180deg, #ffffff 0%, #f9fefb 100%);
        }
      `}</style>

      {/* Services Overview Header */}
      <main className="services-hero container">
        <h1>Logistics solutions for every need.</h1>
        <p className="lede">
          From single on-demand pickups in Kumasi to express courier runs across our 5 service regions in Ghana, our fleet delivers
          every package safely, quickly, and with verified proof of delivery.
        </p>
      </main>

      {/* Services Grid */}
      <section className="services-grid-wrap container" style={{ paddingBottom: '32px' }}>
        <div className="services-cards-grid">
          {SERVICES.map(service => (
            <ServiceCard key={service.title} {...service} />
          ))}
        </div>
      </section>

      {/* 5 Delivery Regions Section */}
      <section className="container" style={{ padding: '32px 24px 80px' }}>
        <div className="locations-banner">
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '24px' }}>
            <div style={{ maxWidth: '640px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(7, 140, 53, 0.2)', color: '#86efac', border: '1px solid rgba(134, 239, 172, 0.3)', padding: '6px 14px', borderRadius: '30px', fontSize: '13px', fontWeight: 700, marginBottom: '14px' }}>
                <Globe size={15} /> 5 Regional Service Locations
              </div>
              <h2 style={{ fontSize: 'clamp(2rem, 3.4vw, 2.8rem)', fontWeight: 800, margin: '0 0 12px', color: '#ffffff', letterSpacing: '-0.02em' }}>
                Our Delivery Regions
              </h2>
              <p style={{ color: '#cbd5e1', fontSize: '16px', lineHeight: 1.6, margin: 0 }}>
                We provide fast, reliable, and insured courier operations connecting our 5 service regions across Ghana.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '220px' }}>
              <Link
                to="/request-pickup"
                className="primary-green"
                style={{
                  padding: '14px 24px',
                  borderRadius: '12px',
                  fontWeight: 800,
                  fontSize: '15px',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 8px 24px rgba(7, 140, 53, 0.35)',
                }}
              >
                <PackagePlus size={18} /> Request Pickup Now
              </Link>
            </div>
          </div>
        </div>

        {/* Clear Notice: Kumasi Pickup Only */}
        <div className="pickup-notice-card">
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#dcfce7', color: '#078c35', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <MapPin size={26} />
          </div>
          <div>
            <div style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
              Important Pickup Information
            </div>
            <p style={{ margin: 0, fontSize: '15px', color: '#334155', lineHeight: 1.5 }}>
              <strong>Kumasi is our sole pickup location.</strong> We collect parcels directly from your doorstep anywhere in <strong>Kumasi</strong>, and deliver locally within Kumasi or dispatch to <strong>Accra, Sunyani, Takoradi, and Tamale</strong>.
            </p>
          </div>
        </div>

        {/* 5 Regions Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
          {REGIONS_DATA.map(region => (
            <article key={region.id} className={`region-card ${region.isPickupHub ? 'hub-card' : ''}`}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 800,
                      background: region.badgeBg,
                      color: region.badgeColor,
                      padding: '4px 10px',
                      borderRadius: '8px',
                      letterSpacing: '0.02em',
                    }}
                  >
                    {region.badge}
                  </span>

                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#078c35', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={13} /> {region.transitTime}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <MapPin size={22} color={region.isPickupHub ? '#078c35' : '#0f172a'} />
                  <h3 style={{ margin: 0, fontSize: '26px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
                    {region.name}
                  </h3>
                </div>

                <div style={{ fontSize: '13px', fontWeight: 700, color: region.isPickupHub ? '#078c35' : '#64748b', marginBottom: '12px' }}>
                  {region.serviceType}
                </div>

                <p style={{ margin: 0, color: '#475569', fontSize: '14px', lineHeight: 1.55 }}>
                  {region.description}
                </p>
              </div>

              <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Link
                  to="/request-pickup"
                  style={{
                    fontSize: '14px',
                    fontWeight: 800,
                    color: '#078c35',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {region.isPickupHub ? 'Request Local Pickup in Kumasi' : `Send Parcel to ${region.name}`} <ArrowRight size={15} />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
