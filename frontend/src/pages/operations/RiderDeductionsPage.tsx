import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Search, Plus, Trash2, Printer, AlertTriangle,
  User, ShieldAlert, Banknote,
  FileText, Clock, X, ChevronRight, Scale, Fuel, Wrench, Phone
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import api from '../../services/api';
import EmptyState from '../../components/EmptyState';
import { Skeleton } from '../../components/Skeleton';
import CustomSelect from '../../components/Form/CustomSelect';
import Modal from '../../components/Modal';
import { useToast } from '../../contexts/ToastContext';
import type { RiderDeduction, DeductionCategory, RiderProfile, DeductionSummary } from '../../types/models';
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

export default function RiderDeductionsPage() {
  const toast = useToast();
  const navigate = useNavigate();

  const [deductions, setDeductions] = useState<RiderDeduction[]>([]);
  const [riders, setRiders] = useState<RiderProfile[]>([]);
  const [summary, setSummary] = useState<DeductionSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedRiderFilter, setSelectedRiderFilter] = useState<string>('');

  // New Deduction Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formRiderId, setFormRiderId] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formCategory, setFormCategory] = useState<DeductionCategory>('disciplinary');
  const [formReason, setFormReason] = useState('');
  const [formShipmentId, setFormShipmentId] = useState('');
  const [formNotifyRider, setFormNotifyRider] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Print Receipt Modal
  const [receiptDeduction, setReceiptDeduction] = useState<RiderDeduction | null>(null);

  // Deletion state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [deductionsRes, ridersRes, summaryRes] = await Promise.all([
        api.get<RiderDeduction[]>('/deductions'),
        api.get<RiderProfile[]>('/riders'),
        api.get<DeductionSummary>('/deductions/summary'),
      ]);
      setDeductions(deductionsRes.data);
      setRiders(ridersRes.data);
      setSummary(summaryRes.data);
    } catch {
      toast.error('Failed to load deductions data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const riderOptions = useMemo(() => [
    { value: '', label: 'Select Dispatch Rider' },
    ...riders.map(r => ({ value: r.id, label: `${r.user.name} (${r.vehicleType || 'Fleet'})` })),
  ], [riders]);

  const riderFilterOptions = useMemo(() => [
    { value: '', label: 'All Riders' },
    ...riders.map(r => ({ value: r.id, label: r.user.name })),
  ], [riders]);

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
      // Reset form
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

    setDeletingId(id);
    try {
      await api.delete(`/deductions/${id}`);
      setDeductions(prev => prev.filter(d => d.id !== id));
      toast.success('Deduction reversed successfully.');
      // Refresh summary
      api.get<DeductionSummary>('/deductions/summary').then(res => setSummary(res.data)).catch(() => {});
    } catch {
      toast.error('Failed to reverse deduction.');
    } finally {
      setDeletingId(null);
    }
  };

  const handlePrintSlip = () => {
    window.print();
  };

  return (
    <div className="page-shell light-shell">
      <main className="container" style={{ padding: '32px 24px', maxWidth: '1400px', marginBottom: '80px' }}>
        
        {/* Breadcrumb Navigation */}
        <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <button 
            onClick={() => navigate('/ops-board')}
            className="neutral-btn" 
            style={{ padding: '8px 16px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600 }}
          >
            <ArrowLeft size={16} /> Back to Dashboard
          </button>

          <div style={{ display: 'flex', gap: '10px' }}>
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
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#fee2e2', color: '#991b1b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Banknote size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                Rider Earnings Deductions
              </h1>
              <p className="muted-text" style={{ fontSize: '15px', color: '#64748b', margin: 0, marginTop: '2px' }}>
                Record and manage fines, damaged parcel liabilities, fuel advances, and earnings adjustments.
              </p>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
          
          <div className="glass-card" style={{ padding: '22px', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Deductions</div>
              <div style={{ fontSize: '30px', fontWeight: 800, color: '#991b1b', marginTop: '6px' }}>
                GHS {(summary?.totalAmount ?? 0).toFixed(2)}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Recorded across all riders</div>
            </div>
            <div style={{ width: '48px', height: '48px', background: '#fef2f2', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
              <Scale size={22} />
            </div>
          </div>

          <div className="glass-card" style={{ padding: '22px', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Incidents</div>
              <div style={{ fontSize: '30px', fontWeight: 800, color: '#0f172a', marginTop: '6px' }}>
                {summary?.totalCount ?? 0}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Active penalty &amp; recovery items</div>
            </div>
            <div style={{ width: '48px', height: '48px', background: '#fff7ed', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ea580c' }}>
              <FileText size={22} />
            </div>
          </div>

          <div className="glass-card" style={{ padding: '22px', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Impacted Riders</div>
              <div style={{ fontSize: '30px', fontWeight: 800, color: '#0f172a', marginTop: '6px' }}>
                {summary?.uniqueRiders ?? 0}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Riders with active deductions</div>
            </div>
            <div style={{ width: '48px', height: '48px', background: '#e2e8f0', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0f172a' }}>
              <User size={22} />
            </div>
          </div>

          <div className="glass-card" style={{ padding: '22px', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fuel &amp; Advances</div>
              <div style={{ fontSize: '30px', fontWeight: 800, color: '#166534', marginTop: '6px' }}>
                GHS {(summary?.categoryBreakdown?.['fuel_advance'] ?? 0).toFixed(2)}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Recovered advance payments</div>
            </div>
            <div style={{ width: '48px', height: '48px', background: '#f0fdf4', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
              <Fuel size={22} />
            </div>
          </div>

        </div>

        {/* Filter Toolbar */}
        <div style={{ background: '#fff', padding: '18px 24px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', flex: 1, minWidth: '320px' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
              <Search size={17} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search by rider name, phone, reason, or order #..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '10px 14px 10px 38px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px' }}
              />
            </div>

            <div style={{ width: '180px' }}>
              <CustomSelect
                value={selectedCategory}
                onChange={setSelectedCategory}
                options={CATEGORY_OPTIONS}
              />
            </div>

            <div style={{ width: '180px' }}>
              <CustomSelect
                value={selectedRiderFilter}
                onChange={setSelectedRiderFilter}
                options={riderFilterOptions}
                icon={<User size={15} />}
              />
            </div>
          </div>

          {(selectedCategory || selectedRiderFilter || searchQuery) && (
            <button
              onClick={() => {
                setSelectedCategory('');
                setSelectedRiderFilter('');
                setSearchQuery('');
              }}
              className="neutral-btn"
              style={{ padding: '8px 14px', fontSize: '13px', borderRadius: '8px' }}
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Deductions Table */}
        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 20px rgba(15, 23, 42, 0.02)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '980px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '16px', fontSize: '12.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date &amp; Ref</th>
                  <th style={{ padding: '16px', fontSize: '12.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rider Info</th>
                  <th style={{ padding: '16px', fontSize: '12.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Category</th>
                  <th style={{ padding: '16px', fontSize: '12.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Amount</th>
                  <th style={{ padding: '16px', fontSize: '12.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reason &amp; Order Link</th>
                  <th style={{ padding: '16px', fontSize: '12.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
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
                      <tr key={deduction.id} style={{ borderBottom: '1px solid #e2e8f0', transition: 'background 0.2s' }} className="hover-row">
                        <td style={{ padding: '16px' }}>
                          <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '13.5px' }}>
                            {new Date(deduction.createdAt).toLocaleDateString()}
                          </div>
                          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px', fontFamily: 'monospace' }}>
                            #{deduction.id.slice(-6).toUpperCase()}
                          </div>
                        </td>

                        <td style={{ padding: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: '#e2e8f0', color: '#0f172a', fontWeight: 800, fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {deduction.rider?.user.name.charAt(0) || 'R'}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '14px' }}>
                                {deduction.rider?.user.name}
                              </div>
                              {deduction.rider?.user.phone && (
                                <a href={`tel:${deduction.rider.user.phone}`} style={{ fontSize: '12px', color: '#078c35', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                  <Phone size={11} /> {deduction.rider.user.phone}
                                </a>
                              )}
                            </div>
                          </div>
                        </td>

                        <td style={{ padding: '16px' }}>
                          <span style={{
                            background: catMeta.bg, color: catMeta.text, border: `1px solid ${catMeta.border}`,
                            padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 700,
                            display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap'
                          }}>
                            <CatIcon size={13} />
                            {catMeta.label}
                          </span>
                        </td>

                        <td style={{ padding: '16px' }}>
                          <span style={{
                            background: '#fee2e2', color: '#991b1b',
                            padding: '4px 10px', borderRadius: '8px', fontSize: '14px', fontWeight: 800,
                            fontFamily: 'monospace', display: 'inline-block'
                          }}>
                            - GHS {Number(deduction.amount).toFixed(2)}
                          </span>
                        </td>

                        <td style={{ padding: '16px' }}>
                          <div style={{ fontSize: '13.5px', color: '#334155', fontWeight: 500, lineHeight: 1.4 }}>
                            {deduction.reason}
                          </div>
                          {deduction.shipmentId && (
                            <Link
                              to={`/ops/tracking/${deduction.shipmentId}`}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#078c35', fontWeight: 600, textDecoration: 'none', marginTop: '4px' }}
                            >
                              Linked Order: #{deduction.shipmentId} <ChevronRight size={12} />
                            </Link>
                          )}
                        </td>

                        <td style={{ padding: '16px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '8px' }}>
                            <button
                              onClick={() => setReceiptDeduction(deduction)}
                              className="contact-btn contact-btn-copy"
                              style={{ padding: '6px 12px', fontSize: '12px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              title="Print / View Deduction Slip"
                            >
                              <Printer size={13} /> Slip
                            </button>
                            <button
                              onClick={() => handleDeleteDeduction(deduction.id)}
                              disabled={deletingId === deduction.id}
                              style={{
                                background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca',
                                padding: '6px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px'
                              }}
                              title="Reverse this deduction"
                            >
                              <Trash2 size={13} /> {deletingId === deduction.id ? 'Reversing...' : 'Reverse'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} style={{ padding: '36px' }}>
                      <EmptyState
                        icon={<Banknote size={36} />}
                        title="No Deductions Found"
                        message="There are currently no deduction records matching your search or filters."
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RECORD DEDUCTION MODAL */}
        {isCreateModalOpen && (
          <Modal onClose={() => setIsCreateModalOpen(false)} maxWidth="580px" padding="0">
            <form onSubmit={handleCreateDeduction} style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Scale size={22} color="#dc2626" /> Record Rider Earnings Deduction
                  </h3>
                  <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                    Deductions are recorded against rider payouts and sent as account notifications.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Rider Select */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                  Target Rider *
                </label>
                <CustomSelect
                  value={formRiderId}
                  onChange={setFormRiderId}
                  options={riderOptions}
                  icon={<User size={16} />}
                />
              </div>

              {/* Deduction Amount & Category */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                    Deduction Amount (GHS) *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: '#64748b', fontSize: '14px' }}>GHS</span>
                    <input
                      type="number"
                      step="0.50"
                      min="1"
                      required
                      placeholder="e.g. 25.00"
                      value={formAmount}
                      onChange={e => setFormAmount(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px 10px 52px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px', fontWeight: 700, boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                    Category *
                  </label>
                  <CustomSelect
                    value={formCategory}
                    onChange={(val) => setFormCategory(val as DeductionCategory)}
                    options={CATEGORY_OPTIONS.filter(c => c.value !== '')}
                  />
                </div>
              </div>

              {/* Associated Shipment ID (Optional) */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0f172a', marginBottom: '6px' }}>
                  Linked Shipment / Order Tracking Code (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. CPS-ABC123XY"
                  value={formShipmentId}
                  onChange={e => setFormShipmentId(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>

              {/* Reason / Justification */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                  Reason &amp; Incident Description *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Detailed explanation for this deduction (e.g. Parcel damaged during transit on route to Ahodwo, or agreed fuel advance on Aug 29)..."
                  value={formReason}
                  onChange={e => setFormReason(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
              </div>

              {/* Notification Toggle */}
              <div style={{ marginBottom: '24px', background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '10px' }}>
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

              {/* Form Actions */}
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

        {/* PRINTABLE DEDUCTION SLIP MODAL */}
        {receiptDeduction && (
          <Modal onClose={() => setReceiptDeduction(null)} maxWidth="520px" padding="0">
            <div style={{ padding: '32px' }} id="printable-deduction-slip">
              {/* Slip Header */}
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

              {/* Amount Box */}
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

              {/* Breakdown Fields */}
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

              {/* Signature Lines */}
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

              {/* Modal Buttons (Hidden in print) */}
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
            body * { visibility: hidden; }
            #printable-deduction-slip, #printable-deduction-slip * { visibility: visible; }
            #printable-deduction-slip { position: absolute; left: 0; top: 0; width: 100%; }
            .no-print { display: none !important; }
          }
        `}</style>
      </main>
    </div>
  );
}
