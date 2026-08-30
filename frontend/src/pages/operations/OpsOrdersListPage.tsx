import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Zap, Car, Bike, Truck, PackageSearch, DollarSign, Check, Edit3, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import api from '../../services/api';
import EmptyState from '../../components/EmptyState';
import { Skeleton } from '../../components/Skeleton';
import Modal from '../../components/Modal';
import { useToast } from '../../contexts/ToastContext';
import type { Shipment, ShipmentStatus, VehicleType } from '../../types/models';

interface OpsOrdersListPageProps {
  filterType: 'new' | 'active';
}

const VEHICLE_ICONS: Record<VehicleType, LucideIcon> = {
  motorbike: Bike,
  van: Car,
  truck: Truck,
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

const STATUS_COLORS: Record<ShipmentStatus, { bg: string; text: string; dot: string }> = {
  awaiting_price: { bg: '#fff7ed', text: '#c2410c', dot: '#f97316' },
  pending: { bg: '#f1f5f9', text: '#475569', dot: '#94a3b8' },
  picked_up: { bg: '#ecfccb', text: '#3f6212', dot: '#84cc16' },
  in_transit: { bg: '#e0ffe0', text: '#22863a', dot: '#22863a' },
  out_for_delivery: { bg: '#e2e8f0', text: '#0f172a', dot: '#334155' },
  delivered: { bg: '#f1f5f9', text: '#475569', dot: '#94a3b8' },
  delayed: { bg: '#fee2e2', text: '#991b1b', dot: '#ef4444' },
  failed: { bg: '#fee2e2', text: '#991b1b', dot: '#ef4444' },
  cancelled: { bg: '#f1f5f9', text: '#64748b', dot: '#94a3b8' },
};

export default function OpsOrdersListPage({ filterType }: OpsOrdersListPageProps) {
  const toast = useToast();
  const navigate = useNavigate();

  const [orders, setOrders] = useState<Shipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Quick Price Modal State for New Orders
  const [selectedOrderForPricing, setSelectedOrderForPricing] = useState<Shipment | null>(null);
  const [priceMode, setPriceMode] = useState<'accept' | 'adjust'>('accept');
  const [customPrice, setCustomPrice] = useState('');
  const [opsRemarks, setOpsRemarks] = useState('');
  const [isSubmittingPrice, setIsSubmittingPrice] = useState(false);

  const title = filterType === 'new' ? 'New Orders' : 'Active Orders';
  const subtitle = filterType === 'new'
    ? 'Review orders, set or accept prices, and dispatch riders to the active queue.'
    : 'Orders currently being fulfilled by riders.';

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const ordersRes = await api.get<Shipment[]>('/shipments');
        setOrders(ordersRes.data);
      } catch {
        toast.error('Failed to load orders.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [filterType, toast]);

  const filteredOrders = useMemo(() => {
    let filtered = orders.filter(order => {
      if (filterType === 'new') {
        return order.status === 'awaiting_price';
      } else {
        return ['pending', 'picked_up', 'in_transit', 'out_for_delivery'].includes(order.status);
      }
    });

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(order =>
        order.trackingCode.toLowerCase().includes(q) ||
        order.receiverName.toLowerCase().includes(q) ||
        order.senderName.toLowerCase().includes(q) ||
        order.pickupLocation.toLowerCase().includes(q) ||
        order.dropoffLocation.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [orders, filterType, searchQuery]);

  const handleOpenPricingModal = (order: Shipment) => {
    setSelectedOrderForPricing(order);
    setPriceMode('accept');
    setCustomPrice(String(order.deliveryFee));
    setOpsRemarks(order.opsRemarks ?? '');
  };

  const handleConfirmPriceAndProcess = async () => {
    if (!selectedOrderForPricing) return;
    const finalFee = priceMode === 'accept'
      ? Number(selectedOrderForPricing.deliveryFee)
      : Number(customPrice);

    if (isNaN(finalFee) || finalFee < 0) {
      toast.error('Please enter a valid price amount.');
      return;
    }

    setIsSubmittingPrice(true);
    try {
      const { data } = await api.patch<Shipment>(`/shipments/${selectedOrderForPricing.id}/process`, {
        deliveryFee: finalFee,
        opsRemarks: opsRemarks || undefined,
      });

      // Update orders list
      setOrders(prev => prev.map(o => o.id === data.id ? data : o));
      setSelectedOrderForPricing(null);
      toast.success(`Order ${data.trackingCode} price confirmed (GHS ${finalFee.toFixed(2)}) and moved to active queue.`);
    } catch {
      toast.error('Failed to process order pricing. Please try again.');
    } finally {
      setIsSubmittingPrice(false);
    }
  };

  return (
    <div className="page-shell light-shell">
      <main className="container" style={{ padding: '32px 24px', maxWidth: '1400px', marginBottom: '80px' }}>

        <div style={{ marginBottom: '24px' }}>
          <button
            onClick={() => navigate('/ops-board')}
            className="neutral-btn"
            style={{ padding: '8px 16px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600 }}
          >
            <ArrowLeft size={16} /> Back to Dashboard
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', marginBottom: '8px', letterSpacing: '-0.02em' }}>
              {title}
            </h1>
            <p className="muted-text" style={{ fontSize: '16px', color: '#64748b' }}>
              {subtitle}
            </p>
          </div>

          <div style={{ position: 'relative', width: '100%', maxWidth: '300px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search by code, sender, receiver, area..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '12px 16px 12px 40px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '14px' }}
            />
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '950px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '16px', fontSize: '13px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Order ID</th>
                  <th style={{ padding: '16px', fontSize: '13px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Customer & Route</th>
                  <th style={{ padding: '16px', fontSize: '13px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Service</th>
                  <th style={{ padding: '16px', fontSize: '13px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {filterType === 'new' ? 'Estimated Fee' : 'Rider'}
                  </th>
                  <th style={{ padding: '16px', fontSize: '13px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                  <th style={{ padding: '16px', fontSize: '13px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '16px' }}><Skeleton height="1.2em" width="80px" /></td>
                      <td style={{ padding: '16px' }}>
                        <Skeleton height="1.2em" width="120px" style={{ marginBottom: '4px' }} />
                        <Skeleton height="1em" width="100px" />
                      </td>
                      <td style={{ padding: '16px' }}><Skeleton height="1.2em" width="90px" /></td>
                      <td style={{ padding: '16px' }}><Skeleton height="1.2em" width="110px" /></td>
                      <td style={{ padding: '16px' }}><Skeleton height="1.5em" width="100px" radius="20px" /></td>
                      <td style={{ padding: '16px' }}><Skeleton height="2em" width="80px" radius="8px" /></td>
                    </tr>
                  ))
                ) : filteredOrders.length > 0 ? (
                  filteredOrders.map(order => {
                    const colors = STATUS_COLORS[order.status];
                    const isUrgent = order.priority === 'high';
                    const VehicleIcon = VEHICLE_ICONS[order.vehicleType];
                    return (
                      <tr key={order.id} style={{ borderBottom: '1px solid #e2e8f0', background: isUrgent ? '#fffbeb' : '#fff', transition: 'background 0.2s' }} className="hover-row">
                        <td style={{ padding: '16px' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '15px' }}>{order.trackingCode}</div>
                          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                            {new Date(order.createdAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td style={{ padding: '16px' }}>
                          <div style={{ fontSize: '14px', color: '#0f172a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0f172a' }}></span>
                            {order.senderName} ({order.pickupLocation})
                          </div>
                          <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#078c35' }}></span>
                            → {order.receiverName} ({order.dropoffLocation})
                          </div>
                        </td>
                        <td style={{ padding: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: '#475569', textTransform: 'capitalize' }}>
                            <VehicleIcon size={16} /> {order.vehicleType}
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', textTransform: 'capitalize' }}>
                            {order.batchId ? 'Bulk' : order.speed.replace('_', ' ')}
                          </div>
                          {isUrgent && (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fef9c3', color: '#854d0e', padding: '2px 6px', borderRadius: '6px', fontSize: '11px', fontWeight: 800, letterSpacing: '0.03em', marginTop: '4px' }}>
                              <Zap size={12} /> URGENT
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '16px' }}>
                          {filterType === 'new' ? (
                            <div>
                              <strong style={{ fontSize: '15px', color: '#0f172a' }}>
                                GHS {Number(order.deliveryFee).toFixed(2)}
                              </strong>
                              <div style={{ fontSize: '11px', color: '#64748b' }}>Initial estimate</div>
                            </div>
                          ) : (
                            <div style={{ fontSize: '14px', color: '#475569' }}>
                              {order.assignedRider?.user.name ?? <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Unassigned</span>}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '16px' }}>
                          <span style={{
                            background: colors.bg, color: colors.text,
                            padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 700,
                            display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap'
                          }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: colors.dot }}></span>
                            {STATUS_LABELS[order.status]}
                          </span>
                        </td>
                        <td style={{ padding: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {filterType === 'new' ? (
                              <button
                                onClick={() => handleOpenPricingModal(order)}
                                className="primary-green"
                                style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', border: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                              >
                                <DollarSign size={14} /> Set Price
                              </button>
                            ) : (
                              <Link
                                to={`/ops/tracking/${order.trackingCode}`}
                                className="primary-green"
                                style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, textDecoration: 'none', display: 'inline-block' }}
                              >
                                View Details
                              </Link>
                            )}
                            <Link
                              to={`/ops/tracking/${order.trackingCode}`}
                              className="contact-btn contact-btn-copy"
                              style={{ padding: '8px 12px', fontSize: '12px' }}
                              title="View Full Details"
                            >
                              Details
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} style={{ padding: '32px' }}>
                      <EmptyState
                        icon={<PackageSearch size={36} />}
                        title={`No ${title} Found`}
                        message={`There are currently no orders in the ${title.toLowerCase()} category.`}
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* REVIEW & SET PRICE MODAL */}
        {selectedOrderForPricing && (
          <Modal onClose={() => setSelectedOrderForPricing(null)} maxWidth="640px" padding="0">
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <DollarSign size={22} color="#078c35" /> Set Price for Order #{selectedOrderForPricing.trackingCode}
                  </h3>
                  <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                    Set or accept the price to approve this order and move it to the active queue.
                  </div>
                </div>
                <button
                  onClick={() => setSelectedOrderForPricing(null)}
                  style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Order Quick Context */}
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span style={{ color: '#64748b' }}>Sender:</span>
                  <strong style={{ color: '#0f172a' }}>{selectedOrderForPricing.senderName} ({selectedOrderForPricing.senderNumber})</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span style={{ color: '#64748b' }}>Pickup:</span>
                  <strong style={{ color: '#0f172a' }}>{selectedOrderForPricing.pickupLocation}, {selectedOrderForPricing.pickupRegion}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span style={{ color: '#64748b' }}>Recipient:</span>
                  <strong style={{ color: '#0f172a' }}>{selectedOrderForPricing.receiverName} ({selectedOrderForPricing.receiverNumber})</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span style={{ color: '#64748b' }}>Dropoff:</span>
                  <strong style={{ color: '#0f172a' }}>{selectedOrderForPricing.dropoffLocation}, {selectedOrderForPricing.dropoffRegion}</strong>
                </div>
              </div>

              {/* Pricing Choice */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '10px' }}>
                  Operations Pricing Decision *
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <button
                    type="button"
                    onClick={() => setPriceMode('accept')}
                    style={{
                      padding: '14px',
                      borderRadius: '10px',
                      border: priceMode === 'accept' ? '2px solid #078c35' : '1px solid #e2e8f0',
                      background: priceMode === 'accept' ? '#f0fdf4' : '#fff',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#166534', fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>
                      <Check size={16} /> Accept Estimate
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                      GHS {Number(selectedOrderForPricing.deliveryFee).toFixed(2)}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPriceMode('adjust')}
                    style={{
                      padding: '14px',
                      borderRadius: '10px',
                      border: priceMode === 'adjust' ? '2px solid #078c35' : '1px solid #e2e8f0',
                      background: priceMode === 'adjust' ? '#f0fdf4' : '#fff',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0f172a', fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>
                      <Edit3 size={16} /> Adjust Price
                    </div>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>
                      Enter custom delivery fee
                    </div>
                  </button>
                </div>

                {priceMode === 'adjust' && (
                  <div style={{ marginBottom: '16px', background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Custom Delivery Fee (GHS) *
                    </label>
                    <input
                      type="number"
                      value={customPrice}
                      onChange={(e) => setCustomPrice(e.target.value)}
                      placeholder="e.g. 40.00"
                      autoFocus
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '16px', fontWeight: 700, background: '#fff', boxSizing: 'border-box' }}
                    />
                  </div>
                )}
              </div>

              {/* Internal Remarks */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0f172a', marginBottom: '6px' }}>
                  Operations Remarks (Internal)
                </label>
                <textarea
                  value={opsRemarks}
                  onChange={(e) => setOpsRemarks(e.target.value)}
                  rows={2}
                  placeholder="Optional internal notes on pricing decision or instructions..."
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedOrderForPricing(null)}
                  className="neutral-btn"
                  style={{ padding: '10px 18px', borderRadius: '8px', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPriceAndProcess}
                  disabled={isSubmittingPrice || (priceMode === 'adjust' && !customPrice)}
                  className="primary-green"
                  style={{ padding: '10px 24px', borderRadius: '8px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '8px', opacity: (isSubmittingPrice || (priceMode === 'adjust' && !customPrice)) ? 0.7 : 1 }}
                >
                  {isSubmittingPrice ? 'Confirming Price...' : 'Confirm Price & Move to Active'}
                </button>
              </div>

            </div>
          </Modal>
        )}

        <style>{`
          .hover-row:hover { background: #f8fafc !important; }
        `}</style>
      </main>
    </div>
  );
}

