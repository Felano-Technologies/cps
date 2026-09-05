import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Search, Plus, Trash2, Printer, AlertTriangle,
  User, ShieldAlert, Banknote,
  Clock, Scale, Fuel, Wrench,
  Zap, ArrowDownLeft, ArrowUpRight, Wallet
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import api from '../../services/api';
import EmptyState from '../../components/EmptyState';
import { Skeleton } from '../../components/Skeleton';
import CustomSelect from '../../components/Form/CustomSelect';
import Modal from '../../components/Modal';
import { useToast } from '../../contexts/ToastContext';
import type { 
  RiderDeduction, 
  DeductionCategory, 
  RiderProfile, 
  DeductionSummary, 
  RiderBonus, 
  BonusSummary, 
  RiderBonusAggregate 
} from '../../types/models';
import cpsLogo from '../../assets/logo2.png';

const CATEGORY_META: Record<DeductionCategory, { label: string; bg: string; text: string; border: string; icon: LucideIcon }> = {
  late_delivery: { label: 'Late Delivery', bg: '#fef2f2', text: '#991b1b', border: '#fecaca', icon: Clock },
  damaged_goods: { label: 'Damaged / Lost Goods', bg: '#fff1f2', text: '#be123c', border: '#fecdd3', icon: AlertTriangle },
  fuel_advance: { label: 'Fuel Advance', bg: '#f0fdf4', text: '#166534', border: '#bbf7d0', icon: Fuel },
  equipment: { label: 'Uniform & Equipment', bg: '#f1f5f9', text: '#334155', border: '#cbd5e1', icon: Wrench },
  disciplinary: { label: 'Disciplinary Fine', bg: '#fff7ed', text: '#c2410c', border: '#fed7aa', icon: ShieldAlert },
  loan_repayment: { label: 'Loan Repayment', bg: '#e2e8f0', text: '#0f172a', border: '#94a3b8', icon: Banknote },
  other: { label: 'Other Adjustment', bg: '#f1f5f9', text: '#475569', border: '#cbd5e1', icon: Scale },
};

const CATEGORY_OPTIONS = [
  { value: '', label: 'All Categories' },
  { value: 'late_delivery', label: 'Late Delivery' },
  { value: 'damaged_goods', label: 'Damaged / Lost Goods' },
  { value: 'fuel_advance', label: 'Fuel Advance' },
  { value: 'equipment', label: 'Uniform & Equipment' },
  { value: 'disciplinary', label: 'Disciplinary Fine' },
  { value: 'loan_repayment', label: 'Loan Repayment' },
  { value: 'other', label: 'Other Adjustment' },
];

type TimelinePeriod = 'this_week' | 'last_week' | 'this_month' | 'today' | 'custom';

function getTimelineDates(period: TimelinePeriod, customStart?: string, customEnd?: string) {
  const now = new Date();
  if (period === 'today') {
    const d = now.toISOString().slice(0, 10);
    return { startDate: d, endDate: d, label: 'Today' };
  }
  if (period === 'this_week') {
    const day = now.getDay();
    const diffToMon = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diffToMon));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return {
      startDate: monday.toISOString().slice(0, 10),
      endDate: sunday.toISOString().slice(0, 10),
      label: `This Week (${monday.toLocaleDateString([], { month: 'short', day: 'numeric' })} - ${sunday.toLocaleDateString([], { month: 'short', day: 'numeric' })})`,
    };
  }
  if (period === 'last_week') {
    const day = now.getDay();
    const diffToMon = now.getDate() - day + (day === 0 ? -6 : 1) - 7;
    const monday = new Date(now.setDate(diffToMon));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return {
      startDate: monday.toISOString().slice(0, 10),
      endDate: sunday.toISOString().slice(0, 10),
      label: `Last Week (${monday.toLocaleDateString([], { month: 'short', day: 'numeric' })} - ${sunday.toLocaleDateString([], { month: 'short', day: 'numeric' })})`,
    };
  }
  if (period === 'this_month') {
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      startDate: firstDay.toISOString().slice(0, 10),
      endDate: lastDay.toISOString().slice(0, 10),
      label: now.toLocaleDateString([], { month: 'long', year: 'numeric' }),
    };
  }
  return {
    startDate: customStart || now.toISOString().slice(0, 10),
    endDate: customEnd || now.toISOString().slice(0, 10),
    label: `${customStart || 'Start'} to ${customEnd || 'End'}`,
  };
}

