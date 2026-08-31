import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Wallet,
  Calendar,
  ChevronLeft,
  PackageCheck,
  Banknote,
  AlertTriangle,
  Filter,
  Printer,
  Search,
  CheckCircle2,
  MapPin,
  Clock,
  ExternalLink,
  FileSpreadsheet,
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import EmptyState from '../../components/EmptyState';
import { SkeletonStatCard, SkeletonListItem } from '../../components/Skeleton';
import type { Shipment, RiderProfile, RiderDeduction } from '../../types/models';

type FilterTab = 'day' | 'week' | 'month' | 'custom';

function formatGHS(amount: number | string | null | undefined): string {
  const val = Number(amount || 0);
  return `GHS ${val.toFixed(2)}`;
}

function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function RiderEarningsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<RiderProfile | null>(null);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [deductions, setDeductions] = useState<RiderDeduction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter State
  const [filterTab, setFilterTab] = useState<FilterTab>('day');
  const [selectedDate, setSelectedDate] = useState<string>(toLocalDateString(new Date()));
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return toLocalDateString(d);
  });
  const [endDate, setEndDate] = useState<string>(toLocalDateString(new Date()));
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [activeViewTab, setActiveViewTab] = useState<'deliveries' | 'deductions'>('deliveries');

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [profileRes, shipmentsRes, deductionsRes] = await Promise.all([
          api.get<RiderProfile>('/riders/me'),
          api.get<Shipment[]>('/shipments'),
          api.get<RiderDeduction[]>('/deductions').catch(() => ({ data: [] })),
        ]);
        setProfile(profileRes.data);
        setShipments(shipmentsRes.data);
        setDeductions(deductionsRes.data || []);
      } catch {
        setError('Failed to load earning history. Please try again.');
        toast.error('Failed to load earning history.');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Compute effective date range [rangeStart, rangeEnd] inclusive in YYYY-MM-DD
  const { rangeStartStr, rangeEndStr, rangeLabel } = useMemo(() => {
    const today = new Date();

    if (filterTab === 'day') {
      const isToday = selectedDate === toLocalDateString(today);
      return {
        rangeStartStr: selectedDate,
        rangeEndStr: selectedDate,
        rangeLabel: isToday
          ? `Today (${new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })})`
          : new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
      };
    }

    if (filterTab === 'week') {
      const curr = new Date();
      const first = curr.getDate() - (curr.getDay() === 0 ? 6 : curr.getDay() - 1);
      const firstDay = new Date(curr.setDate(first));
      const lastDay = new Date(firstDay);
      lastDay.setDate(firstDay.getDate() + 6);

      const start = toLocalDateString(firstDay);
      const end = toLocalDateString(lastDay);
      return {
        rangeStartStr: start,
        rangeEndStr: end,
        rangeLabel: `This Week (${firstDay.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${lastDay.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })})`,
      };
    }

    if (filterTab === 'month') {
      const [yearStr, monthStr] = selectedMonth.split('-');
      const y = parseInt(yearStr, 10);
      const m = parseInt(monthStr, 10);
      const firstDay = new Date(y, m - 1, 1);
      const lastDay = new Date(y, m, 0);

      const start = toLocalDateString(firstDay);
      const end = toLocalDateString(lastDay);
      return {
        rangeStartStr: start,
        rangeEndStr: end,
        rangeLabel: firstDay.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
      };
    }

    // Custom date range
    const sDate = startDate || toLocalDateString(today);
    const eDate = endDate || toLocalDateString(today);
    return {
      rangeStartStr: sDate <= eDate ? sDate : eDate,
      rangeEndStr: sDate <= eDate ? eDate : sDate,
      rangeLabel: `${new Date(sDate + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${new Date(eDate + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`,
    };
  }, [filterTab, selectedDate, selectedMonth, startDate, endDate]);

  // Delivered shipments filtered by date range and search
  const filteredDeliveredShipments = useMemo(() => {
    return shipments.filter((s) => {
      if (s.status !== 'delivered') return false;
      const orderDate = (s.updatedAt || s.createdAt).slice(0, 10);
      const inRange = orderDate >= rangeStartStr && orderDate <= rangeEndStr;
      if (!inRange) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesCode = s.trackingCode.toLowerCase().includes(q);
        const matchesReceiver = s.receiverName.toLowerCase().includes(q);
        const matchesLocation = s.dropoffLocation.toLowerCase().includes(q);
        return matchesCode || matchesReceiver || matchesLocation;
      }
      return true;
    });
  }, [shipments, rangeStartStr, rangeEndStr, searchQuery]);

  // Deductions filtered by date range
  const filteredDeductions = useMemo(() => {
    return deductions.filter((d) => {
      const dedDate = d.createdAt.slice(0, 10);
      const inRange = dedDate >= rangeStartStr && dedDate <= rangeEndStr;
      if (!inRange) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return d.reason.toLowerCase().includes(q) || d.category.toLowerCase().includes(q);
      }
      return true;
    });
  }, [deductions, rangeStartStr, rangeEndStr, searchQuery]);

  // Totals & KPIs
  const grossEarnings = useMemo(() => {
    return filteredDeliveredShipments.reduce((sum, s) => sum + Number(s.deliveryFee || 0), 0);
  }, [filteredDeliveredShipments]);

  const totalCodCollected = useMemo(() => {
    return filteredDeliveredShipments.reduce((sum, s) => sum + Number(s.productFee || 0), 0);
  }, [filteredDeliveredShipments]);

  const totalDeductionsAmount = useMemo(() => {
    return filteredDeductions.reduce((sum, d) => sum + Number(d.amount || 0), 0);
  }, [filteredDeductions]);

  const netEarnings = useMemo(() => {
    return Math.max(0, grossEarnings - totalDeductionsAmount);
  }, [grossEarnings, totalDeductionsAmount]);

  const completedCount = filteredDeliveredShipments.length;
  const avgPerDelivery = completedCount > 0 ? grossEarnings / completedCount : 0;

  // Chart aggregation per day
  const chartData = useMemo(() => {
    const s = new Date(rangeStartStr + 'T00:00:00');
    const e = new Date(rangeEndStr + 'T00:00:00');
    const daysDiff = Math.min(31, Math.max(1, Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1));

    const dayMap = new Map<string, { earnings: number; count: number }>();

    for (let i = 0; i < daysDiff; i++) {
      const curr = new Date(s);
      curr.setDate(curr.getDate() + i);
      const dStr = toLocalDateString(curr);
      dayMap.set(dStr, { earnings: 0, count: 0 });
    }

    filteredDeliveredShipments.forEach((shipment) => {
      const dStr = (shipment.updatedAt || shipment.createdAt).slice(0, 10);
      const existing = dayMap.get(dStr);
      if (existing) {
        existing.earnings += Number(shipment.deliveryFee || 0);
        existing.count += 1;
      }
    });

    return Array.from(dayMap.entries()).map(([dateStr, val]) => {
      const d = new Date(dateStr + 'T00:00:00');
      const label = daysDiff <= 7
        ? d.toLocaleDateString(undefined, { weekday: 'short', month: 'numeric', day: 'numeric' })
        : `${d.getDate()} ${d.toLocaleDateString(undefined, { month: 'short' })}`;

      return {
        date: label,
        fullDate: dateStr,
        earnings: Number(val.earnings.toFixed(2)),
        deliveries: val.count,
      };
    });
  }, [rangeStartStr, rangeEndStr, filteredDeliveredShipments]);

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="page-shell light-shell" style={{ paddingBottom: '40px' }}>
        <div style={{ padding: '24px 20px', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800 }}>Loading Earnings History...</h1>
          </div>
        </div>
        <main style={{ maxWidth: '1200px', margin: '24px auto', padding: '0 20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <SkeletonStatCard />
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
    <div className="page-shell light-shell" style={{ paddingBottom: '60px' }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .page-shell { background: #fff !important; padding: 0 !important; }
          .earnings-card { box-shadow: none !important; border: 1px solid #ddd !important; }
        }
        .filter-tab-btn {
          padding: 8px 18px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          border: 1px solid transparent;
          background: #f1f5f9;
          color: #475569;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .filter-tab-btn:hover {
          background: #e2e8f0;
          color: #0f172a;
        }
        .filter-tab-btn.active {
          background: #078c35;
          color: #fff;
          box-shadow: 0 4px 12px rgba(7, 140, 53, 0.25);
        }
        .earnings-kpi-card {
          background: #ffffff;
          border-radius: 16px;
          padding: 20px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 16px rgba(15, 23, 42, 0.03);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .earnings-kpi-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.07);
        }
        .order-row-card {
          background: #ffffff;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          padding: 16px 20px;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
          transition: all 0.2s;
        }
        .order-row-card:hover {
          border-color: #cbd5e1;
          background: #f8fafc;
          transform: translateX(3px);
        }
      `}</style>

      {/* Header Bar */}
      <div
        className="no-print"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          background: 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid #e2e8f0',
          padding: '16px 20px',
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => navigate('/rider-board')}
              style={{
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '10px',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#334155',
              }}
              title="Back to Dashboard"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
                Earnings & Payment History
              </h1>
              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>
                Rider: <strong>{user?.name ?? 'Rider'}</strong> • Vehicle: <strong style={{ textTransform: 'capitalize' }}>{profile?.vehicleType || 'Motorbike'}</strong>
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={handlePrint}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                padding: '8px 16px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                fontWeight: 700,
                color: '#334155',
                cursor: 'pointer',
              }}
            >
              <Printer size={15} /> Print Statement
            </button>
          </div>
        </div>
      </div>

      <main style={{ maxWidth: '1200px', margin: '24px auto', padding: '0 20px' }}>
        {error && (
          <div style={{ padding: '14px 18px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', color: '#991b1b', marginBottom: '20px', fontWeight: 600 }}>
            {error}
          </div>
        )}

        {/* Filter Controls Card */}
        <div
          className="earnings-card no-print"
          style={{
            background: '#ffffff',
            borderRadius: '20px',
            padding: '20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 20px rgba(15, 23, 42, 0.04)',
            marginBottom: '24px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748b', marginRight: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Filter Period:
              </span>
              <button
                className={`filter-tab-btn ${filterTab === 'day' ? 'active' : ''}`}
                onClick={() => setFilterTab('day')}
              >
                <Calendar size={15} /> Day
              </button>
              <button
                className={`filter-tab-btn ${filterTab === 'week' ? 'active' : ''}`}
                onClick={() => setFilterTab('week')}
              >
                <Clock size={15} /> Week
              </button>
              <button
                className={`filter-tab-btn ${filterTab === 'month' ? 'active' : ''}`}
                onClick={() => setFilterTab('month')}
              >
                <FileSpreadsheet size={15} /> Month
              </button>
              <button
                className={`filter-tab-btn ${filterTab === 'custom' ? 'active' : ''}`}
                onClick={() => setFilterTab('custom')}
              >
                <Filter size={15} /> Custom Period
              </button>
            </div>

            {/* Quick Search */}
            <div style={{ position: 'relative', minWidth: '240px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search tracking / recipient..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 36px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Sub-filter date pickers based on tab */}
          <div style={{ paddingTop: '16px', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            {filterTab === 'day' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>Select Date:</span>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 600 }}
                  />
                </label>
                <button
                  onClick={() => setSelectedDate(toLocalDateString(new Date()))}
                  style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: 700, color: '#334155', cursor: 'pointer' }}
                >
                  Today
                </button>
                <button
                  onClick={() => {
                    const y = new Date();
                    y.setDate(y.getDate() - 1);
                    setSelectedDate(toLocalDateString(y));
                  }}
                  style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: 700, color: '#334155', cursor: 'pointer' }}
                >
                  Yesterday
                </button>
              </div>
            )}

            {filterTab === 'week' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#334155' }}>
                  Showing earnings for <strong>{rangeLabel}</strong>
                </span>
              </div>
            )}

            {filterTab === 'month' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>Select Month:</span>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 600 }}
                  />
                </label>
                <button
                  onClick={() => {
                    const d = new Date();
                    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
                  }}
                  style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: 700, color: '#334155', cursor: 'pointer' }}
                >
                  Current Month
                </button>
              </div>
            )}

            {filterTab === 'custom' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>From:</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 600 }}
                  />
                </label>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>To:</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 600 }}
                  />
                </label>
                <button
                  onClick={() => {
                    const today = new Date();
                    const s = new Date(today.getFullYear(), today.getMonth(), 7);
                    const e = new Date(today.getFullYear(), today.getMonth(), 18);
                    setStartDate(toLocalDateString(s));
                    setEndDate(toLocalDateString(e));
                  }}
                  style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: 700, color: '#078c35', cursor: 'pointer' }}
                >
                  Quick: 7th - 18th
                </button>
                <button
                  onClick={() => {
                    const today = new Date();
                    const s = new Date(today.getFullYear(), today.getMonth(), 1);
                    const e = new Date(today.getFullYear(), today.getMonth(), 15);
                    setStartDate(toLocalDateString(s));
                    setEndDate(toLocalDateString(e));
                  }}
                  style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: 700, color: '#334155', cursor: 'pointer' }}
                >
                  1st - 15th
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Current Active Range Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Viewing Summary For
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
              {rangeLabel}
            </div>
          </div>
        </div>

        {/* Summary KPI Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          
          {/* Net Earnings */}
          <div className="earnings-kpi-card" style={{ borderLeft: '4px solid #078c35' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 700 }}>Total Net Payout</span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Wallet size={18} />
              </div>
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#078c35', letterSpacing: '-0.02em' }}>
              {formatGHS(netEarnings)}
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
              Gross: {formatGHS(grossEarnings)} {totalDeductionsAmount > 0 && `( -${formatGHS(totalDeductionsAmount)} ded.)`}
            </div>
          </div>

          {/* Completed Deliveries */}
          <div className="earnings-kpi-card" style={{ borderLeft: '4px solid #2563eb' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 700 }}>Completed Deliveries</span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#dbeafe', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PackageCheck size={18} />
              </div>
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
              {completedCount} <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 500 }}>orders</span>
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
              Avg. {formatGHS(avgPerDelivery)} / delivery
            </div>
          </div>

          {/* COD Cash Collected */}
          <div className="earnings-kpi-card" style={{ borderLeft: '4px solid #d97706' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 700 }}>COD Cash Collected</span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fef3c7', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Banknote size={18} />
              </div>
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#b45309', letterSpacing: '-0.02em' }}>
              {formatGHS(totalCodCollected)}
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
              Product fees collected on behalf of senders
            </div>
          </div>

          {/* Deductions / Fines */}
          <div className="earnings-kpi-card" style={{ borderLeft: '4px solid #dc2626' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 700 }}>Deductions & Fines</span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle size={18} />
              </div>
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#dc2626', letterSpacing: '-0.02em' }}>
              {formatGHS(totalDeductionsAmount)}
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
              {filteredDeductions.length} deduction record(s)
            </div>
          </div>

        </div>

        {/* Earnings Chart Section */}
        {chartData.length > 1 && (
          <div
            className="earnings-card no-print"
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              padding: '24px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 20px rgba(15, 23, 42, 0.04)',
              marginBottom: '24px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
                  Earnings Trend Over Time
                </h3>
                <span style={{ fontSize: '13px', color: '#64748b' }}>Daily delivery earnings in GHS</span>
              </div>
            </div>

            <div style={{ height: '240px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '12px' }}
                    formatter={(value: any) => [`GHS ${Number(value).toFixed(2)}`, 'Earnings']}
                  />
                  <Bar dataKey="earnings" fill="#078c35" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* View Toggle Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <button
            onClick={() => setActiveViewTab('deliveries')}
            style={{
              background: activeViewTab === 'deliveries' ? '#0f172a' : '#f1f5f9',
              color: activeViewTab === 'deliveries' ? '#ffffff' : '#475569',
              border: 'none',
              borderRadius: '10px',
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <PackageCheck size={16} /> Delivered Orders ({filteredDeliveredShipments.length})
          </button>
          <button
            onClick={() => setActiveViewTab('deductions')}
            style={{
              background: activeViewTab === 'deductions' ? '#0f172a' : '#f1f5f9',
              color: activeViewTab === 'deductions' ? '#ffffff' : '#475569',
              border: 'none',
              borderRadius: '10px',
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <AlertTriangle size={16} /> Deductions & Adjustments ({filteredDeductions.length})
          </button>
        </div>

        {/* Table / List View */}
        {activeViewTab === 'deliveries' ? (
          <div>
            {filteredDeliveredShipments.length === 0 ? (
              <EmptyState
                icon={<PackageCheck size={36} color="#078c35" />}
                title="No deliveries found"
                message={`No completed deliveries found for ${rangeLabel}. Change the date filter or select another period.`}
              />
            ) : (
              <div>
                {filteredDeliveredShipments.map((s) => (
                  <div key={s.id} className="order-row-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '12px',
                          background: '#e0ffe0',
                          color: '#15803d',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <CheckCircle2 size={22} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <Link
                            to={`/tracking/${s.trackingCode}`}
                            style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', textDecoration: 'none' }}
                          >
                            {s.trackingCode}
                          </Link>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#166534', background: '#dcfce7', padding: '2px 8px', borderRadius: '10px' }}>
                            DELIVERED
                          </span>
                        </div>
                        <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span>To: <strong style={{ color: '#334155' }}>{s.receiverName}</strong></span>
                          <span>•</span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <MapPin size={12} /> {s.dropoffLocation} ({s.dropoffRegion})
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                          {new Date(s.updatedAt || s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(s.updatedAt || s.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </div>
                        <div style={{ fontSize: '17px', fontWeight: 800, color: '#078c35', marginTop: '2px' }}>
                          +{formatGHS(s.deliveryFee)}
                        </div>
                        {s.productFee != null && Number(s.productFee) > 0 && (
                          <div style={{ fontSize: '12px', color: '#b45309', fontWeight: 700 }}>
                            COD Collected: {formatGHS(s.productFee)}
                          </div>
                        )}
                      </div>

                      <Link
                        to={`/tracking/${s.trackingCode}`}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: '#f1f5f9',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#475569',
                          textDecoration: 'none',
                        }}
                        title="View Shipment Details"
                      >
                        <ExternalLink size={15} />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            {filteredDeductions.length === 0 ? (
              <EmptyState
                icon={<CheckCircle2 size={36} color="#078c35" />}
                title="No deductions applied"
                message={`Great job! There are no deduction fines or penalties recorded for ${rangeLabel}.`}
              />
            ) : (
              <div>
                {filteredDeductions.map((d) => (
                  <div key={d.id} className="order-row-card" style={{ borderColor: '#fecaca' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '12px',
                          background: '#fee2e2',
                          color: '#dc2626',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <AlertTriangle size={22} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '15px', fontWeight: 800, color: '#991b1b', textTransform: 'capitalize' }}>
                            {d.category.replace('_', ' ')}
                          </span>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#991b1b', background: '#fee2e2', padding: '2px 8px', borderRadius: '10px' }}>
                            DEDUCTED
                          </span>
                        </div>
                        <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#475569' }}>
                          Reason: {d.reason}
                        </p>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>
                        {new Date(d.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                      <div style={{ fontSize: '17px', fontWeight: 800, color: '#dc2626', marginTop: '2px' }}>
                        -{formatGHS(d.amount)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
