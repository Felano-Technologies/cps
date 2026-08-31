import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Printer, Plus, Package, Bike, Truck, AlertTriangle, Banknote } from 'lucide-react';
import api from '../../services/api';
import OrderPrintModal from '../../components/OrderPrintModal';
import CreateOrderModal from '../../components/CreateOrderModal';
import { useToast } from '../../contexts/ToastContext';
import type { Shipment, RiderProfile } from '../../types/models';

const AUTO_REFRESH_INTERVAL_MS = 60000; // 1 minute

export default function LiveOpsBoardPage() {
  const toast = useToast();
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [orders, setOrders] = useState<Shipment[]>([]);
  const [riders, setRiders] = useState<RiderProfile[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchOrders(isInitial = false) {
      try {
        const response = await api.get<Shipment[]>('/shipments');
        if (isMounted) {
          setOrders(response.data);
          setError(null);
        }
      } catch {
        if (isMounted && isInitial) {
          setError('Failed to load orders. Please try again later.');
          toast.error('Failed to load orders.');
        }
      }
    }

    fetchOrders(true);
    const interval = setInterval(() => fetchOrders(false), AUTO_REFRESH_INTERVAL_MS);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function fetchRiders(isInitial = false) {
      try {
        const response = await api.get<RiderProfile[]>('/riders');
        if (isMounted) {
          setRiders(response.data);
        }
      } catch {
        if (isMounted && isInitial) {
          toast.error('Failed to load fleet.');
        }
      }
    }

    fetchRiders(true);
    const interval = setInterval(() => fetchRiders(false), AUTO_REFRESH_INTERVAL_MS);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const newOrderCount = useMemo(
    () => orders.filter(o => o.status === 'awaiting_price').length,
    [orders]
  );
  const activeOrderCount = useMemo(
    () => orders.filter(o => ['pending', 'picked_up', 'in_transit', 'out_for_delivery'].includes(o.status)).length,
    [orders]
  );
  const availableRiderCount = useMemo(
    () => riders.filter(r => r.currentStatus === 'available').length,
    [riders]
  );
  const delayedOrderCount = useMemo(
    () => orders.filter(o => o.status === 'delayed').length,
    [orders]
  );

  return (
    <div className="page-shell light-shell">
      <style>{`
        .glass-card {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.8);
          box-shadow: 0 8px 32px rgba(15, 23, 42, 0.05);
          border-radius: 16px;
        }

        .dashboard-main-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
          padding: 0 24px;
          align-items: start;
        }
        
        .kpi-link-card {
          text-decoration: none;
          color: inherit;
          transition: transform 0.2s, box-shadow 0.2s;
          display: block;
        }
        .kpi-link-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 40px rgba(15, 23, 42, 0.1);
        }

        @media (max-width: 1024px) {
          .dashboard-main-grid {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 768px) {
          .kpi-row, .header-row, .dashboard-main-grid {
            padding: 0 16px !important;
          }
        }
      `}</style>

      <main className="container" style={{ padding: '32px 0', maxWidth: '1400px' }}>

        {/* Header Section */}
        <div className="header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '32px', padding: '0 24px' }}>
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', marginBottom: '8px', letterSpacing: '-0.02em' }}>Operations Command Center</h1>
            <p className="muted-text" style={{ fontSize: '16px', color: '#64748b' }}>Live overview of riders, active orders, and delivery progress.</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              className="neutral-btn"
              style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 700, borderRadius: '12px' }}
              onClick={() => setIsPrintModalOpen(true)}
            >
              <Printer size={18} /> Print Receipt
            </button>
            <button
              className="primary-green"
              style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 700, borderRadius: '12px' }}
              onClick={() => setIsCreateModalOpen(true)}
            >
              <Plus size={18} /> New Order
            </button>
          </div>
        </div>

        {error && (
          <div style={{ margin: '0 24px 24px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '12px', padding: '12px 16px', fontWeight: 600, fontSize: '14px' }}>
            {error}
          </div>
        )}

        {/* KPI Row */}
        <div className="kpi-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', marginBottom: '32px', padding: '0 24px' }}>
          
          <Link to="/ops/new-orders" className="glass-card kpi-link-card" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>New Orders</div>
              <div style={{ fontSize: '36px', fontWeight: 800, color: newOrderCount > 0 ? '#ea580c' : '#0f172a', marginTop: '8px' }}>{newOrderCount}</div>
            </div>
            <div style={{ width: '48px', height: '48px', background: '#fff7ed', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c2410c' }}>
              <Package size={22} />
            </div>
          </Link>

          <Link to="/ops/active-orders" className="glass-card kpi-link-card" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Orders</div>
              <div style={{ fontSize: '36px', fontWeight: 800, color: '#0f172a', marginTop: '8px' }}>{activeOrderCount}</div>
            </div>
            <div style={{ width: '48px', height: '48px', background: '#e0ffe0', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#078c35' }}>
              <Truck size={22} />
            </div>
          </Link>

          <Link to="/fleet" className="glass-card kpi-link-card" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Available Fleet</div>
              <div style={{ fontSize: '36px', fontWeight: 800, color: '#0f172a', marginTop: '8px' }}>{availableRiderCount}</div>
            </div>
            <div style={{ width: '48px', height: '48px', background: '#e0ffe0', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#078c35' }}>
              <Bike size={22} />
            </div>
          </Link>

          <div className="glass-card" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Delayed Orders</div>
              <div style={{ fontSize: '36px', fontWeight: 800, color: delayedOrderCount > 0 ? 'var(--warning)' : '#0f172a', marginTop: '8px' }}>{delayedOrderCount}</div>
            </div>
            <div style={{ width: '48px', height: '48px', background: 'var(--warning-bg)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--warning)' }}>
              <AlertTriangle size={22} />
            </div>
          </div>

          <Link to="/ops/deductions" className="glass-card kpi-link-card" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rider Deductions</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#dc2626', marginTop: '8px' }}>Manage Fines</div>
            </div>
            <div style={{ width: '48px', height: '48px', background: '#fef2f2', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
              <Banknote size={22} />
            </div>
          </Link>
        </div>

        {isPrintModalOpen && <OrderPrintModal onClose={() => setIsPrintModalOpen(false)} />}
        {isCreateModalOpen && (
          <CreateOrderModal
            onClose={() => setIsCreateModalOpen(false)}
            onCreate={(shipment) => {
              setOrders(prev => [shipment, ...prev]);
              setIsCreateModalOpen(false);
              toast.success('Order created.');
            }}
          />
        )}
      </main>
    </div>
  );
}
