import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, AlertOctagon, X, Phone, AlertTriangle, ArrowRight, PackageX, PartyPopper, MapPin, Package, Wallet, Zap } from 'lucide-react';
import ProofOfDeliveryModal from '../../components/ProofOfDeliveryModal';
import ReportIssueModal from '../../components/ReportIssueModal';
import { useToast } from '../../contexts/ToastContext';
import { PageLoader } from '../../components/Spinner';
import api from '../../services/api';
import type { PodMethod, Shipment } from '../../types/models';

interface RouteStop {
  id: string;
  trackingCode: string;
  address: string;
  details: string;
  parcels: number;
  status: 'pending' | 'active' | 'completed' | 'failed';
  contact: string;
  senderName: string;
  senderNumber: string;
  receiverName: string;
  receiverNumber: string;
  pickupLocation: string;
  pickupRegion: string;
  dropoffRegion: string;
  dropoffKumasiSubArea: string | null;
  packageType: string;
  speed: string;
  priority: string;
  deliveryFee: string;
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
      trackingCode: shipment.trackingCode,
      address: shipment.dropoffLocation,
      details: shipment.additionalInstructions || shipment.pickupLocation || '',
      parcels: 1,
      status,
      contact: shipment.receiverNumber,
      senderName: shipment.senderName,
      senderNumber: shipment.senderNumber,
      receiverName: shipment.receiverName,
      receiverNumber: shipment.receiverNumber,
      pickupLocation: shipment.pickupLocation,
      pickupRegion: shipment.pickupRegion,
      dropoffRegion: shipment.dropoffRegion,
      dropoffKumasiSubArea: shipment.dropoffKumasiSubArea,
      packageType: shipment.packageType,
      speed: shipment.speed,
      priority: shipment.priority,
      deliveryFee: shipment.deliveryFee,
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