export default function RiderDeductionsPage() {
  const toast = useToast();
  const navigate = useNavigate();

  // Active View Tab: 'payouts' (Weekly summary) | 'bonuses' (Stream) | 'deductions'
  const [activeTab, setActiveTab] = useState<'payouts' | 'bonuses' | 'deductions'>('payouts');

  // Timeline Filter State
  const [timeline, setTimeline] = useState<TimelinePeriod>('this_week');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Data states
  const [deductions, setDeductions] = useState<RiderDeduction[]>([]);
  const [riders, setRiders] = useState<RiderProfile[]>([]);
  const [summary, setSummary] = useState<DeductionSummary | null>(null);
  const [bonuses, setBonuses] = useState<RiderBonus[]>([]);
  const [bonusSummary, setBonusSummary] = useState<BonusSummary | null>(null);
  const [riderBonusAggregates, setRiderBonusAggregates] = useState<RiderBonusAggregate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedRiderFilter, setSelectedRiderFilter] = useState<string>('');

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formRiderId, setFormRiderId] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formCategory, setFormCategory] = useState<DeductionCategory>('disciplinary');
  const [formReason, setFormReason] = useState('');
  const [formShipmentId, setFormShipmentId] = useState('');
  const [formNotifyRider, setFormNotifyRider] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Print Modals
  const [receiptDeduction, setReceiptDeduction] = useState<RiderDeduction | null>(null);
  const [isPrintPayrollOpen, setIsPrintPayrollOpen] = useState(false);

  const timelineInfo = useMemo(() => {
    return getTimelineDates(timeline, customStartDate, customEndDate);
  }, [timeline, customStartDate, customEndDate]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { startDate, endDate } = timelineInfo;
      const [deductionsRes, ridersRes, summaryRes, bonusesRes] = await Promise.all([
        api.get<RiderDeduction[]>('/deductions'),
        api.get<RiderProfile[]>('/riders'),
        api.get<DeductionSummary>('/deductions/summary'),
        api.get<{ bonuses: RiderBonus[]; summary: BonusSummary; byRider: RiderBonusAggregate[] }>(
          `/bonuses?startDate=${startDate}&endDate=${endDate}`
        ).catch(() => ({ data: { bonuses: [], summary: { totalCount: 0, totalAmount: 0, pickupCount: 0, pickupAmount: 0, dropoffCount: 0, dropoffAmount: 0 }, byRider: [] } })),
      ]);
      setDeductions(deductionsRes.data);
      setRiders(ridersRes.data);
      setSummary(summaryRes.data);
      setBonuses(bonusesRes.data.bonuses || []);
      setBonusSummary(bonusesRes.data.summary || null);
      setRiderBonusAggregates(bonusesRes.data.byRider || []);
    } catch {
      toast.error('Failed to load rider finances data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [timeline, customStartDate, customEndDate]);

  const riderFilterOptions = useMemo(() => [
    { value: '', label: 'All Riders' },
    ...riders.map(r => ({ value: r.id, label: r.user.name })),
  ], [riders]);

  const riderOptions = useMemo(() => [
    { value: '', label: 'Select Dispatch Rider' },
    ...riders.map(r => ({ value: r.id, label: `${r.user.name} (${r.vehicleType || 'Fleet'})` })),
  ], [riders]);

  // Filtered deductions
  const filteredDeductions = useMemo(() => {
    return deductions.filter(item => {
      if (selectedCategory && item.category !== selectedCategory) return false;
      if (selectedRiderFilter && item.riderId !== selectedRiderFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const riderName = item.rider?.user.name.toLowerCase() || '';
        const riderPhone = item.rider?.user.phone?.toLowerCase() || '';
        const reason = item.reason.toLowerCase();
        const ship = (item.shipmentId || '').toLowerCase();
        if (!riderName.includes(q) && !riderPhone.includes(q) && !reason.includes(q) && !ship.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [deductions, selectedCategory, selectedRiderFilter, searchQuery]);

  // Filtered bonuses
  const filteredBonuses = useMemo(() => {
    return bonuses.filter(b => {
      if (selectedRiderFilter && b.riderId !== selectedRiderFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const riderName = b.rider?.user.name.toLowerCase() || '';
        const code = b.shipment?.trackingCode.toLowerCase() || '';
        const pLoc = b.shipment?.pickupLocation.toLowerCase() || '';
        const dLoc = b.shipment?.dropoffLocation.toLowerCase() || '';
        if (!riderName.includes(q) && !code.includes(q) && !pLoc.includes(q) && !dLoc.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [bonuses, selectedRiderFilter, searchQuery]);

  // Combined rider payouts table calculation
  const riderPayoutRows = useMemo(() => {
    return riderBonusAggregates.map(agg => {
      // Find deductions for this rider in the current timeline
      const riderDeds = deductions.filter(d => {
        if (d.riderId !== agg.riderId) return false;
        const dDate = d.createdAt.slice(0, 10);
        return dDate >= timelineInfo.startDate && dDate <= timelineInfo.endDate;
      });
      const totalDedAmount = riderDeds.reduce((sum, d) => sum + Number(d.amount || 0), 0);
      const netPayable = Math.max(0, agg.totalBonusAmount - totalDedAmount);

      return {
        ...agg,
        deductionsCount: riderDeds.length,
        deductionsAmount: totalDedAmount,
        netPayable,
      };
    }).filter(row => {
      if (selectedRiderFilter && row.riderId !== selectedRiderFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          row.riderName.toLowerCase().includes(q) ||
          (row.phone && row.phone.toLowerCase().includes(q)) ||
          (row.vehicleId && row.vehicleId.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [riderBonusAggregates, deductions, timelineInfo, selectedRiderFilter, searchQuery]);

  const totalWeeklyBonusesToPay = useMemo(() => {
    return riderPayoutRows.reduce((sum, r) => sum + r.totalBonusAmount, 0);
  }, [riderPayoutRows]);

  const totalWeeklyDeductionsOffset = useMemo(() => {
    return riderPayoutRows.reduce((sum, r) => sum + r.deductionsAmount, 0);
  }, [riderPayoutRows]);

  const totalWeeklyNetToDisburse = useMemo(() => {
    return riderPayoutRows.reduce((sum, r) => sum + r.netPayable, 0);
  }, [riderPayoutRows]);

  const handleCreateDeduction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRiderId) {
      toast.error('Please select a rider.');
      return;
    }
    const amt = parseFloat(formAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error('Please enter a valid deduction amount.');
      return;
    }
    if (!formReason.trim()) {
      toast.error('Please provide a specific reason.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post<RiderDeduction>('/deductions', {
        riderId: formRiderId,
        amount: amt,
        category: formCategory,
        reason: formReason.trim(),
        shipmentId: formShipmentId.trim() || undefined,
        notifyRider: formNotifyRider,
      });

      setDeductions(prev => [res.data, ...prev]);
      if (summary) {
        setSummary({
          ...summary,
          totalAmount: summary.totalAmount + amt,
          totalCount: summary.totalCount + 1,
        });
      }
      toast.success(`Deduction of GHS ${amt.toFixed(2)} recorded successfully.`);
      setIsCreateModalOpen(false);
      setFormRiderId('');
      setFormAmount('');
      setFormCategory('disciplinary');
      setFormReason('');
      setFormShipmentId('');
      setFormNotifyRider(true);
    } catch {
      toast.error('Failed to record deduction.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDeduction = async (id: string) => {
    if (!window.confirm('Are you sure you want to reverse this deduction? The rider will be notified.')) {
      return;
    }

    try {
      await api.delete(`/deductions/${id}`);
      setDeductions(prev => prev.filter(d => d.id !== id));
      toast.success('Deduction reversed successfully.');
      const res = await api.get<DeductionSummary>('/deductions/summary');
      setSummary(res.data);
    } catch {
      toast.error('Failed to reverse deduction.');
    }
  };

  const handlePrintSlip = () => {
    window.print();
  };

  return (
    <div className="page-shell light-shell">
      <main className="container" style={{ padding: '32px 0', maxWidth: '1400px' }}>

        {/* Back Link & Top Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <button 
            onClick={() => navigate('/ops-board')}
            className="neutral-btn" 
            style={{ padding: '8px 16px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600 }}
          >
            <ArrowLeft size={16} /> Back to Dashboard
          </button>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setIsPrintPayrollOpen(true)}
              className="neutral-btn"
              style={{ padding: '10px 18px', borderRadius: '10px', fontWeight: 700, fontSize: '14px', display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
            >
              <Printer size={16} /> Print Bonus Payout Sheet
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="primary-green"
              style={{ padding: '10px 20px', borderRadius: '10px', fontWeight: 700, fontSize: '14px', display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', border: 'none' }}
            >
              <Plus size={16} /> Record Deduction
            </button>
          </div>
        </div>

        {/* Page Header */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#f5f3ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                Rider Payroll &amp; Bonuses
              </h1>
              <p className="muted-text" style={{ fontSize: '15px', color: '#64748b', margin: 0, marginTop: '2px' }}>
                Track 1-cedi pickup &amp; dropoff bonuses, manage weekly disbursements, and audit earnings deductions.
              </p>
            </div>
          </div>
        </div>

        {/* KPI Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '28px' }}>
          
          {/* Total Bonuses Card */}
          <div className="glass-card" style={{ padding: '22px', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', borderLeft: '4px solid #7c3aed', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Bonuses ({timelineInfo.label})
              </div>
              <div style={{ fontSize: '30px', fontWeight: 800, color: '#7c3aed', marginTop: '6px' }}>
                GHS {(bonusSummary?.totalAmount ?? 0).toFixed(2)}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                {bonusSummary?.totalCount ?? 0} total stops completed
              </div>
            </div>
            <div style={{ width: '48px', height: '48px', background: '#f5f3ff', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c3aed' }}>
              <Zap size={22} />
            </div>
          </div>

          {/* Pickup Bonuses Card */}
          <div className="glass-card" style={{ padding: '22px', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', borderLeft: '4px solid #0284c7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Pickups Made
              </div>
              <div style={{ fontSize: '30px', fontWeight: 800, color: '#0284c7', marginTop: '6px' }}>
                {bonusSummary?.pickupCount ?? 0} <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 600 }}>@ 1 GHS</span>
              </div>
              <div style={{ fontSize: '12px', color: '#0369a1', marginTop: '4px', fontWeight: 700 }}>
                GHS {(bonusSummary?.pickupAmount ?? 0).toFixed(2)} earned
              </div>
            </div>
            <div style={{ width: '48px', height: '48px', background: '#e0f2fe', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7' }}>
              <ArrowDownLeft size={22} />
            </div>
          </div>

          {/* Dropoff Bonuses Card */}
          <div className="glass-card" style={{ padding: '22px', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', borderLeft: '4px solid #16a34a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Dropoffs Made
              </div>
              <div style={{ fontSize: '30px', fontWeight: 800, color: '#16a34a', marginTop: '6px' }}>
                {bonusSummary?.dropoffCount ?? 0} <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 600 }}>@ 1 GHS</span>
              </div>
              <div style={{ fontSize: '12px', color: '#15803d', marginTop: '4px', fontWeight: 700 }}>
                GHS {(bonusSummary?.dropoffAmount ?? 0).toFixed(2)} earned
              </div>
            </div>
            <div style={{ width: '48px', height: '48px', background: '#dcfce7', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
              <ArrowUpRight size={22} />
            </div>
          </div>

          {/* Net Disbursable Bonuses */}
          <div className="glass-card" style={{ padding: '22px', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', borderLeft: '4px solid #078c35', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Net Payable (Bonuses - Deds)
              </div>
              <div style={{ fontSize: '30px', fontWeight: 800, color: '#078c35', marginTop: '6px' }}>
                GHS {totalWeeklyNetToDisburse.toFixed(2)}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                Ready for weekly disbursement
              </div>
            </div>
            <div style={{ width: '48px', height: '48px', background: '#dcfce7', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#078c35' }}>
              <Wallet size={22} />
            </div>
          </div>

        </div>

        {/* Timeline Selector & View Tabs */}
        <div style={{ background: '#fff', padding: '18px 24px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
          
          {/* Main View Tabs */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setActiveTab('payouts')}
              style={{
                background: activeTab === 'payouts' ? '#0f172a' : '#f1f5f9',
                color: activeTab === 'payouts' ? '#ffffff' : '#475569',
                border: 'none',
                borderRadius: '10px',
                padding: '10px 18px',
                fontSize: '13.5px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Wallet size={16} /> Weekly Payouts &amp; Bonuses
            </button>
            <button
              onClick={() => setActiveTab('bonuses')}
              style={{
                background: activeTab === 'bonuses' ? '#0f172a' : '#f1f5f9',
                color: activeTab === 'bonuses' ? '#ffffff' : '#475569',
                border: 'none',
                borderRadius: '10px',
                padding: '10px 18px',
                fontSize: '13.5px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Zap size={16} /> Bonuses Stream ({filteredBonuses.length})
            </button>
            <button
              onClick={() => setActiveTab('deductions')}
              style={{
                background: activeTab === 'deductions' ? '#0f172a' : '#f1f5f9',
                color: activeTab === 'deductions' ? '#ffffff' : '#475569',
                border: 'none',
                borderRadius: '10px',
                padding: '10px 18px',
                fontSize: '13.5px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertTriangle size={16} /> Deductions Manager ({filteredDeductions.length})
            </button>
          </div>

          {/* Timeline Quick Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f1f5f9', padding: '4px', borderRadius: '10px', flexWrap: 'wrap' }}>
            {(['this_week', 'last_week', 'this_month', 'today', 'custom'] as const).map(p => (
              <button
                key={p}
                onClick={() => setTimeline(p)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: timeline === p ? '#ffffff' : 'transparent',
                  color: timeline === p ? '#0f172a' : '#64748b',
                  boxShadow: timeline === p ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                {p === 'this_week' ? 'This Week' : p === 'last_week' ? 'Last Week' : p === 'this_month' ? 'This Month' : p === 'today' ? 'Today' : 'Custom'}
              </button>
            ))}
          </div>

        </div>

        {/* Custom Date Inputs (if custom selected) */}
        {timeline === 'custom' && (
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>From:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 600 }}
              />
            </label>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>To:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 600 }}
              />
            </label>
            <span style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>
              Showing records within selected timeline.
            </span>
          </div>
        )}

        {/* Search & Rider Filter Toolbar */}
        <div style={{ background: '#fff', padding: '16px 20px', borderRadius: '14px', border: '1px solid #e2e8f0', marginBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search rider name, phone, order #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '9px 12px 9px 36px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ width: '200px' }}>
            <CustomSelect
              value={selectedRiderFilter}
              onChange={setSelectedRiderFilter}
              options={riderFilterOptions}
              icon={<User size={14} />}
            />
          </div>

          {activeTab === 'deductions' && (
            <div style={{ width: '180px' }}>
              <CustomSelect
                value={selectedCategory}
                onChange={setSelectedCategory}
                options={CATEGORY_OPTIONS}
              />
            </div>
          )}

          {(selectedRiderFilter || selectedCategory || searchQuery) && (
            <button
              onClick={() => {
                setSelectedRiderFilter('');
                setSelectedCategory('');
                setSearchQuery('');
              }}
              className="neutral-btn"
              style={{ padding: '8px 12px', fontSize: '12px', borderRadius: '8px' }}
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* ========================================================= */}
        {/* VIEW 1: WEEKLY PAYOUTS & BONUSES SUMMARY (Per Rider)      */}
        {/* ========================================================= */}
        {activeTab === 'payouts' && (
          <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 20px rgba(15, 23, 42, 0.02)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                  Rider Bonus Disbursement Roster ({timelineInfo.label})
                </h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  Bonuses credited at GHS 1.00 per pickup stop and GHS 1.00 per dropoff stop
                </span>
              </div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#078c35' }}>
                Total Net To Pay: GHS {totalWeeklyNetToDisburse.toFixed(2)}
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '950px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Rider Details</th>
                    <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Vehicle</th>
                    <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase' }}>Pickups (GHS 1)</th>
                    <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' }}>Dropoffs (GHS 1)</th>
                    <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase' }}>Total Bonuses</th>
                    <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase' }}>Deductions</th>
                    <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: 700, color: '#078c35', textTransform: 'uppercase', textAlign: 'right' }}>Net Bonus Payable</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '16px' }}><Skeleton height="1.2em" width="140px" /></td>
                        <td style={{ padding: '16px' }}><Skeleton height="1.2em" width="90px" /></td>
                        <td style={{ padding: '16px' }}><Skeleton height="1.2em" width="80px" /></td>
                        <td style={{ padding: '16px' }}><Skeleton height="1.2em" width="80px" /></td>
                        <td style={{ padding: '16px' }}><Skeleton height="1.2em" width="80px" /></td>
                        <td style={{ padding: '16px' }}><Skeleton height="1.2em" width="80px" /></td>
                        <td style={{ padding: '16px' }}><Skeleton height="1.2em" width="80px" /></td>
                      </tr>
                    ))
                  ) : riderPayoutRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                        No riders found or no stops recorded for this timeline.
                      </td>
                    </tr>
                  ) : (
                    riderPayoutRows.map((r) => (
                      <tr key={r.riderId} className="hover-row" style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '14px' }}>
                            {r.riderName}
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>
                            {r.phone || 'No phone'}
                          </div>
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'capitalize' }}>
                            {r.vehicleType || 'Motorbike'}
                          </span>
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                            {r.vehicleId || 'Unassigned'}
                          </div>
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          <span style={{ fontWeight: 800, color: '#0284c7', fontSize: '14px' }}>
                            {r.pickupCount} stops
                          </span>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                            +GHS {(r.pickupCount * 1.00).toFixed(2)}
                          </div>
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          <span style={{ fontWeight: 800, color: '#16a34a', fontSize: '14px' }}>
                            {r.dropoffCount} stops
                          </span>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                            +GHS {(r.dropoffCount * 1.00).toFixed(2)}
                          </div>
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ fontWeight: 800, color: '#7c3aed', fontSize: '15px' }}>
                            GHS {r.totalBonusAmount.toFixed(2)}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                            {r.totalBonusCount} total stops
                          </div>
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ fontWeight: 700, color: r.deductionsAmount > 0 ? '#dc2626' : '#64748b', fontSize: '13px' }}>
                            {r.deductionsAmount > 0 ? `-GHS ${r.deductionsAmount.toFixed(2)}` : 'GHS 0.00'}
                          </div>
                          {r.deductionsCount > 0 && (
                            <div style={{ fontSize: '10px', color: '#dc2626' }}>
                              ({r.deductionsCount} deduction)
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                          <div style={{ fontWeight: 900, color: '#078c35', fontSize: '16px' }}>
                            GHS {r.netPayable.toFixed(2)}
                          </div>
                          <span style={{ fontSize: '10px', fontWeight: 700, color: '#166534', background: '#dcfce7', padding: '2px 6px', borderRadius: '4px' }}>
                            Ready to Pay
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 2: BONUSES STREAM (Itemized)                         */}
        {/* ========================================================= */}
        {activeTab === 'bonuses' && (
          <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                  Bonuses Transaction Stream ({timelineInfo.label})
                </h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  Live log of 1-cedi pickup and dropoff bonus credits
                </span>
              </div>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#7c3aed' }}>
                {filteredBonuses.length} Recorded Credits
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '950px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Date &amp; Time</th>
                    <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Rider</th>
                    <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Stop Type</th>
                    <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Order Reference</th>
                    <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Location</th>
                    <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'right' }}>Bonus Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBonuses.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                        No bonus credits recorded for this timeline.
                      </td>
                    </tr>
                  ) : (
                    filteredBonuses.map(b => {
                      const isPickup = b.type === 'pickup';
                      return (
                        <tr key={b.id} className="hover-row" style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '14px 18px', fontSize: '12.5px', color: '#64748b' }}>
                            <div style={{ fontWeight: 600, color: '#0f172a' }}>
                              {new Date(b.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                            </div>
                            <div style={{ fontSize: '11px' }}>
                              {new Date(b.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </td>
                          <td style={{ padding: '14px 18px' }}>
                            <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '13.5px' }}>
                              {b.rider?.user.name}
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>
                              {b.rider?.user.phone || 'No Phone'}
                            </div>
                          </td>
                          <td style={{ padding: '14px 18px' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              color: isPickup ? '#0369a1' : '#15803d',
                              background: isPickup ? '#e0f2fe' : '#dcfce7',
                              padding: '3px 8px',
                              borderRadius: '12px'
                            }}>
                              {isPickup ? <ArrowDownLeft size={13} /> : <ArrowUpRight size={13} />}
                              {isPickup ? 'Pickup Bonus' : 'Dropoff Bonus'}
                            </span>
                          </td>
                          <td style={{ padding: '14px 18px' }}>
                            <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#0f172a', fontSize: '13px' }}>
                              #{b.shipment?.trackingCode}
                            </span>
                          </td>
                          <td style={{ padding: '14px 18px', fontSize: '12.5px', color: '#475569' }}>
                            {isPickup ? b.shipment?.pickupLocation : b.shipment?.dropoffLocation}
                          </td>
                          <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                            <span style={{ fontSize: '15px', fontWeight: 900, color: '#7c3aed' }}>
                              +GHS {Number(b.amount || 1.00).toFixed(2)}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 3: DEDUCTIONS MANAGER (Existing fine tracking)       */}
        {/* ========================================================= */}
        {activeTab === 'deductions' && (
          <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 20px rgba(15, 23, 42, 0.02)' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '980px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '16px', fontSize: '12.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Date &amp; Ref</th>
                    <th style={{ padding: '16px', fontSize: '12.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Rider Info</th>
                    <th style={{ padding: '16px', fontSize: '12.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Category</th>
                    <th style={{ padding: '16px', fontSize: '12.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Amount</th>
                    <th style={{ padding: '16px', fontSize: '12.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Reason</th>
                    <th style={{ padding: '16px', fontSize: '12.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '16px' }}><Skeleton height="1.2em" width="80px" /></td>
                        <td style={{ padding: '16px' }}><Skeleton height="1.2em" width="130px" /></td>
                        <td style={{ padding: '16px' }}><Skeleton height="1.5em" width="100px" radius="20px" /></td>
                        <td style={{ padding: '16px' }}><Skeleton height="1.2em" width="90px" /></td>
                        <td style={{ padding: '16px' }}><Skeleton height="1.2em" width="200px" /></td>
                        <td style={{ padding: '16px' }}><Skeleton height="2em" width="80px" radius="8px" /></td>
                      </tr>
                    ))
                  ) : filteredDeductions.length > 0 ? (
                    filteredDeductions.map(deduction => {
                      const catMeta = CATEGORY_META[deduction.category] || CATEGORY_META.other;
                      const CatIcon = catMeta.icon;
                      return (
                        <tr key={deduction.id} className="hover-row" style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '16px', fontSize: '13px' }}>
                            <div style={{ fontWeight: 700, color: '#0f172a' }}>
                              #{deduction.id.slice(-6).toUpperCase()}
                            </div>
                            <div style={{ color: '#64748b', fontSize: '12px', marginTop: '2px' }}>
                              {new Date(deduction.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                            </div>
                          </td>
                          <td style={{ padding: '16px' }}>
                            <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '14px' }}>
                              {deduction.rider?.user.name ?? 'Unknown Rider'}
                            </div>
                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                              {deduction.rider?.user.phone || 'No phone'}
                            </div>
                          </td>
                          <td style={{ padding: '16px' }}>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: '6px',
                              padding: '4px 10px', borderRadius: '20px',
                              background: catMeta.bg, color: catMeta.text, border: `1px solid ${catMeta.border}`,
                              fontSize: '12px', fontWeight: 700
                            }}>
                              <CatIcon size={13} /> {catMeta.label}
                            </span>
                          </td>
                          <td style={{ padding: '16px' }}>
                            <div style={{ fontSize: '15px', fontWeight: 800, color: '#991b1b', fontFamily: 'monospace' }}>
                              - GHS {Number(deduction.amount).toFixed(2)}
                            </div>
                          </td>
                          <td style={{ padding: '16px', maxWidth: '300px' }}>
                            <div style={{ fontSize: '13px', color: '#334155', fontWeight: 500, lineHeight: 1.4 }}>
                              {deduction.reason}
                            </div>
                            {deduction.shipmentId && (
                              <div style={{ fontSize: '11px', color: '#078c35', marginTop: '4px', fontWeight: 600 }}>
                                Ref Order: #{deduction.shipmentId}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '16px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                              <button
                                onClick={() => setReceiptDeduction(deduction)}
                                title="Print Deduction Slip"
                                style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', color: '#334155' }}
                              >
                                <Printer size={15} />
                              </button>
                              <button
                                onClick={() => handleDeleteDeduction(deduction.id)}
                                title="Reverse / Delete Deduction"
                                style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', color: '#dc2626' }}
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} style={{ padding: 0 }}>
                        <EmptyState
                          icon={<Scale size={36} color="#078c35" />}
                          title="No Deductions Found"
                          message="There are no active deduction records matching your current filters."
                          actionLabel="Record New Deduction"
                          onAction={() => setIsCreateModalOpen(true)}
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODAL 1: RECORD NEW DEDUCTION                             */}
        {/* ========================================================= */}
        {isCreateModalOpen && (
          <Modal onClose={() => setIsCreateModalOpen(false)} title="Record Rider Deduction" maxWidth="520px">
            <form onSubmit={handleCreateDeduction} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Dispatch Rider *
                </label>
                <CustomSelect
                  value={formRiderId}
                  onChange={setFormRiderId}
                  options={riderOptions}
                  icon={<User size={16} />}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Deduction Amount (GHS) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="e.g. 25.00"
                    value={formAmount}
                    onChange={e => setFormAmount(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Category *
                  </label>
                  <CustomSelect
                    value={formCategory}
                    onChange={(val) => setFormCategory(val as DeductionCategory)}
                    options={CATEGORY_OPTIONS.filter(o => o.value !== '')}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Specific Reason / Audit Explanation *
                </label>
                <textarea
                  rows={3}
                  placeholder="Explain why this deduction is being applied..."
                  value={formReason}
                  onChange={e => setFormReason(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Related Shipment / Order Code (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. CPS-714399"
                  value={formShipmentId}
                  onChange={e => setFormShipmentId(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="checkbox"
                  id="notifyRiderCheck"
                  checked={formNotifyRider}
                  onChange={e => setFormNotifyRider(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#078c35', cursor: 'pointer' }}
                />
                <label htmlFor="notifyRiderCheck" style={{ fontSize: '13px', color: '#334155', cursor: 'pointer', fontWeight: 500 }}>
                  Send immediate in-app and email notification to rider
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="neutral-btn"
                  style={{ padding: '10px 18px', borderRadius: '8px', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="primary-green"
                  style={{ padding: '10px 24px', borderRadius: '8px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#dc2626', borderColor: '#b91c1c' }}
                >
                  {isSubmitting ? 'Recording...' : 'Confirm & Apply Deduction'}
                </button>
              </div>
            </form>
          </Modal>
        )}

        {/* ========================================================= */}
        {/* MODAL 2: PRINT OFFICIAL WEEKLY BONUS PAYROLL SHEET        */}
        {/* ========================================================= */}
        {isPrintPayrollOpen && (
          <Modal onClose={() => setIsPrintPayrollOpen(false)} maxWidth="900px" padding="0">
            <div style={{ padding: '36px', background: '#ffffff' }} id="printable-weekly-bonus-sheet">
              {/* Official Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0f172a', paddingBottom: '16px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <img src={cpsLogo} alt="CPS" style={{ height: '44px', objectFit: 'contain' }} />
                  <div>
                    <h2 style={{ fontSize: '18px', fontWeight: 900, textTransform: 'uppercase', margin: 0, color: '#0f172a' }}>
                      CPS Logistics
                    </h2>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#7c3aed', letterSpacing: '0.04em' }}>
                      OFFICIAL RIDER WEEKLY BONUS &amp; PAYOUT DISBURSEMENT SHEET
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '11.5px', color: '#475569' }}>
                  <div><strong>Timeline:</strong> {timelineInfo.label}</div>
                  <div><strong>Printed:</strong> {new Date().toLocaleDateString([], { dateStyle: 'medium' })}</div>
                  <div><strong>Reference:</strong> PAY-MNF-{Date.now().toString().slice(-6)}</div>
                </div>
              </div>

              {/* Summary Stats Strip */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px 16px', marginBottom: '24px' }}>
                <div>
                  <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>Total Riders</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>{riderPayoutRows.length} Active</div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>Total Bonuses</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#7c3aed' }}>GHS {totalWeeklyBonusesToPay.toFixed(2)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>Total Deductions</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#dc2626' }}>-GHS {totalWeeklyDeductionsOffset.toFixed(2)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>Net Disbursable</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#078c35' }}>GHS {totalWeeklyNetToDisburse.toFixed(2)}</div>
                </div>
              </div>

              {/* Roster Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '32px' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #334155' }}>
                    <th style={{ border: '1px solid #cbd5e1', padding: '8px' }}>Rider Name &amp; Phone</th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '8px' }}>Vehicle Plate</th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'center' }}>Pickups (GHS 1)</th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'center' }}>Dropoffs (GHS 1)</th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'right' }}>Total Bonus</th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'right' }}>Deductions</th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'right' }}>Net Payable</th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '8px', width: '130px', textAlign: 'center' }}>Rider Signature</th>
                  </tr>
                </thead>
                <tbody>
                  {riderPayoutRows.map(r => (
                    <tr key={r.riderId}>
                      <td style={{ border: '1px solid #cbd5e1', padding: '8px', fontWeight: 700 }}>
                        {r.riderName}
                        <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 400 }}>{r.phone || 'No phone'}</div>
                      </td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
                        {r.vehicleId || 'Unassigned'} ({r.vehicleType || 'Bike'})
                      </td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'center', fontWeight: 700, color: '#0284c7' }}>
                        {r.pickupCount}
                      </td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'center', fontWeight: 700, color: '#16a34a' }}>
                        {r.dropoffCount}
                      </td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'right', fontWeight: 800 }}>
                        GHS {r.totalBonusAmount.toFixed(2)}
                      </td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'right', color: r.deductionsAmount > 0 ? '#dc2626' : '#64748b' }}>
                        {r.deductionsAmount > 0 ? `-GHS ${r.deductionsAmount.toFixed(2)}` : 'GHS 0.00'}
                      </td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'right', fontWeight: 900, color: '#078c35', fontSize: '12px' }}>
                        GHS {r.netPayable.toFixed(2)}
                      </td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'center' }}>
                        <div style={{ borderBottom: '1px solid #000', height: '18px', width: '90%', margin: '0 auto' }} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Sign-off Footer */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', paddingTop: '20px', borderTop: '2px solid #0f172a' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#475569', marginBottom: '28px' }}>
                    Operations Disbursing Officer
                  </div>
                  <div style={{ borderBottom: '1px solid #000', marginBottom: '4px' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748b' }}>
                    <span>Name &amp; Signature</span>
                    <span>Date / Time</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#475569', marginBottom: '28px' }}>
                    Finance Verification &amp; Audit
                  </div>
                  <div style={{ borderBottom: '1px solid #000', marginBottom: '4px' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748b' }}>
                    <span>Officer Sign-off</span>
                    <span>Date / Time</span>
                  </div>
                </div>
              </div>

              {/* Modal Buttons (Hidden in Print) */}
              <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={() => setIsPrintPayrollOpen(false)}
                  className="neutral-btn"
                  style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600 }}
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handlePrintSlip}
                  className="primary-green"
                  style={{ padding: '8px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Printer size={15} /> Print Roster
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* ========================================================= */}
        {/* MODAL 3: PRINT DEDUCTION SLIP                             */}
        {/* ========================================================= */}
        {receiptDeduction && (
          <Modal onClose={() => setReceiptDeduction(null)} maxWidth="520px" padding="0">
            <div style={{ padding: '32px' }} id="printable-deduction-slip">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0f172a', paddingBottom: '16px', marginBottom: '20px' }}>
                <div>
                  <img src={cpsLogo} alt="CPS" style={{ height: '36px', objectFit: 'contain' }} />
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                    Official Rider Deduction Notice
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace' }}>
                    REF: #{receiptDeduction.id.slice(-8).toUpperCase()}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                    {new Date(receiptDeduction.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>

              <div style={{ background: '#fef2f2', border: '1px dashed #f87171', borderRadius: '12px', padding: '18px', textAlign: 'center', marginBottom: '20px' }}>
                <div style={{ fontSize: '12px', textTransform: 'uppercase', color: '#991b1b', fontWeight: 800, letterSpacing: '0.05em' }}>
                  Total Deducted Amount
                </div>
                <div style={{ fontSize: '32px', fontWeight: 900, color: '#991b1b', marginTop: '4px', fontFamily: 'monospace' }}>
                  - GHS {Number(receiptDeduction.amount).toFixed(2)}
                </div>
                <div style={{ fontSize: '12px', color: '#b91c1c', fontWeight: 600, marginTop: '4px' }}>
                  Category: {CATEGORY_META[receiptDeduction.category]?.label || receiptDeduction.category}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px', fontSize: '13.5px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                  <span style={{ color: '#64748b' }}>Rider Name:</span>
                  <strong style={{ color: '#0f172a' }}>{receiptDeduction.rider?.user.name}</strong>
                </div>
                {receiptDeduction.rider?.user.phone && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                    <span style={{ color: '#64748b' }}>Phone Number:</span>
                    <strong style={{ color: '#0f172a' }}>{receiptDeduction.rider.user.phone}</strong>
                  </div>
                )}
                {receiptDeduction.shipmentId && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                    <span style={{ color: '#64748b' }}>Shipment Reference:</span>
                    <strong style={{ color: '#078c35', fontFamily: 'monospace' }}>#{receiptDeduction.shipmentId}</strong>
                  </div>
                )}
                <div>
                  <span style={{ color: '#64748b', display: 'block', marginBottom: '4px' }}>Incident Reason / Notes:</span>
                  <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', color: '#0f172a', fontWeight: 500, lineHeight: 1.4, border: '1px solid #e2e8f0' }}>
                    {receiptDeduction.reason}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '32px', paddingTop: '16px', borderTop: '1px dashed #cbd5e1' }}>
                <div>
                  <div style={{ height: '32px', borderBottom: '1px solid #0f172a', marginBottom: '4px' }} />
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textAlign: 'center' }}>Operations Officer</div>
                </div>
                <div>
                  <div style={{ height: '32px', borderBottom: '1px solid #0f172a', marginBottom: '4px' }} />
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textAlign: 'center' }}>Rider Acknowledgment</div>
                </div>
              </div>

              <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={() => setReceiptDeduction(null)}
                  className="neutral-btn"
                  style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600 }}
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handlePrintSlip}
                  className="primary-green"
                  style={{ padding: '8px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Printer size={14} /> Print Slip
                </button>
              </div>
            </div>
          </Modal>
        )}

        <style>{`
          .hover-row:hover { background: #f8fafc !important; }
          @media print {
            #root { display: none !important; }
            .no-print { display: none !important; }
            .modal-overlay {
              position: static !important;
              background: none !important;
              backdrop-filter: none !important;
              padding: 0 !important;
            }
            .modal-shell {
              position: static !important;
              overflow: visible !important;
              max-height: none !important;
              box-shadow: none !important;
            }
          }
        `}</style>
      </main>
    </div>
  );
}
