import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Navigation2, PackageCheck, AlertTriangle, MapPin, Wallet, TrendingUp, Route, User, Phone, Package, Banknote } from 'lucide-react';
import ProofOfDeliveryModal from '../../components/ProofOfDeliveryModal';
import ReportIssueModal from '../../components/ReportIssueModal';
import Modal from '../../components/Modal';
import EmptyState from '../../components/EmptyState';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Skeleton, SkeletonCircle, SkeletonStatCard, SkeletonListItem } from '../../components/Skeleton';
import type { RiderProfile, RiderStatus, Shipment, ShipmentStatus, RiderDeduction } from '../../types/models';

const DEDUCTION_CATEGORY_LABELS: Record<string, string> = {
  late_delivery: 'Late Delivery',
  damaged_goods: 'Damaged / Lost Goods',
  fuel_advance: 'Fuel Advance',
  equipment: 'Uniform & Equipment',
  disciplinary: 'Disciplinary Fine',
  loan_repayment: 'Loan Repayment',
  other: 'Other Adjustment',
};

const STATUS_LABELS: Record<ShipmentStatus, string> = {
  awaiting_price: 'Awaiting Price',
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
  awaiting_price: { bg: '#fff7ed', text: '#c2410c', border: '#fdba74' },
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
  const [deductions, setDeductions] = useState<RiderDeduction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [podOpen, setPodOpen] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);
  const [interactingStopId, setInteractingStopId] = useState<string | null>(null);
  const [detailsStopId, setDetailsStopId] = useState<string | null>(null);
  const [isDeductionsModalOpen, setIsDeductionsModalOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [profileRes, shipmentsRes, deductionsRes] = await Promise.all([
          api.get<RiderProfile>('/riders/me'),
          api.get<Shipment[]>('/shipments'),
          api.get<RiderDeduction[]>('/deductions/me'),
        ]);
        setProfile(profileRes.data);
        setShipments(shipmentsRes.data);
        setDeductions(deductionsRes.data);
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

  const totalDeductions = useMemo(
    () => deductions.reduce((sum, d) => sum + Number(d.amount), 0),
    [deductions]
  );

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
  const detailsStop = shipments.find(s => s.id === detailsStopId) ?? null;

  const handlePodSubmit = async (method: 'signature' | 'photo', recipientName: string, signatureData: string | null, photoUrl: string | null) => {
    if (!interactingStopId) return;
    try {
      const { data } = await api.patch<Shipment>(`/shipments/${interactingStopId}/pod`, {
        podMethod: method,
        podRecipientName: recipientName,
        podSignatureData: signatureData ?? undefined,
        podPhotoUrl: photoUrl ?? undefined,
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
            <div className="rd-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
              <Link
                to="/rider/earnings"
                style={{
                  background: '#ffffff',
                  borderRadius: '16px',
                  padding: '16px',
                  border: '1px solid #e2e8f0',
                  textDecoration: 'none',
                  color: 'inherit',
                  display: 'block',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.borderColor = '#078c35';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(7,140,53,0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.02)';
                }}
                title="Click to view full earnings history and breakdown"
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b', fontWeight: 700 }}>
                    <Wallet size={14} color="#078c35" /> Today's Earnings
                  </div>
                  <span style={{ fontSize: '11px', color: '#078c35', fontWeight: 700, display: 'flex', alignItems: 'center' }}>
                    History &rarr;
                  </span>
                </div>
                <div style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.02em', color: '#0f172a' }}>
                  GHS {todaysEarnings.toFixed(2)}
                </div>
              </Link>
              <div style={{ background: '#ffffff', borderRadius: '16px', padding: '16px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b', fontWeight: 700, marginBottom: '4px' }}><PackageCheck size={14} /> Deliveries</div>
                <div style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.02em' }}>{completedCount} <span style={{ fontSize: '13px', color: '#94a3b8' }}>/ {shipments.length}</span></div>
              </div>
              <div style={{ background: '#ffffff', borderRadius: '16px', padding: '16px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b', fontWeight: 700, marginBottom: '4px' }}><Route size={14} /> Active Stops</div>
                <div style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.02em' }}>{shipments.length - completedCount}</div>
              </div>
              <button
                type="button"
                onClick={() => setIsDeductionsModalOpen(true)}
                style={{ background: '#ffffff', borderRadius: '16px', padding: '16px', border: '1px solid #e2e8f0', textAlign: 'left', cursor: 'pointer', font: 'inherit' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b', fontWeight: 700, marginBottom: '4px' }}><Banknote size={14} /> Deductions</div>
                <div style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.02em', color: totalDeductions > 0 ? '#dc2626' : '#0f172a' }}>GHS {totalDeductions.toFixed(2)}</div>
              </button>
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
                <div style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                    <div>
                      <div style={{ color: '#078c35', fontWeight: 800, fontSize: '12px', letterSpacing: '0.05em', marginBottom: '4px', textTransform: 'uppercase' }}>Active Order</div>
                      <h3 style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: 800, letterSpacing: '-0.02em' }}>{activeStop.dropoffLocation}</h3>
                      <p style={{ margin: 0, fontSize: '14px', color: '#64748b', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={14} /> {activeStop.dropoffRegion}
                      </p>
                    </div>
                    <span style={{ padding: '6px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 700, background: STATUS_COLORS[activeStop.status].bg, color: STATUS_COLORS[activeStop.status].text, border: `1px solid ${STATUS_COLORS[activeStop.status].border}` }}>
                      {STATUS_LABELS[activeStop.status]}
                    </span>
                  </div>

                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '4px', borderBottom: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>{activeStop.trackingCode}</span>
                      {activeStop.priority === 'high' && (
                        <span style={{ fontSize: '11px', fontWeight: 800, color: '#854d0e', background: '#fef9c3', padding: '3px 8px', borderRadius: '6px', letterSpacing: '0.03em' }}>HIGH PRIORITY</span>
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
                      <span style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#f1f5f9', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><User size={16} /></span>
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Sender</div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{activeStop.senderName}</div>
                      </div>
                      <a
                        href={`tel:${activeStop.senderNumber}`}
                        style={{ marginLeft: 'auto', width: '32px', height: '32px', borderRadius: '10px', background: '#f1f5f9', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', flexShrink: 0 }}
                      >
                        <Phone size={15} />
                      </a>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#e2e8f0', color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><User size={16} /></span>
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Receiver</div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{activeStop.receiverName}</div>
                      </div>
                      <a
                        href={`tel:${activeStop.receiverNumber}`}
                        style={{ marginLeft: 'auto', width: '32px', height: '32px', borderRadius: '10px', background: '#e0ffe0', color: '#078c35', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', flexShrink: 0 }}
                      >
                        <Phone size={15} />
                      </a>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#fef9c3', color: '#854d0e', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Package size={16} /></span>
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Package</div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', textTransform: 'capitalize' }}>{activeStop.packageType} · {activeStop.speed.replace('_', ' ')}</div>
                      </div>
                      <div style={{ marginLeft: 'auto', fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>GHS {Number(activeStop.deliveryFee).toFixed(2)}</div>
                    </div>

                    {activeStop.additionalInstructions && (
                      <div style={{ fontSize: '13px', color: '#64748b', background: '#fff', borderRadius: '10px', padding: '10px 12px', border: '1px solid #e2e8f0' }}>
                        <strong style={{ color: '#0f172a' }}>Note:</strong> {activeStop.additionalInstructions}
                      </div>
                    )}
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
                      <div
                        key={stop.id}
                        onClick={() => setDetailsStopId(stop.id)}
                        style={{
                          background: '#ffffff', borderRadius: '20px', padding: '20px',
                          border: '1px solid', borderColor: isActive ? '#078c35' : '#e2e8f0',
                          boxShadow: '0 4px 16px rgba(0,0,0,0.03)', position: 'relative', overflow: 'hidden', cursor: 'pointer',
                        }}
                      >
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
                              onClick={(e) => { e.stopPropagation(); setInteractingStopId(stop.id); setPodOpen(true); }}
                              style={{ flex: 1, padding: '10px 24px', background: '#078c35', border: 'none', borderRadius: '12px', fontWeight: 700, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                            >
                              <PackageCheck size={16} /> Deliver
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setInteractingStopId(stop.id); setIssueOpen(true); }}
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

      {detailsStop && (
        <Modal onClose={() => setDetailsStopId(null)} title="Order Details" maxWidth="480px">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748b' }}>{detailsStop.trackingCode}</span>
            <span style={{ padding: '6px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 700, background: STATUS_COLORS[detailsStop.status].bg, color: STATUS_COLORS[detailsStop.status].text, border: `1px solid ${STATUS_COLORS[detailsStop.status].border}` }}>
              {STATUS_LABELS[detailsStop.status]}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#f1f5f9', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><User size={16} /></span>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Sender</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{detailsStop.senderName}</div>
              </div>
              <a href={`tel:${detailsStop.senderNumber}`} style={{ marginLeft: 'auto', width: '32px', height: '32px', borderRadius: '10px', background: '#f1f5f9', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', flexShrink: 0 }}>
                <Phone size={15} />
              </a>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#e0ffe0', color: '#078c35', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><MapPin size={16} /></span>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Pickup</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{detailsStop.pickupLocation}, {detailsStop.pickupRegion}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#e2e8f0', color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><User size={16} /></span>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Receiver</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{detailsStop.receiverName}</div>
              </div>
              <a href={`tel:${detailsStop.receiverNumber}`} style={{ marginLeft: 'auto', width: '32px', height: '32px', borderRadius: '10px', background: '#e0ffe0', color: '#078c35', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', flexShrink: 0 }}>
                <Phone size={15} />
              </a>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#e2e8f0', color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><MapPin size={16} /></span>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Dropoff</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                  {detailsStop.dropoffLocation}, {detailsStop.dropoffRegion}
                  {detailsStop.dropoffKumasiSubArea && ` (${detailsStop.dropoffKumasiSubArea === 'CampusAndEnvirons' ? 'KNUST Campus & Environs' : detailsStop.dropoffKumasiSubArea})`}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#fef9c3', color: '#854d0e', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Package size={16} /></span>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Package</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', textTransform: 'capitalize' }}>
                  {detailsStop.packageType} · {detailsStop.speed.replace('_', ' ')}{detailsStop.priority === 'high' ? ' · High Priority' : ''}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#e0ffe0', color: '#078c35', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Wallet size={16} /></span>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Delivery Fee</div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                  GHS {Number(detailsStop.deliveryFee).toFixed(2)}
                  {detailsStop.productFee && Number(detailsStop.productFee) > 0 && ` + GHS ${Number(detailsStop.productFee).toFixed(2)} product fee`}
                </div>
              </div>
            </div>

            {detailsStop.additionalInstructions && (
              <div style={{ fontSize: '13px', color: '#64748b', background: '#f8fafc', borderRadius: '10px', padding: '10px 12px', border: '1px solid #e2e8f0' }}>
                <strong style={{ color: '#0f172a' }}>Note:</strong> {detailsStop.additionalInstructions}
              </div>
            )}

            {detailsStop.podMethod && (
              <div style={{ fontSize: '13px', color: '#16a34a', background: '#f0fdf4', borderRadius: '10px', padding: '10px 12px', border: '1px solid #bbf7d0' }}>
                <strong>Delivered</strong> — confirmed via {detailsStop.podMethod}{detailsStop.podRecipientName ? ` by ${detailsStop.podRecipientName}` : ''}
              </div>
            )}
          </div>
        </Modal>
      )}

      {isDeductionsModalOpen && (
        <Modal onClose={() => setIsDeductionsModalOpen(false)} title="Earnings Deductions" maxWidth="480px">
          <p style={{ color: '#64748b', fontSize: '14px', marginTop: '-8px', marginBottom: '20px' }}>
            Total deducted: <strong style={{ color: totalDeductions > 0 ? '#dc2626' : '#0f172a' }}>GHS {totalDeductions.toFixed(2)}</strong>
          </p>
          {deductions.length === 0 ? (
            <EmptyState
              icon={<Banknote size={36} />}
              title="No Deductions"
              message="You have no earnings deductions on record."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '60vh', overflowY: 'auto' }}>
              {deductions.map(d => (
                <div key={d.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{DEDUCTION_CATEGORY_LABELS[d.category] ?? d.category}</span>
                    <span style={{ fontSize: '15px', fontWeight: 800, color: '#dc2626', flexShrink: 0 }}>-GHS {Number(d.amount).toFixed(2)}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>{d.reason}</p>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px' }}>
                    {new Date(d.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