  const handlePodSubmit = async (method: PodMethod, recipientName: string, signatureData: string | null, photoUrl: string | null) => {
    if (!activeStop) return;
    try {
      const response = await api.patch<Shipment>(`/shipments/${activeStop.id}/pod`, {
        podMethod: method,
        podRecipientName: recipientName,
        podSignatureData: signatureData ?? undefined,
        podPhotoUrl: photoUrl ?? undefined,
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
      <div style={{ minHeight: '100vh', background: '#fff' }}>
        <PageLoader label="Loading your route…" minHeight="100vh" />
      </div>
    );
  }

  if (error && shipments.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#fff', padding: '24px', textAlign: 'center' }}>
        <div style={{ width: '96px', height: '96px', borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', color: '#ef4444' }}>
          <AlertTriangle size={40} />
        </div>
        <p style={{ color: '#991b1b', fontWeight: 700, marginBottom: '24px' }}>{error}</p>
        <button
          onClick={() => navigate('/rider-board')}
          style={{ background: '#078c35', color: '#fff', border: 'none', padding: '14px 28px', borderRadius: '16px', fontWeight: 800, fontSize: '16px' }}
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  if (stops.length === 0) {
    return (
      <div className="page-shell light-shell" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#fff', padding: '24px' }}>
        <div style={{ width: '96px', height: '96px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', color: '#64748b' }}>
          <PackageX size={40} />
        </div>
        <h1 style={{ color: '#0f172a', margin: '0 0 16px 0' }}>No Stops Assigned</h1>
        <p style={{ color: '#64748b', textAlign: 'center', marginBottom: '32px' }}>You don't have any deliveries assigned right now. Check back once operations assigns you a stop.</p>
        <button
          onClick={() => navigate('/rider-board')}
          style={{ background: '#078c35', color: '#fff', border: 'none', padding: '16px 32px', borderRadius: '16px', fontWeight: 800, fontSize: '18px' }}
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  if (allCompleted) {
    return (
      <div className="page-shell light-shell" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#fff', padding: '24px' }}>
        <div style={{ width: '96px', height: '96px', borderRadius: '50%', background: '#e0ffe0', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', color: '#078c35' }}>
          <PartyPopper size={40} />
        </div>
        <h1 style={{ color: '#0f172a', margin: '0 0 16px 0' }}>Route Complete!</h1>
        <p style={{ color: '#64748b', textAlign: 'center', marginBottom: '32px' }}>Great job. All your assigned stops have been serviced.</p>
        <button
          onClick={() => navigate('/rider-board')}
          style={{ background: '#078c35', color: '#fff', border: 'none', padding: '16px 32px', borderRadius: '16px', fontWeight: 800, fontSize: '18px' }}
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="page-shell light-shell" style={{ minHeight: '100vh', paddingBottom: activeStop ? '120px' : '24px' }}>

      {/* Top bar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)',
        padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0',
      }}>
        <button onClick={() => navigate('/rider-board')} style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#f1f5f9', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <ChevronLeft size={20} />
        </button>
        <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '16px' }}>Today's Route</div>
        <button onClick={() => activeStop && setIssueOpen(true)} disabled={!activeStop} style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#fef2f2', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', cursor: activeStop ? 'pointer' : 'not-allowed', opacity: activeStop ? 1 : 0.5 }}>
          <AlertOctagon size={18} />
        </button>
      </div>

      {error && (
        <div style={{ margin: '16px 20px 0', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '16px', padding: '12px 16px', fontWeight: 700, fontSize: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
          <span>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'transparent', border: 'none', color: '#991b1b', fontWeight: 800, cursor: 'pointer', display: 'flex' }}><X size={16} /></button>
        </div>
      )}

      {activeStop && (
        <main style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
            <div>
              <div style={{ color: '#078c35', fontWeight: 800, fontSize: '12px', letterSpacing: '0.05em', marginBottom: '4px', textTransform: 'uppercase' }}>Next Stop</div>
              <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>{activeStop.address}</h2>
              <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#64748b', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={14} /> {activeStop.dropoffRegion}
                {activeStop.dropoffKumasiSubArea && ` (${activeStop.dropoffKumasiSubArea === 'CampusAndEnvirons' ? 'KNUST Campus & Environs' : activeStop.dropoffKumasiSubArea})`}
              </p>
            </div>
            <div style={{ background: '#f1f5f9', padding: '8px 12px', borderRadius: '12px', textAlign: 'center', flexShrink: 0 }}>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>{activeStop.parcels}</div>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Pkg</div>
            </div>
          </div>

          {/* Order Details */}
          <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '16px', marginBottom: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '4px', borderBottom: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>{activeStop.trackingCode}</span>
              {activeStop.priority === 'high' && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 800, color: '#854d0e', background: '#fef9c3', padding: '3px 8px', borderRadius: '6px', letterSpacing: '0.03em' }}>
                  <Zap size={11} /> HIGH PRIORITY
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#e0ffe0', color: '#078c35', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><MapPin size={16} /></span>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Pickup</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{activeStop.pickupLocation}, {activeStop.pickupRegion}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#fef9c3', color: '#854d0e', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Package size={16} /></span>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Package</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', textTransform: 'capitalize' }}>{activeStop.packageType} · {activeStop.speed.replace('_', ' ')}</div>
              </div>
              <div style={{ marginLeft: 'auto', fontSize: '14px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Wallet size={14} /> GHS {Number(activeStop.deliveryFee).toFixed(2)}
              </div>
            </div>

            {activeStop.details && (
              <div style={{ fontSize: '13px', color: '#64748b', background: '#fff', borderRadius: '10px', padding: '10px 12px', border: '1px solid #e2e8f0' }}>
                <strong style={{ color: '#0f172a' }}>Note:</strong> {activeStop.details}
              </div>
            )}
          </div>

          {/* Order Contacts */}
          <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '16px', marginBottom: '16px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '16px', marginTop: 0 }}>Order Contacts</h3>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, marginBottom: '2px' }}>Sender</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>{activeStop.senderName}</div>
                <div style={{ fontSize: '14px', color: '#64748b' }}>{activeStop.senderNumber}</div>
              </div>
              <a href={`tel:${activeStop.senderNumber}`} style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#e0ffe0', color: '#078c35', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', boxShadow: '0 2px 8px rgba(7, 140, 53, 0.1)' }}>
                <Phone size={18} />
              </a>
            </div>

            <div style={{ height: '1px', background: '#e2e8f0', margin: '0 -16px 16px' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, marginBottom: '2px' }}>Receiver</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>{activeStop.receiverName}</div>
                <div style={{ fontSize: '14px', color: '#64748b' }}>{activeStop.receiverNumber}</div>
              </div>
              <a href={`tel:${activeStop.receiverNumber}`} style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#e0ffe0', color: '#078c35', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', boxShadow: '0 2px 8px rgba(7, 140, 53, 0.1)' }}>
                <Phone size={18} />
              </a>
            </div>
          </div>

          <button onClick={() => setIssueOpen(true)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '16px', color: '#ef4444', fontWeight: 700, cursor: 'pointer', fontSize: '16px' }}>
            <AlertTriangle size={18} /> Report Issue
          </button>
        </main>
      )}

      {activeStop && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '1px solid #e2e8f0',
          padding: '16px 20px', paddingBottom: 'max(16px, env(safe-area-inset-bottom))', boxShadow: '0 -8px 32px rgba(15, 23, 42, 0.08)', zIndex: 20,
        }}>
          <button
            onClick={() => setPodOpen(true)}
            style={{ width: '100%', background: '#078c35', color: '#fff', padding: '18px', borderRadius: '16px', border: 'none', fontSize: '18px', fontWeight: 800, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', boxShadow: '0 8px 24px rgba(7, 140, 53, 0.25)', cursor: 'pointer' }}
          >
            Arrived &amp; Deliver
            <ArrowRight size={20} />
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
