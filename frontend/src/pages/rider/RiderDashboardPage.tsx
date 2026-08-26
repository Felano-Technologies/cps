import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Navigation2, PackageCheck, AlertTriangle, MapPin, Wallet, TrendingUp, Route } from 'lucide-react';
import ProofOfDeliveryModal from '../../components/ProofOfDeliveryModal';
import ReportIssueModal from '../../components/ReportIssueModal';
import Map from '../../components/Map';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Skeleton, SkeletonCircle, SkeletonStatCard, SkeletonListItem } from '../../components/Skeleton';
import type { RiderProfile, RiderStatus, Shipment, ShipmentStatus } from '../../types/models';

const STATUS_LABELS: Record<ShipmentStatus, string> = {
  pending: 'Pending',
  picked_up: 'Picked Up',
  in_transit: 'In Transit',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  delayed: 'Delayed',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

const STATUS_COLORS: Record<ShipmentStatus, { bg: string; text: string; border: string }> = {
  pending: { bg: '#f8fafc', text: '#64748b', border: '#e2e8f0' },
  picked_up: { bg: '#ecfccb', text: '#3f6212', border: '#bef264' },
  in_transit: { bg: '#fef9c3', text: '#854d0e', border: '#fde68a' },
  out_for_delivery: { bg: '#e2e8f0', text: '#0f172a', border: '#334155' },
  delivered: { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' },
  delayed: { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
  failed: { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
  cancelled: { bg: '#f1f5f9', text: '#64748b', border: '#e2e8f0' },
};

function isTerminal(status: ShipmentStatus) {
  return status === 'delivered' || status === 'failed' || status === 'cancelled';
}

function extractErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err) && typeof err.response?.data?.error === 'string') {
    return err.response.data.error;
  }
  return err instanceof Error ? err.message : fallback;
}

export default function RiderDashboardPage() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<RiderProfile | null>(null);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [podOpen, setPodOpen] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);
  const [interactingStopId, setInteractingStopId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [profileRes, shipmentsRes] = await Promise.all([
          api.get<RiderProfile>('/riders/me'),
          api.get<Shipment[]>('/shipments'),
        ]);
        setProfile(profileRes.data);
        setShipments(shipmentsRes.data);
      } catch {
        setError('Failed to load your dashboard.');
        toast.error('Failed to load your dashboard.');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const isOnline = profile?.currentStatus !== 'offline' && profile?.currentStatus !== undefined;

  const handleToggleOnline = async () => {
    if (!profile) return;
    const nextStatus: RiderStatus = isOnline ? 'offline' : 'available';
    try {
      const { data } = await api.patch<RiderProfile>('/riders/me/status', { currentStatus: nextStatus });
      setProfile(data);
      toast.success(nextStatus === 'available' ? 'You are now online.' : 'You are now offline.');
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to update your status.'));
    }
  };

  const sortedStops = useMemo(
    () => [...shipments].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [shipments]
  );
  const activeStop = sortedStops.find(s => !isTerminal(s.status)) ?? null;
  const completedCount = shipments.filter(s => isTerminal(s.status)).length;

  const todaysEarnings = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return shipments
      .filter(s => s.status === 'delivered' && s.updatedAt.slice(0, 10) === todayStr)
      .reduce((sum, s) => sum + Number(s.deliveryFee), 0);
  }, [shipments]);

  const chartData = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d;
    });
    return days.map(d => {
      const dayStr = d.toISOString().slice(0, 10);
      const deliveries = shipments.filter(s => s.status === 'delivered' && s.updatedAt.slice(0, 10) === dayStr).length;
      return { day: d.toLocaleDateString(undefined, { weekday: 'short' }), deliveries };
    });
  }, [shipments]);

  const interactingStop = shipments.find(s => s.id === interactingStopId) ?? null;

  const handlePodSubmit = async (method: 'signature' | 'photo', recipientName: string) => {
    if (!interactingStopId) return;
    try {
      const { data } = await api.patch<Shipment>(`/shipments/${interactingStopId}/pod`, {
        podMethod: method,
        podRecipientName: recipientName,
      });
      setShipments(prev => prev.map(s => (s.id === data.id ? data : s)));
      toast.success('Delivery confirmed.');
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to confirm delivery.'));
    } finally {
      setPodOpen(false);
      setInteractingStopId(null);
    }
  };

  const handleIssueSubmit = async (reason: string) => {
    if (!interactingStopId) return;
    try {
      const { data } = await api.patch<Shipment>(`/shipments/${interactingStopId}/status`, {
        status: 'delayed',
        note: reason,
      });
      setShipments(prev => prev.map(s => (s.id === data.id ? data : s)));
      toast.success('Issue reported.');
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to report issue.'));
    } finally {
      setIssueOpen(false);
      setInteractingStopId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="page-shell light-shell" style={{ paddingBottom: '20px' }}>
        <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <SkeletonCircle size={44} />
            <div>
              <Skeleton height="1em" width="120px" style={{ marginBottom: 6 }} />
              <Skeleton height="0.75em" width="60px" />
            </div>
          </div>
        </div>
        <main style={{ padding: '20px' }}>
          <Skeleton height={92} radius="24px" style={{ marginBottom: '24px' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
          </div>
          <SkeletonListItem />
          <SkeletonListItem />
          <SkeletonListItem />
        </main>
      </div>
    );
  }

  return (
    <div className="page-shell light-shell" style={{ paddingBottom: '20px' }}>
      <style>{`
        @media (max-width: 768px) {
          .rd-stats-grid { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>

      <div style={{
        position: 'sticky', top: 0, zIndex: 50, background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(16px)',
        padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '1px solid #e2e8f0',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '50%', background: 'var(--lime)', color: '#0b1210',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '18px',
          }}>
            {user?.name?.charAt(0) ?? 'R'}
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 800, letterSpacing: '-0.02em', color: '#0f172a' }}>{user?.name ?? 'Rider'}</h1>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: isOnline ? '#22c55e' : '#94a3b8' }} />
              {isOnline ? 'Online' : 'Offline'}
            </div>
          </div>
        </div>
      </div>

      <main style={{ padding: '20px' }}>
        {error && (
          <p style={{ color: '#991b1b', fontWeight: 600, marginBottom: '16px' }}>{error}</p>
        )}

        <div style={{
          background: isOnline ? '#ffffff' : '#f8fafc', borderRadius: '24px', padding: '24px', marginBottom: '24px',
          border: '1px solid', borderColor: isOnline ? '#e2e8f0' : '#cbd5e1',
          boxShadow: isOnline ? '0 10px 40px rgba(0,0,0,0.06)' : 'none', transition: 'all 0.3s ease',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ margin: '0 0 4px 0', fontSize: '22px', fontWeight: 800, letterSpacing: '-0.02em' }}>{isOnline ? 'You are Online' : 'You are Offline'}</h2>
              <p style={{ margin: 0, fontSize: '14px', color: '#64748b', fontWeight: 500 }}>{isOnline ? 'Receiving active dispatch signals.' : 'Toggle to start receiving jobs.'}</p>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', position: 'relative' }}>
              <input type="checkbox" checked={isOnline} onChange={handleToggleOnline} style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }} />
              <div style={{ width: '64px', height: '36px', borderRadius: '18px', background: isOnline ? '#078c35' : '#cbd5e1', transition: 'background 0.3s', position: 'relative' }}>
                <div style={{ position: 'absolute', top: '2px', left: isOnline ? '30px' : '2px', width: '32px', height: '32px', background: '#fff', borderRadius: '50%', transition: 'left 0.4s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }} />
              </div>
            </label>
          </div>
        </div>

        {isOnline && (
          <>
            <div className="rd-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
              <div style={{ background: '#ffffff', borderRadius: '16px', padding: '16px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b', fontWeight: 700, marginBottom: '4px' }}><Wallet size={14} /> Today's Earnings</div>
                <div style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.02em' }}>GHS {todaysEarnings.toFixed(2)}</div>
              </div>
              <div style={{ background: '#ffffff', borderRadius: '16px', padding: '16px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b', fontWeight: 700, marginBottom: '4px' }}><PackageCheck size={14} /> Deliveries</div>
                <div style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.02em' }}>{completedCount} <span style={{ fontSize: '13px', color: '#94a3b8' }}>/ {shipments.length}</span></div>
              </div>
              <div style={{ background: '#ffffff', borderRadius: '16px', padding: '16px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b', fontWeight: 700, marginBottom: '4px' }}><Route size={14} /> Active Stops</div>
                <div style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.02em' }}>{shipments.length - completedCount}</div>
              </div>
            </div>

            <div style={{ background: '#ffffff', borderRadius: '20px', padding: '20px', marginBottom: '24px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontSize: '15px', fontWeight: 800 }}>
                <TrendingUp size={18} /> Deliveries — Last 7 Days
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} width={24} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} />
                  <Bar dataKey="deliveries" fill="#078c35" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {activeStop && (
              <div style={{
                background: '#ffffff', borderRadius: '24px', overflow: 'hidden', marginBottom: '32px',
                border: '1px solid #e2e8f0', boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)',
              }}>
                <Map
                  className="map-mini-surface"
                  markers={[
                    { label: 'Pickup', address: `${activeStop.pickupLocation}, ${activeStop.pickupRegion}, Ghana` },
                    { label: 'Dropoff', address: `${activeStop.dropoffLocation}, ${activeStop.dropoffRegion}, Ghana` },
                  ]}
                  showRoute
                />

                <div style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div>
                      <h3 style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: 800, letterSpacing: '-0.02em' }}>{activeStop.dropoffLocation}</h3>
                      <p style={{ margin: 0, fontSize: '14px', color: '#64748b', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={14} /> {activeStop.dropoffRegion}
                      </p>
                    </div>
                    <span style={{ padding: '6px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 700, background: STATUS_COLORS[activeStop.status].bg, color: STATUS_COLORS[activeStop.status].text, border: `1px solid ${STATUS_COLORS[activeStop.status].border}` }}>
                      {STATUS_LABELS[activeStop.status]}
                    </span>
                  </div>
                  <button
                    onClick={() => navigate('/route')}
                    style={{ width: '100%', background: '#0f172a', color: '#fff', padding: '16px', borderRadius: '16px', border: 'none', fontWeight: 800, fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}
                  >
                    View Full Route <Navigation2 size={18} />
                  </button>
                </div>
              </div>
            )}

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, letterSpacing: '-0.01em' }}>Today's Itinerary</h3>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748b', background: '#e2e8f0', padding: '4px 10px', borderRadius: '12px' }}>{shipments.length} Total</span>
              </div>

              {shipments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 20px', color: '#94a3b8', fontWeight: 600 }}>No stops assigned yet.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {sortedStops.map(stop => {
                    const isActive = stop.id === activeStop?.id;
                    const colors = STATUS_COLORS[stop.status];
                    return (
                      <div key={stop.id} style={{
                        background: '#ffffff', borderRadius: '20px', padding: '20px',
                        border: '1px solid', borderColor: isActive ? '#078c35' : '#e2e8f0',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.03)', position: 'relative', overflow: 'hidden',
                      }}>
                        {isActive && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: '#078c35' }} />}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                          <span style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}>
                            {STATUS_LABELS[stop.status]}
                          </span>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{stop.trackingCode}</div>
                        </div>

                        <h4 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 800, color: '#0f172a', textDecoration: isTerminal(stop.status) ? 'line-through' : 'none' }}>
                          {stop.dropoffLocation}
                        </h4>
                        <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#64748b', fontWeight: 500 }}>{stop.additionalInstructions || stop.dropoffRegion} · GHS {Number(stop.deliveryFee).toFixed(2)}</p>

                        {isActive && (
                          <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                            <button
                              onClick={() => { setInteractingStopId(stop.id); setPodOpen(true); }}
                              style={{ flex: 1, padding: '10px 24px', background: '#078c35', border: 'none', borderRadius: '12px', fontWeight: 700, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                            >
                              <PackageCheck size={16} /> Deliver
                            </button>
                            <button
                              onClick={() => { setInteractingStopId(stop.id); setIssueOpen(true); }}
                              style={{ padding: '10px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                              <AlertTriangle size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {podOpen && interactingStop && (
        <ProofOfDeliveryModal stopAddress={interactingStop.dropoffLocation} onClose={() => { setPodOpen(false); setInteractingStopId(null); }} onSubmit={handlePodSubmit} />
      )}

      {issueOpen && interactingStop && (
        <ReportIssueModal stopAddress={interactingStop.dropoffLocation} onClose={() => { setIssueOpen(false); setInteractingStopId(null); }} onSubmit={handleIssueSubmit} />
      )}
    </div>
  );
}
