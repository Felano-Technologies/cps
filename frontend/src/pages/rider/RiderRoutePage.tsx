import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProofOfDeliveryModal from '../../components/ProofOfDeliveryModal';
import ReportIssueModal from '../../components/ReportIssueModal';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';
import type { PodMethod, Shipment } from '../../types/models';

interface RouteStop {
  id: string;
  address: string;
  details: string;
  parcels: number;
  status: 'pending' | 'active' | 'completed' | 'failed';
  contact: string;
}

function mapShipmentsToStops(shipments: Shipment[]): RouteStop[] {
  const sorted = [...shipments].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  let activeAssigned = false;

  return sorted.map(shipment => {
    let status: RouteStop['status'];
    if (shipment.status === 'delivered') {
      status = 'completed';
    } else if (shipment.status === 'failed' || shipment.status === 'cancelled') {
      status = 'failed';
    } else if (!activeAssigned) {
      status = 'active';
      activeAssigned = true;
    } else {
      status = 'pending';
    }

    return {
      id: shipment.id,
      address: shipment.dropoffLocation,
      details: shipment.additionalInstructions || shipment.pickupLocation || '',
      parcels: 1,
      status,
      contact: shipment.receiverNumber,
    };
  });
}

export default function RiderRoutePage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [podOpen, setPodOpen] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);

  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    let isMounted = true;

    async function fetchShipments() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await api.get<Shipment[]>('/shipments');
        if (isMounted) {
          setShipments(response.data);
        }
      } catch {
        if (isMounted) {
          setError('Failed to load your route. Please try again later.');
          toast.error('Failed to load your route.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchShipments();

    return () => {
      isMounted = false;
    };
  }, []);

  const stops = mapShipmentsToStops(shipments);
  const activeStop = stops.find(s => s.status === 'active');
  const allCompleted = stops.length > 0 && stops.every(s => s.status === 'completed' || s.status === 'failed');

  const handlePodSubmit = async (method: PodMethod, recipientName: string) => {
    if (!activeStop) return;
    try {
      const response = await api.patch<Shipment>(`/shipments/${activeStop.id}/pod`, {
        podMethod: method,
        podRecipientName: recipientName,
      });
      setShipments(prev => prev.map(s => (s.id === activeStop.id ? response.data : s)));
      setPodOpen(false);
      toast.success('Delivery confirmed.');
    } catch {
      setError('Failed to submit proof of delivery. Please try again.');
      toast.error('Failed to confirm delivery.');
    }
  };

  const handleIssueSubmit = async (reason: string) => {
    if (!activeStop) return;
    try {
      const response = await api.patch<Shipment>(`/shipments/${activeStop.id}/status`, {
        status: 'delayed',
        note: reason,
      });
      setShipments(prev => prev.map(s => (s.id === activeStop.id ? response.data : s)));
      setIssueOpen(false);
      toast.success('Issue reported.');
    } catch {
      setError('Failed to report issue. Please try again.');
      toast.error('Failed to report issue.');
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0f172a', color: '#fff', fontWeight: 700 }}>
        Loading your route…
      </div>
    );
  }

  if (error && shipments.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0f172a', padding: '24px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
        <p style={{ color: '#f87171', fontWeight: 700, marginBottom: '24px' }}>{error}</p>
        <button
          onClick={() => navigate('/rider-board')}
          style={{ background: '#22c55e', color: '#fff', border: 'none', padding: '14px 28px', borderRadius: '16px', fontWeight: 800, fontSize: '16px' }}
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  if (allCompleted) {
    return (
      <div className="page-shell light-shell" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0f172a', padding: '24px' }}>
        <div style={{ fontSize: '64px', marginBottom: '24px' }}>🏁</div>
        <h1 style={{ color: '#fff', margin: '0 0 16px 0' }}>Route Complete!</h1>
        <p style={{ color: '#94a3b8', textAlign: 'center', marginBottom: '32px' }}>Great job. All stops for Route 42A have been serviced.</p>
        <button
          onClick={() => navigate('/rider-board')}
          style={{ background: '#22c55e', color: '#fff', border: 'none', padding: '16px 32px', borderRadius: '16px', fontWeight: 800, fontSize: '18px' }}
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', background: '#e2e8f0', overflow: 'hidden' }}>

      {/* Mock Map Background */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url("https://www.transparenttextures.com/patterns/cubes.png")', backgroundSize: '100px', backgroundColor: '#e2e8f0', opacity: 0.8 }} />

      {/* Route Path Mock SVG */}
      <svg style={{ position: 'absolute', top: '10%', left: '10%', width: '80%', height: '50%', pointerEvents: 'none' }}>
        <path d="M 10 10 Q 150 150 300 50 T 600 200" fill="none" stroke="#3b82f6" strokeWidth="8" strokeDasharray="16 16" />
        <circle cx="300" cy="50" r="12" fill="#ef4444" stroke="#fff" strokeWidth="4" />
        <circle cx="600" cy="200" r="12" fill="#94a3b8" stroke="#fff" strokeWidth="4" />
      </svg>

      {/* Top HUD */}
      <div style={{ position: 'absolute', top: '24px', left: '16px', right: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 10 }}>
        <button onClick={() => navigate('/rider-board')} style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#fff', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          ←
        </button>
        <div style={{ background: '#fff', padding: '12px 24px', borderRadius: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontWeight: 800, color: '#0f172a' }}>
          Route 42A
        </div>
        <button style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#fff', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
          SOS
        </button>
      </div>

      {/* Inline error banner for action failures */}
      {error && (
        <div style={{ position: 'absolute', top: '84px', left: '16px', right: '16px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '16px', padding: '12px 16px', fontWeight: 700, fontSize: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', zIndex: 15, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <span>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'transparent', border: 'none', color: '#991b1b', fontWeight: 800, cursor: 'pointer', fontSize: '16px' }}>✕</button>
        </div>
      )}

      {/* Navigation Directions HUD */}
      <div style={{ position: 'absolute', top: '90px', left: '16px', right: '16px', background: '#1e293b', borderRadius: '16px', padding: '16px', display: 'flex', alignItems: 'center', gap: '16px', color: '#fff', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', zIndex: 10 }}>
        <div style={{ fontSize: '32px', color: '#34d399' }}>↱</div>
        <div>
          <div style={{ fontSize: '24px', fontWeight: 800 }}>In 500m</div>
          <div style={{ fontSize: '16px', color: '#cbd5e1' }}>Turn right onto 1st Ave</div>
        </div>
      </div>

      {/* Bottom Sheet - Active Stop */}
      {activeStop && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, background: '#fff',
          borderTopLeftRadius: '32px', borderTopRightRadius: '32px',
          padding: '24px', paddingBottom: '48px', boxShadow: '0 -8px 32px rgba(15, 23, 42, 0.1)', zIndex: 20,
          animation: 'slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
        }}>
          <div style={{ width: '40px', height: '6px', background: '#e2e8f0', borderRadius: '3px', margin: '0 auto 24px' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <div style={{ color: '#078c35', fontWeight: 800, fontSize: '12px', letterSpacing: '0.05em', marginBottom: '4px' }}>NEXT STOP</div>
              <h2 style={{ margin: 0, fontSize: '28px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>{activeStop.address}</h2>
              <div style={{ color: '#64748b', fontSize: '15px', marginTop: '4px' }}>{activeStop.details}</div>
            </div>
            <div style={{ background: '#f1f5f9', padding: '8px 12px', borderRadius: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>{activeStop.parcels}</div>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Pkg</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
            <a href={`tel:${activeStop.contact}`} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', color: '#0f172a', textDecoration: 'none', fontWeight: 700 }}>
              📞 Call
            </a>
            <button onClick={() => setIssueOpen(true)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', color: '#ef4444', fontWeight: 700, cursor: 'pointer' }}>
              ⚠️ Issue
            </button>
          </div>

          <button
            onClick={() => setPodOpen(true)}
            style={{ width: '100%', background: '#078c35', color: '#fff', padding: '20px', borderRadius: '16px', border: 'none', fontSize: '20px', fontWeight: 800, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', boxShadow: '0 8px 24px rgba(7, 140, 53, 0.25)', cursor: 'pointer' }}
          >
            Arrived & Deliver
            <span style={{ fontSize: '24px' }}>→</span>
          </button>
        </div>
      )}

      {podOpen && activeStop && (
        <ProofOfDeliveryModal
          stopAddress={activeStop.address}
          onClose={() => setPodOpen(false)}
          onSubmit={handlePodSubmit}
        />
      )}

      {issueOpen && activeStop && (
        <ReportIssueModal
          stopAddress={activeStop.address}
          onClose={() => setIssueOpen(false)}
          onSubmit={handleIssueSubmit}
        />
      )}
    </div>
  );
}
