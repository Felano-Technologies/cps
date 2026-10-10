import { Fragment, useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  Zap,
  PackageSearch,
  DollarSign,
  Check,
  Edit3,
  X,
  AlertTriangle,
  Ban,
  Package,
  Truck,
  MapPin,
  Phone,
  User,
  Printer,
  UserCheck,
  Train,
  StickyNote,
  Eye,
  Pencil,
  ImageIcon,
} from 'lucide-react';
import axios from 'axios';
import api from '../../services/api';
import PartnerBadge from '../../components/PartnerBadge';
import EmptyState from '../../components/EmptyState';
import { Skeleton } from '../../components/Skeleton';
import Modal from '../../components/Modal';
import CustomSelect from '../../components/Form/CustomSelect';
import RiderManifestModal from '../../components/RiderManifestModal';
import OrderPrintModal from '../../components/OrderPrintModal';
import EditOrderModal from '../../components/EditOrderModal';
import OrderPhotosModal from '../../components/OrderPhotosModal';
import { useToast } from '../../contexts/ToastContext';
import { needsDeliveryCode, type Shipment, type ShipmentStatus, type RiderProfile } from '../../types/models';
import { formatPackageSize, getPackageSizeBadgeColors } from '../../utils/packageSize';

interface OpsOrdersListPageProps {
  filterType: 'new' | 'active' | 'delayed' | 'cancelled' | 'station';
}

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

const FINAL: ShipmentStatus[] = ['delivered', 'failed', 'cancelled'];

function apiError(err: unknown, fallback: string): string {
  return axios.isAxiosError(err) && typeof err.response?.data?.error === 'string' ? err.response.data.error : fallback;
}

function hasPhotos(order: Shipment) {
  return !!(order.packageImageUrl || order.podPhotoUrl || order.stationReceiptUrl);
}

function getCancellationReason(order: Shipment): string {
  const cancelEvents = order.statusEvents?.filter((e) => e.status === 'cancelled');
  const lastCancel = cancelEvents && cancelEvents.length > 0 ? cancelEvents[cancelEvents.length - 1] : null;
  if (lastCancel?.note) return lastCancel.note;
  if (order.opsRemarks) return order.opsRemarks;
  return 'Cancelled by customer';
}

function getCancellationTime(order: Shipment): string {
  const cancelEvents = order.statusEvents?.filter((e) => e.status === 'cancelled');
  const lastCancel = cancelEvents && cancelEvents.length > 0 ? cancelEvents[cancelEvents.length - 1] : null;
  if (lastCancel?.createdAt) {
    return new Date(lastCancel.createdAt).toLocaleString();
  }
  return new Date(order.updatedAt).toLocaleString();
}

function getDelayReason(order: Shipment): string {
  const delayEvents = order.statusEvents?.filter((e) => e.status === 'delayed');
  const lastDelay = delayEvents && delayEvents.length > 0 ? delayEvents[delayEvents.length - 1] : null;
  if (lastDelay?.note) return lastDelay.note;
  return 'Rider reported fulfillment delay';
}

function getDelayTime(order: Shipment): string {
  const delayEvents = order.statusEvents?.filter((e) => e.status === 'delayed');
  const lastDelay = delayEvents && delayEvents.length > 0 ? delayEvents[delayEvents.length - 1] : null;
  if (lastDelay?.createdAt) {
    return new Date(lastDelay.createdAt).toLocaleString();
  }
  return new Date(order.updatedAt).toLocaleString();
}

export default function OpsOrdersListPage({ filterType }: OpsOrdersListPageProps) {
  const toast = useToast();
  const navigate = useNavigate();

  const [orders, setOrders] = useState<Shipment[]>([]);
  const [riders, setRiders] = useState<RiderProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Quick Price Modal State for New Orders
  const [selectedOrderForPricing, setSelectedOrderForPricing] = useState<Shipment | null>(null);
  const [priceMode, setPriceMode] = useState<'accept' | 'adjust'>('accept');
  const [customPrice, setCustomPrice] = useState('');
  const [modalPickupRiderId, setModalPickupRiderId] = useState('');
  const [modalDropoffRiderId, setModalDropoffRiderId] = useState('');
  const [opsRemarks, setOpsRemarks] = useState('');
  const [isSubmittingPrice, setIsSubmittingPrice] = useState(false);
  const [applyPriceToBulk, setApplyPriceToBulk] = useState(false);
  const [isManifestOpen, setIsManifestOpen] = useState(false);

  // Assign Riders Modal State (for active/delayed orders)
  const [selectedOrderForAssign, setSelectedOrderForAssign] = useState<Shipment | null>(null);
  const [assignPickupRiderId, setAssignPickupRiderId] = useState('');
  const [assignDropoffRiderId, setAssignDropoffRiderId] = useState('');
  const [isSubmittingAssign, setIsSubmittingAssign] = useState(false);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);
  const [applyAssignmentToBulk, setApplyAssignmentToBulk] = useState(false);

  // Row icon actions and inline dropdowns
  const [editingOrder, setEditingOrder] = useState<Shipment | null>(null);
  const [photosOrder, setPhotosOrder] = useState<Shipment | null>(null);
  const [printOrder, setPrintOrder] = useState<Shipment | null>(null);
  const [rowBusyId, setRowBusyId] = useState<string | null>(null);

  const titleMap = {
    new: 'New Orders',
    active: 'Active Orders',
    delayed: 'Delayed Orders',
    cancelled: 'Cancelled Orders',
    station: 'Station Deliveries',
  };

  const subtitleMap = {
    new: 'Review orders, set or accept prices, and dispatch riders to the active queue.',
    active: 'Orders currently being fulfilled by riders.',
    delayed: 'Shipments currently experiencing delays. Review delay notes and assist riders.',
    cancelled: 'All orders cancelled by customers or operations and their cancellation reasons.',
    station: 'Confirmed orders dispatched to a transport station or vehicle — not doorstep delivery.',
  };

  const title = titleMap[filterType];
  const subtitle = subtitleMap[filterType];

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [ordersRes, ridersRes] = await Promise.all([
          api.get<Shipment[]>('/shipments'),
          api.get<RiderProfile[]>('/riders'),
        ]);
        setOrders(ordersRes.data);
        setRiders(ridersRes.data);
      } catch {
        toast.error('Failed to load orders.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [filterType, toast]);

  const riderOptions = useMemo(() => [
    { value: '', label: 'Unassigned' },
    ...riders.map(r => ({ value: r.id, label: r.user.name })),
  ], [riders]);

  // Suspended riders can't take new work, but keep whoever is already on the order visible.
  const riderOptionsFor = (currentId: string | null | undefined) => [
    { value: '', label: 'Unassigned' },
    ...riders
      .filter(r => !r.user.suspendedAt || r.id === currentId)
      .map(r => ({ value: r.id, label: r.user.name })),
  ];

  const replaceOrder = (updated: Shipment) => setOrders(prev => prev.map(o => (o.id === updated.id ? updated : o)));

  const handleInlineAssign = async (order: Shipment, leg: 'pickup' | 'dropoff', riderId: string) => {
    setRowBusyId(order.id);
    try {
      const body = leg === 'pickup' ? { pickupRiderId: riderId || null } : { dropoffRiderId: riderId || null };
      const { data } = await api.patch<Shipment>(`/shipments/${order.id}/assign`, body);
      replaceOrder(data);
      const name = riders.find(r => r.id === riderId)?.user.name;
      toast.success(name ? `${name} assigned to ${leg} for ${order.trackingCode}.` : `${leg === 'pickup' ? 'Pickup' : 'Drop-off'} rider removed from ${order.trackingCode}.`);
    } catch (err) {
      toast.error(apiError(err, 'Failed to update the rider.'));
    } finally {
      setRowBusyId(null);
    }
  };

  const handleInlineStatus = async (order: Shipment, status: ShipmentStatus) => {
    if (status === order.status) return;
    // Partner orders with a delivery code need the code the customer gives.
    let deliveryCode: string | undefined;
    if (status === 'delivered' && needsDeliveryCode(order)) {
      const entered = window.prompt("Enter the customer's delivery code (from their SMS/app):");
      if (entered === null) return;
      deliveryCode = entered.replace(/\D/g, '');
      if (!deliveryCode) { toast.error('Enter the delivery code to mark this order delivered.'); return; }
    }
    if (FINAL.includes(status) && status !== 'delivered' && !window.confirm(`Mark ${order.trackingCode} as ${STATUS_LABELS[status].toLowerCase()}? This can't be undone.`)) return;
    setRowBusyId(order.id);
    try {
      const { data } = await api.patch<Shipment>(`/shipments/${order.id}/status`, { status, deliveryCode });
      replaceOrder(data);
      toast.success(`${order.trackingCode} is now ${STATUS_LABELS[status].toLowerCase()}.`);
    } catch (err) {
      toast.error(apiError(err, 'Failed to update the status.'));
    } finally {
      setRowBusyId(null);
    }
  };

  const counts = useMemo(
    () => ({
      new: orders.filter((o) => o.status === 'awaiting_price').length,
      active: orders.filter((o) => ['pending', 'picked_up', 'in_transit', 'out_for_delivery'].includes(o.status) && o.deliveryType !== 'station').length,
      delayed: orders.filter((o) => o.status === 'delayed').length,
      cancelled: orders.filter((o) => o.status === 'cancelled').length,
      station: orders.filter((o) => o.deliveryType === 'station' && !['cancelled', 'delivered', 'failed', 'awaiting_price'].includes(o.status)).length,
    }),
    [orders]
  );

  const filteredOrders = useMemo(() => {
    let filtered = orders.filter((order) => {
      if (filterType === 'new') {
        return order.status === 'awaiting_price';
      } else if (filterType === 'active') {
        return ['pending', 'picked_up', 'in_transit', 'out_for_delivery'].includes(order.status) && order.deliveryType !== 'station';
      } else if (filterType === 'delayed') {
        return order.status === 'delayed';
      } else if (filterType === 'cancelled') {
        return order.status === 'cancelled';
      } else if (filterType === 'station') {
        return order.deliveryType === 'station' && !['cancelled', 'delivered', 'failed', 'awaiting_price'].includes(order.status);
      }
      return true;
    });

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((order) => {
        const cancelReason = getCancellationReason(order).toLowerCase();
        const delayReason = getDelayReason(order).toLowerCase();
        return (
          order.trackingCode.toLowerCase().includes(q) ||
          order.receiverName.toLowerCase().includes(q) ||
          order.senderName.toLowerCase().includes(q) ||
          order.pickupLocation.toLowerCase().includes(q) ||
          order.dropoffLocation.toLowerCase().includes(q) ||
          cancelReason.includes(q) ||
          delayReason.includes(q) ||
          (order.assignedRider?.user.name && order.assignedRider.user.name.toLowerCase().includes(q)) ||
          (order.pickupRider?.user.name && order.pickupRider.user.name.toLowerCase().includes(q)) ||
          (order.dropoffRider?.user.name && order.dropoffRider.user.name.toLowerCase().includes(q))
        );
      });
    }
    return filtered;
  }, [orders, filterType, searchQuery]);

  const bulkCounts = useMemo(() => {
    const counts = new Map<string, number>();
    filteredOrders.forEach(order => { if (order.batchId) counts.set(order.batchId, (counts.get(order.batchId) || 0) + 1); });
    return counts;
  }, [filteredOrders]);

  // New orders are handled as one operational unit per bulk batch. Once processed,
  // the active/station views intentionally show each package separately.
  const displayOrders = useMemo(() => {
    if (filterType !== 'new') return filteredOrders;
    const seenBatches = new Set<string>();
    return filteredOrders.filter(order => {
      if (!order.batchId) return true;
      if (seenBatches.has(order.batchId)) return false;
      seenBatches.add(order.batchId);
      return true;
    });
  }, [filteredOrders, filterType]);

  const handleOpenPricingModal = (order: Shipment) => {
    setSelectedOrderForPricing(order);
    setPriceMode('accept');
    setCustomPrice(String(order.deliveryFee));
    setModalPickupRiderId(order.pickupRiderId ?? order.assignedRiderId ?? '');
    setModalDropoffRiderId(order.batchId ? '' : (order.dropoffRiderId ?? order.assignedRiderId ?? ''));
    setOpsRemarks(order.opsRemarks ?? '');
    setApplyPriceToBulk(false);
  };

  const handleOpenAssignModal = (order: Shipment) => {
    setSelectedOrderForAssign(order);
    setAssignPickupRiderId(order.pickupRiderId ?? order.assignedRiderId ?? '');
    setAssignDropoffRiderId(order.batchId ? '' : (order.dropoffRiderId ?? order.assignedRiderId ?? ''));
    setApplyAssignmentToBulk(false);
  };

  const handleSaveRiderAssignment = async () => {
    if (!selectedOrderForAssign) return;
    setIsSubmittingAssign(true);
    try {
      const targets = applyAssignmentToBulk && selectedOrderForAssign.batchId
        ? orders.filter(o => o.batchId === selectedOrderForAssign.batchId)
        : [selectedOrderForAssign];
      const updated = await Promise.all(targets.map(target => api.patch<Shipment>(`/shipments/${target.id}/assign`, {
        pickupRiderId: assignPickupRiderId || null, dropoffRiderId: assignDropoffRiderId || null,
      }).then(response => response.data)));
      setOrders((prev) => prev.map((o) => updated.find(item => item.id === o.id) ?? o));
      setSelectedOrderForAssign(null);
      toast.success(`${updated.length > 1 ? `Riders updated for ${updated.length} bulk packages` : `Riders updated for ${updated[0].trackingCode}`}.`);
    } catch {
      toast.error('Failed to update rider assignment. Please try again.');
    } finally {
      setIsSubmittingAssign(false);
    }
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
      const targets = applyPriceToBulk && selectedOrderForPricing.batchId
        ? orders.filter(o => o.batchId === selectedOrderForPricing.batchId)
        : [selectedOrderForPricing];
      const updated = await Promise.all(targets.map(target => api.patch<Shipment>(`/shipments/${target.id}/process`, {
        deliveryFee: finalFee,
        // A bulk order gets one pickup rider for the office handoff. Its individual
        // drop-off riders are assigned after the packages are processed separately.
        pickupRiderId: modalPickupRiderId || undefined,
        dropoffRiderId: applyPriceToBulk && selectedOrderForPricing.batchId ? undefined : (modalDropoffRiderId || undefined),
        opsRemarks: opsRemarks || undefined,
      }).then(response => response.data)));

      setOrders((prev) => prev.map((o) => updated.find(item => item.id === o.id) ?? o));
      setSelectedOrderForPricing(null);
      toast.success(`${updated.length > 1 ? `${updated.length} bulk packages` : `Order ${updated[0].trackingCode}`} price confirmed (GHS ${finalFee.toFixed(2)}) and moved to the next queue.`);
    } catch {
      toast.error('Failed to process order pricing. Please try again.');
    } finally {
      setIsSubmittingPrice(false);
    }
  };

  const handleAcceptBulk = async (order: Shipment) => {
    if (!order.batchId) return;
    setIsProcessingBulk(true);
    try {
      const { data } = await api.patch<Shipment[]>(`/shipments/batch/${order.batchId}/accept`, { pickupRiderId: order.pickupRiderId || order.assignedRiderId || undefined });
      setOrders(prev => prev.map(item => data.find(updated => updated.id === item.id) ?? item));
      toast.success(`Bulk pickup accepted for ${data.length} packages. No pickup fee charged.`);
    } catch { toast.error('Failed to accept the bulk pickup.'); }
    finally { setIsProcessingBulk(false); }
  };

  const handleDeclineBulk = async (order: Shipment) => {
    if (!order.batchId || !window.confirm('Decline this entire bulk pickup?')) return;
    setIsProcessingBulk(true);
    try {
      const { data } = await api.patch<Shipment[]>(`/shipments/batch/${order.batchId}/decline`, { reason: 'Bulk pickup declined by operations' });
      setOrders(prev => prev.map(item => data.find(updated => updated.id === item.id) ?? item));
      toast.success(`Bulk pickup declined for ${data.length} packages.`);
    } catch { toast.error('Failed to decline the bulk pickup.'); }
    finally { setIsProcessingBulk(false); }
  };

  return (
    <div className="page-shell light-shell">
      <main className="container" style={{ padding: '28px 20px', maxWidth: '1680px', width: '100%', boxSizing: 'border-box', marginBottom: '80px' }}>
        <style>{`
          .ops-orders-page .ops-queue-card { background: #fff; border: 1px solid #dbe4ee; border-radius: 18px; box-shadow: 0 10px 30px rgba(15,23,42,.06); overflow: hidden; }
          .ops-orders-page .ops-table thead tr { background: #f7f9fc; }
          .ops-orders-page .ops-table tbody tr { transition: background .15s ease; }
          .ops-orders-page .ops-table tbody tr:hover { background: #f8fbff !important; }
          .ops-orders-page .ops-table { table-layout: auto; }
          .ops-orders-page .ops-table th { padding: 12px 9px !important; font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: .045em; white-space: normal; line-height: 1.25; }
          .ops-orders-page .ops-table td { padding: 13px 10px !important; vertical-align: top; font-size: 12px; overflow-wrap: normal; word-break: normal; }
          .ops-orders-page .ops-table th:nth-child(1), .ops-orders-page .ops-table td:nth-child(1) { min-width: 118px; }
          .ops-orders-page .ops-table th:nth-child(2), .ops-orders-page .ops-table td:nth-child(2) { min-width: 145px; }
          .ops-orders-page .ops-table th:nth-child(3), .ops-orders-page .ops-table td:nth-child(3) { min-width: 155px; }
          .ops-orders-page .ops-table th:nth-child(4), .ops-orders-page .ops-table td:nth-child(4) { min-width: 205px; }
          .ops-orders-page .ops-table th:nth-child(5), .ops-orders-page .ops-table td:nth-child(5) { min-width: 115px; }
          .ops-orders-page .ops-table th:nth-child(6), .ops-orders-page .ops-table td:nth-child(6) { min-width: 135px; }
          .ops-orders-page .ops-table th:nth-child(7), .ops-orders-page .ops-table td:nth-child(7) { min-width: 160px; }
          .ops-orders-page .ops-table th:last-child, .ops-orders-page .ops-table td:last-child { min-width: 160px; }
          .ops-orders-page .ops-table td button, .ops-orders-page .ops-table td a { white-space: normal; }
          .ops-orders-page .ops-page-title { font-size: 32px; line-height: 1.1; font-weight: 850; color: #0f172a; margin: 0 0 8px; letter-spacing: -.03em; }
          .ops-orders-page .ops-search { background: #fff; border: 1px solid #cbd5e1; box-shadow: 0 3px 10px rgba(15,23,42,.04); }
          .ops-orders-page .ops-search:focus { outline: 3px solid rgba(59,130,246,.14); border-color: #3b82f6; }
          .ops-orders-page .row-select { width: 100%; min-width: 130px; padding: 6px 28px 6px 10px; border: 1px solid #cbd5e1; border-radius: 8px; background: #fff; font-size: 12px; font-weight: 600; color: #0f172a; cursor: pointer; font-family: inherit; }
          .ops-orders-page .row-select:disabled { background: #f1f5f9; color: #94a3b8; cursor: not-allowed; }
          .ops-orders-page .row-select.unassigned { color: #94a3b8; }
          .ops-orders-page .rider-leg { display: grid; grid-template-columns: 52px 1fr; align-items: center; gap: 6px; }
          .ops-orders-page .rider-leg + .rider-leg { margin-top: 6px; }
          .ops-orders-page .rider-leg span { font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: .05em; }
          .ops-orders-page .icon-actions { display: flex; gap: 6px; flex-wrap: nowrap; }
          .ops-orders-page .icon-btn { display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 8px; border: 1px solid #cbd5e1; background: #fff; color: #334155; cursor: pointer; text-decoration: none; flex-shrink: 0; transition: background .15s ease, border-color .15s ease; }
          .ops-orders-page .icon-btn:hover { background: #f1f5f9; border-color: #94a3b8; }
          .ops-orders-page .icon-btn.view { color: #2563eb; border-color: #bfdbfe; }
          .ops-orders-page .icon-btn.edit { color: #ea580c; border-color: #fed7aa; }
          .ops-orders-page .icon-btn.print { color: #0f766e; border-color: #99f6e4; }
          .ops-orders-page .icon-btn.photos { color: #7c3aed; border-color: #ddd6fe; }
          .ops-orders-page .icon-btn.muted { color: #cbd5e1; border-color: #e2e8f0; }
          .ops-orders-page .ops-tab-strip { background: #eef2f7; border: 1px solid #e2e8f0; box-shadow: inset 0 1px 2px rgba(15,23,42,.04); }
          @media (max-width: 768px) { .ops-orders-page .ops-page-title { font-size: 26px; } .ops-orders-page main { padding-left: 16px !important; padding-right: 16px !important; } }
        `}</style>

        <div className="ops-orders-page" style={{ display: 'contents' }}>
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <button
            onClick={() => navigate('/ops-board')}
            className="neutral-btn"
            style={{ padding: '8px 16px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600 }}
          >
            <ArrowLeft size={16} /> Back to Dashboard
          </button>

          {/* Quick Tab Switcher */}
          <div className="ops-tab-strip" style={{ display: 'flex', gap: '8px', padding: '4px', borderRadius: '12px' }}>
            <button
              onClick={() => navigate('/ops/new-orders')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                background: filterType === 'new' ? '#078c35' : 'transparent',
                color: filterType === 'new' ? '#ffffff' : '#64748b',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Package size={14} />
              New ({counts.new})
            </button>
            <button
              onClick={() => navigate('/ops/active-orders')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                background: filterType === 'active' ? '#078c35' : 'transparent',
                color: filterType === 'active' ? '#ffffff' : '#64748b',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Truck size={14} />
              Active ({counts.active})
            </button>
            <button
              onClick={() => navigate('/ops/delayed-orders')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                background: filterType === 'delayed' ? '#dc2626' : 'transparent',
                color: filterType === 'delayed' ? '#ffffff' : '#64748b',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <AlertTriangle size={14} />
              Delayed ({counts.delayed})
            </button>
            <button
              onClick={() => navigate('/ops/cancelled-orders')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                background: filterType === 'cancelled' ? '#475569' : 'transparent',
                color: filterType === 'cancelled' ? '#ffffff' : '#64748b',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Ban size={14} />
              Cancelled ({counts.cancelled})
            </button>
            <button
              onClick={() => navigate('/ops/station-orders')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                background: filterType === 'station' ? '#1e40af' : 'transparent',
                color: filterType === 'station' ? '#ffffff' : '#64748b',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Train size={14} />
              Station ({counts.station})
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px', marginBottom: '28px', paddingBottom: '22px', borderBottom: '1px solid #e2e8f0' }}>
          <div>
            <h1 className="ops-page-title">
              {title}
            </h1>
            <p className="muted-text" style={{ fontSize: '16px', color: '#64748b' }}>
              {subtitle}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              className="neutral-btn"
              style={{ padding: '10px 18px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 700, borderRadius: '12px', height: '46px', whiteSpace: 'nowrap' }}
              onClick={() => setIsManifestOpen(true)}
            >
              <Printer size={16} /> Print Rider Sheet
            </button>
            <div style={{ position: 'relative', width: '100%', maxWidth: '320px' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search by code, route, reason..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ops-search"
                style={{ width: '100%', padding: '12px 16px 12px 40px', borderRadius: '12px', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>
          </div>
        </div>

        <div className="ops-queue-card">
          <div style={{ overflowX: 'auto' }}>
            <table className="ops-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 0 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '16px', fontSize: '13px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Order type</th>
                  <th style={{ padding: '16px', fontSize: '13px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Order ID</th>
                  <th style={{ padding: '16px', fontSize: '13px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Customer</th>
                  <th style={{ padding: '16px', fontSize: '13px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Location</th>
                  {filterType === 'new' && <th style={{ padding: '16px', fontSize: '13px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Speed / vehicle</th>}
                  {filterType === 'new' && <th style={{ padding: '16px', fontSize: '13px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Package details</th>}
                  {filterType === 'new' && <th style={{ padding: '16px', fontSize: '13px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Assign riders</th>}
                  {filterType === 'new' && (
                    <th style={{ padding: '16px', fontSize: '13px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fee</th>
                  )}
                  {(filterType === 'active' || filterType === 'delayed' || filterType === 'station') && (
                    <th style={{ padding: '16px', fontSize: '13px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Assigned Riders</th>
                  )}
                  {filterType === 'delayed' && (
                    <th style={{ padding: '16px', fontSize: '13px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Delay Reason & Note</th>
                  )}
                  {filterType === 'cancelled' && (
                    <>
                      <th style={{ padding: '16px', fontSize: '13px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Accepted Price</th>
                      <th style={{ padding: '16px', fontSize: '13px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cancellation Reason & Time</th>
                    </>
                  )}
                  <th style={{ padding: '16px', fontSize: '13px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                  <th style={{ padding: '16px', fontSize: '13px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '16px' }}><Skeleton height="1.2em" width="80px" /></td>
                      <td style={{ padding: '16px' }}><Skeleton height="1.2em" width="110px" /></td>
                      <td style={{ padding: '16px' }}><Skeleton height="1.2em" width="130px" /></td>
                      <td style={{ padding: '16px' }}><Skeleton height="1.2em" width="130px" /></td>
                      {(filterType === 'new' || filterType === 'delayed' || filterType === 'cancelled') && (
                        <td style={{ padding: '16px' }}><Skeleton height="1.2em" width="100px" /></td>
                      )}
                      {filterType === 'cancelled' && (
                        <td style={{ padding: '16px' }}><Skeleton height="1.2em" width="120px" /></td>
                      )}
                      <td style={{ padding: '16px' }}><Skeleton height="1.5em" width="90px" radius="20px" /></td>
                      <td style={{ padding: '16px' }}><Skeleton height="2em" width="80px" radius="8px" /></td>
                    </tr>
                  ))
                ) : displayOrders.length > 0 ? (
                  displayOrders.map((order) => {
                    const colors = STATUS_COLORS[order.status];
                    const isUrgent = order.priority === 'high';
                    const cancelReason = getCancellationReason(order);
                    const cancelTime = getCancellationTime(order);
                    const delayReason = getDelayReason(order);
                    const delayTime = getDelayTime(order);

                    const isBulk = !!order.batchId && (bulkCounts.get(order.batchId) || 0) > 1;
                    return (
                      <Fragment key={order.id}>
                      <tr key={order.id} style={{ borderBottom: '1px solid #e2e8f0', background: isUrgent ? '#fffbeb' : '#fff', transition: 'background 0.2s' }} className="hover-row">
                        <td style={{ padding: '16px' }}><span style={{ display: 'inline-flex', padding: '4px 9px', borderRadius: 7, background: isBulk ? '#dbeafe' : '#f1f5f9', color: isBulk ? '#1e40af' : '#475569', fontSize: 12, fontWeight: 800 }}>{isBulk ? `Bulk · ${bulkCounts.get(order.batchId!) || 0} orders` : 'Single'}</span></td>
                        {/* Order ID & Date */}
                        <td style={{ padding: '16px' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '15px' }}>{isBulk ? <><span style={{ color: '#1d4ed8' }}>Bulk</span><span style={{ display: 'block', fontSize: 12, color: '#64748b', marginTop: 3 }}>{order.trackingCode}</span></> : order.trackingCode}</div><PartnerBadge shipment={order} />
                          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                            {new Date(order.createdAt).toLocaleDateString()}
                          </div>
                        </td>

                        {/* Customer / Sender */}
                        <td style={{ padding: '16px' }}>
                          <div style={{ fontSize: '14px', color: '#0f172a', fontWeight: 700 }}>
                            {order.senderName}
                          </div>
                          {order.senderNumber && (
                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Phone size={12} /> {order.senderNumber}
                            </div>
                          )}
                          {isUrgent && (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fef9c3', color: '#854d0e', padding: '2px 6px', borderRadius: '6px', fontSize: '11px', fontWeight: 800, letterSpacing: '0.03em', marginTop: '4px' }}>
                              <Zap size={11} /> URGENT
                            </div>
                          )}
                          {order.additionalInstructions && (
                            <div style={{ marginTop: '6px', background: '#fefce8', border: '1px solid #fde047', borderRadius: '8px', padding: '5px 8px', display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                              <StickyNote size={12} color="#ca8a04" style={{ flexShrink: 0, marginTop: '1px' }} />
                              <span style={{ fontSize: '11px', color: '#854d0e', fontWeight: 600, lineHeight: 1.4 }}>{order.additionalInstructions}</span>
                            </div>
                          )}
                        </td>

                        {/* Pickup & Dropoff Location (merged) */}
                        <td style={{ padding: '16px' }}>
                          {/* Pickup: region on top, area underneath */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', minWidth: '46px' }}>Pickup</span>
                            <MapPin size={12} color="#0f172a" style={{ flexShrink: 0 }} />
                            <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: 900 }}>{order.pickupRegion}</span>
                          </div>
                          <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px', marginLeft: '70px', fontWeight: 600 }}>
                            {order.pickupLocation}
                          </div>
                          {/* Divider */}
                          <div style={{ borderTop: '1px dashed #e2e8f0', margin: '6px 0' }} />
                          {/* Drop-off: region on top, area underneath */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', minWidth: '46px' }}>Dropoff</span>
                            <MapPin size={12} color="#078c35" style={{ flexShrink: 0 }} />
                            <span style={{ fontSize: '14px', color: '#078c35', fontWeight: 900 }}>
                              {filterType === 'new' && isBulk ? 'Multiple destinations' : order.deliveryType === 'station' ? 'Station Delivery' : order.dropoffRegion}
                            </span>
                          </div>
                          <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px', marginLeft: '70px', fontWeight: 600 }}>
                            {filterType === 'new' && isBulk ? `${bulkCounts.get(order.batchId!) || 0} packages at drop-off` : order.dropoffLocation}
                          </div>
                          {order.deliveryType === 'station' && (
                            <div style={{ marginTop: '6px', display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#dbeafe', color: '#1e40af', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800 }}>
                              <Train size={11} /> Station → {order.stationLocation || 'See details'}
                            </div>
                          )}
                        </td>

                        {/* Mode Specific Columns */}
                        {filterType === 'new' && (
                          <><td style={{ padding: '16px', textTransform: 'capitalize' }}>{order.speed === 'next_day' ? 'Standard' : order.speed === 'express' ? 'Express' : order.speed.replace('_', ' ')}<div style={{ fontSize: '12px', color: '#64748b' }}>{order.vehicleType}</div></td><td style={{ padding: '16px', textTransform: 'capitalize' }}>
                            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '14px' }}>{order.packageType}</div>
                            {(() => {
                              const size = formatPackageSize(order);
                              const badge = getPackageSizeBadgeColors(size);
                              return (
                                <div style={{ display: 'inline-flex', alignItems: 'center', background: badge.bg, color: badge.text, border: `1px solid ${badge.border}`, padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, marginTop: '4px' }}>
                                  Size: <span style={{ marginLeft: '4px', fontWeight: 800 }}>{size}</span>
                                </div>
                              );
                            })()}
                          </td><td style={{ padding: '16px', fontSize: '12px' }}><div>Pickup: <strong>{order.pickupRider?.user.name || 'Unassigned'}</strong></div><div>Dropoff: <strong>{order.dropoffRider?.user.name || 'Unassigned'}</strong></div></td></>
                        )}
                        {filterType === 'new' && (
                          <td style={{ padding: '16px' }}>
                            {isBulk ? <div style={{ display: 'inline-flex', padding: '6px 9px', borderRadius: 8, background: '#ecfdf5', color: '#166534', fontSize: 12, fontWeight: 800 }}>No pickup fee</div> : <div><strong style={{ fontSize: '15px', color: '#0f172a' }}>GHS {Number(order.deliveryFee).toFixed(2)}</strong><div style={{ fontSize: '11px', color: '#64748b' }}>Initial estimate</div></div>}
                          </td>
                        )}

                        {(filterType === 'active' || filterType === 'delayed' || filterType === 'station') && (
                          <td style={{ padding: '16px' }}>
                            {(['pickup', 'dropoff'] as const).map(leg => {
                              const current = leg === 'pickup'
                                ? (order.pickupRiderId ?? order.assignedRiderId ?? '')
                                : (order.dropoffRiderId ?? order.assignedRiderId ?? '');
                              return (
                                <label key={leg} className="rider-leg">
                                  <span>{leg === 'pickup' ? 'Pickup' : 'Dropoff'}</span>
                                  <select
                                    className={`row-select${current ? '' : ' unassigned'}`}
                                    value={current}
                                    disabled={rowBusyId === order.id}
                                    onChange={e => handleInlineAssign(order, leg, e.target.value)}
                                    aria-label={`${leg === 'pickup' ? 'Pickup' : 'Drop-off'} rider for ${order.trackingCode}`}
                                  >
                                    {riderOptionsFor(current).map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                  </select>
                                </label>
                              );
                            })}
                          </td>
                        )}

                        {filterType === 'delayed' && (
                          <td style={{ padding: '16px' }}>
                            <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '8px', padding: '8px 12px', maxWidth: '340px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: '#92400e' }}>
                                <AlertTriangle size={14} color="#d97706" style={{ flexShrink: 0 }} />
                                <span>{delayReason}</span>
                              </div>
                              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                                Reported: {delayTime}
                              </div>
                            </div>
                          </td>
                        )}

                        {filterType === 'cancelled' && (
                          <>
                            <td style={{ padding: '16px' }}>
                              <strong style={{ fontSize: '15px', color: '#0f172a' }}>
                                GHS {Number(order.deliveryFee).toFixed(2)}
                              </strong>
                            </td>
                            <td style={{ padding: '16px' }}>
                              <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '8px', padding: '8px 12px', maxWidth: '340px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: '#991b1b' }}>
                                  <Ban size={14} color="#ef4444" style={{ flexShrink: 0 }} />
                                  <span>{cancelReason}</span>
                                </div>
                                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                                  Cancelled: {cancelTime}
                                </div>
                              </div>
                            </td>
                          </>
                        )}

                        <td style={{ padding: '16px' }}>
                          {filterType !== 'new' && !FINAL.includes(order.status) ? (
                            <select
                              className="row-select"
                              value={order.status}
                              disabled={rowBusyId === order.id}
                              onChange={e => handleInlineStatus(order, e.target.value as ShipmentStatus)}
                              aria-label={`Status of ${order.trackingCode}`}
                              style={{ background: colors.bg, color: colors.text, borderColor: colors.dot, fontWeight: 700 }}
                            >
                              {(Object.keys(STATUS_LABELS) as ShipmentStatus[])
                                .filter(st => st !== 'awaiting_price')
                                .map(st => <option key={st} value={st}>{STATUS_LABELS[st]}</option>)}
                            </select>
                          ) : (
                            <span style={{
                              background: colors.bg, color: colors.text,
                              padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 700,
                              display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap'
                            }}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: colors.dot }}></span>
                              {STATUS_LABELS[order.status]}
                            </span>
                          )}
                        </td>

                        <td style={{ padding: '16px' }}>
                          {/* New orders only need pricing; the icon actions start once they reach the active queues. */}
                          {filterType === 'new' ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              {isBulk ? (
                                <>
                                  <button onClick={() => handleAcceptBulk(order)} disabled={isProcessingBulk} className="primary-green" style={{ padding: '8px 13px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', border: 'none' }}>Accept bulk pickup</button>
                                  <button onClick={() => handleDeclineBulk(order)} disabled={isProcessingBulk} style={{ padding: '8px 13px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', border: '1px solid #fecaca', background: '#fef2f2', color: '#991b1b' }}>Decline</button>
                                  <button onClick={() => handleOpenAssignModal(order)} title="Assign the pickup rider for this bulk order" style={{ padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', display: 'inline-flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}>
                                    <UserCheck size={13} /> Assign Riders
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => handleOpenPricingModal(order)}
                                  className="primary-green"
                                  style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', border: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                >
                                  <DollarSign size={14} /> Set Price
                                </button>
                              )}
                            </div>
                          ) : (
                          <div className="icon-actions">
                            <Link to={`/ops/tracking/${order.trackingCode}`} className="icon-btn view" title="View details" aria-label={`View details of ${order.trackingCode}`}>
                              <Eye size={16} />
                            </Link>
                            {!FINAL.includes(order.status) && (
                              <button type="button" className="icon-btn edit" onClick={() => setEditingOrder(order)} title="Edit order" aria-label={`Edit ${order.trackingCode}`}>
                                <Pencil size={16} />
                              </button>
                            )}
                            <button type="button" className="icon-btn print" onClick={() => setPrintOrder(order)} title="Print waybill" aria-label={`Print ${order.trackingCode}`}>
                              <Printer size={16} />
                            </button>
                            <button
                              type="button"
                              className={`icon-btn photos${hasPhotos(order) ? '' : ' muted'}`}
                              onClick={() => setPhotosOrder(order)}
                              title={hasPhotos(order) ? 'View package photos' : 'No photos yet: add one'}
                              aria-label={`Photos for ${order.trackingCode}`}
                            >
                              <ImageIcon size={16} />
                            </button>
                          </div>
                          )}
                        </td>
                      </tr>
                      </Fragment>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={10} style={{ padding: '32px' }}>
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
                {selectedOrderForPricing.deliveryType === 'station' && (
                  <div style={{ background: '#dbeafe', border: '1px solid #93c5fd', borderRadius: '8px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Train size={16} color="#1e40af" style={{ flexShrink: 0 }} />
                    <div>
                      <div style={{ fontWeight: 800, color: '#1e40af', fontSize: '13px' }}>Station Delivery</div>
                      <div style={{ fontSize: '12px', color: '#1e3a8a' }}>This is NOT a doorstep delivery. Package will be handed to a station/transport vehicle.</div>
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span style={{ color: '#64748b' }}>Sender:</span>
                  <strong style={{ color: '#0f172a' }}>{selectedOrderForPricing.senderName} ({selectedOrderForPricing.senderNumber})</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span style={{ color: '#64748b' }}>Pickup:</span>
                  <strong style={{ color: '#0f172a' }}>{selectedOrderForPricing.pickupRegion} · {selectedOrderForPricing.pickupLocation}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span style={{ color: '#64748b' }}>Recipient:</span>
                  <strong style={{ color: '#0f172a' }}>{selectedOrderForPricing.receiverName} ({selectedOrderForPricing.receiverNumber})</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span style={{ color: '#64748b' }}>Dropoff:</span>
                  <strong style={{ color: '#0f172a' }}>{selectedOrderForPricing.deliveryType === 'station' ? 'Station Delivery' : selectedOrderForPricing.dropoffRegion} · {selectedOrderForPricing.dropoffLocation}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span style={{ color: '#64748b' }}>Package:</span>
                  <strong style={{ color: '#0f172a', textTransform: 'capitalize' }}>{selectedOrderForPricing.packageType} · Size: {formatPackageSize(selectedOrderForPricing)}</strong>
                </div>
                {selectedOrderForPricing.deliveryType === 'station' && selectedOrderForPricing.stationLocation && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                    <span style={{ color: '#1e40af', fontWeight: 700 }}>Station / Handover:</span>
                    <strong style={{ color: '#1e40af' }}>{selectedOrderForPricing.stationLocation}</strong>
                  </div>
                )}
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

              {/* Rider Assignment */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '10px' }}>
                  Assign Dispatch Riders (Optional)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                      Pickup Rider
                    </label>
                    <CustomSelect
                      value={modalPickupRiderId}
                      onChange={setModalPickupRiderId}
                      options={riderOptions}
                      icon={<User size={15} />}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                      {selectedOrderForPricing.batchId ? 'Dropoff Rider (assign after pickup)' : 'Dropoff Rider'}
                    </label>
                    <CustomSelect
                      value={modalDropoffRiderId}
                      onChange={selectedOrderForPricing.batchId ? () => {} : setModalDropoffRiderId}
                      options={selectedOrderForPricing.batchId ? [{ value: '', label: 'Assigned after pickup' }] : riderOptions}
                      icon={<User size={15} />}
                    />
                  </div>
                </div>
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
              {selectedOrderForPricing.batchId && (bulkCounts.get(selectedOrderForPricing.batchId) || 0) > 1 && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, fontSize: 13, color: '#1e3a8a', fontWeight: 700 }}>
                  <input type="checkbox" checked={applyPriceToBulk} onChange={e => setApplyPriceToBulk(e.target.checked)} /> Apply this price and rider assignment to all {(bulkCounts.get(selectedOrderForPricing.batchId) || 0)} packages in this bulk order
                </label>
              )}
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

        {isManifestOpen && (
          <RiderManifestModal
            onClose={() => setIsManifestOpen(false)}
            initialShipments={orders}
            initialRiders={riders}
          />
        )}

        {editingOrder && <EditOrderModal order={editingOrder} onClose={() => setEditingOrder(null)} onSaved={replaceOrder} />}
        {photosOrder && (
          <OrderPhotosModal
            order={photosOrder}
            onClose={() => setPhotosOrder(null)}
            onSaved={updated => { replaceOrder(updated); setPhotosOrder(updated); }}
          />
        )}
        {printOrder && <OrderPrintModal shipment={printOrder} onClose={() => setPrintOrder(null)} />}

        {/* ASSIGN RIDERS MODAL (for bulk orders) */}
        {selectedOrderForAssign && (
          <Modal onClose={() => setSelectedOrderForAssign(null)} maxWidth="520px" padding="0">
            <div style={{ padding: '24px' }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '19px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ background: '#e0ffe0', color: '#078c35', padding: '6px', borderRadius: '8px', display: 'flex' }}>
                      <UserCheck size={18} />
                    </div>
                    Assign Riders
                  </h3>
                  <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                    Order #{selectedOrderForAssign.trackingCode} — {selectedOrderForAssign.pickupRegion} → {selectedOrderForAssign.dropoffRegion}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedOrderForAssign(null)}
                  style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px', marginLeft: '8px' }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Order Context */}
              <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#64748b' }}>Sender:</span>
                  <strong style={{ color: '#0f172a' }}>{selectedOrderForAssign.senderName}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#64748b' }}>Pickup:</span>
                  <strong style={{ color: '#0f172a' }}>{selectedOrderForAssign.pickupRegion} · {selectedOrderForAssign.pickupLocation}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#64748b' }}>Dropoff:</span>
                  <strong style={{ color: '#0f172a' }}>{selectedOrderForAssign.dropoffRegion} · {selectedOrderForAssign.dropoffLocation}</strong>
                </div>
              </div>

              {/* Rider Selectors */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>

                {/* Pickup Rider */}
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <div style={{ background: '#dbeafe', color: '#1d4ed8', padding: '5px', borderRadius: '6px', display: 'flex' }}>
                      <Package size={15} />
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#1e3a8a' }}>Pickup Rider</div>
                      <div style={{ fontSize: '11px', color: '#3b82f6' }}>Collects from: {selectedOrderForAssign.pickupRegion} · {selectedOrderForAssign.pickupLocation}</div>
                    </div>
                    {(selectedOrderForAssign.pickupRider || selectedOrderForAssign.assignedRider) && (
                      <span style={{ marginLeft: 'auto', fontSize: '11px', fontWeight: 700, background: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: '6px' }}>
                        Currently: {selectedOrderForAssign.pickupRider?.user.name ?? selectedOrderForAssign.assignedRider?.user.name}
                      </span>
                    )}
                  </div>
                  <CustomSelect
                    value={assignPickupRiderId}
                    onChange={setAssignPickupRiderId}
                    options={riderOptionsFor(selectedOrderForAssign.pickupRiderId)}
                    icon={<User size={15} />}
                  />
                </div>

                {/* Dropoff Rider */}
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <div style={{ background: '#dcfce7', color: '#15803d', padding: '5px', borderRadius: '6px', display: 'flex' }}>
                      <MapPin size={15} />
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#14532d' }}>Dropoff Rider</div>
                      <div style={{ fontSize: '11px', color: '#16a34a' }}>Delivers to: {selectedOrderForAssign.dropoffRegion} · {selectedOrderForAssign.dropoffLocation}</div>
                    </div>
                    {(selectedOrderForAssign.dropoffRider || selectedOrderForAssign.assignedRider) && (
                      <span style={{ marginLeft: 'auto', fontSize: '11px', fontWeight: 700, background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '6px' }}>
                        Currently: {selectedOrderForAssign.dropoffRider?.user.name ?? selectedOrderForAssign.assignedRider?.user.name}
                      </span>
                    )}
                  </div>
                  <CustomSelect
                    value={assignDropoffRiderId}
                    onChange={selectedOrderForAssign.batchId ? () => {} : setAssignDropoffRiderId}
                    options={selectedOrderForAssign.batchId ? [{ value: '', label: 'Assigned after office processing' }] : riderOptions}
                    icon={<User size={15} />}
                  />
                </div>

              </div>

              {/* Modal Actions */}
              {selectedOrderForAssign.batchId && (bulkCounts.get(selectedOrderForAssign.batchId) || 0) > 1 && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, fontSize: 13, color: '#1e3a8a', fontWeight: 700 }}>
                  <input type="checkbox" checked={applyAssignmentToBulk} onChange={e => setApplyAssignmentToBulk(e.target.checked)} /> Apply these riders to all {(bulkCounts.get(selectedOrderForAssign.batchId) || 0)} packages in this bulk order
                </label>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedOrderForAssign(null)}
                  className="neutral-btn"
                  style={{ padding: '10px 18px', borderRadius: '8px', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveRiderAssignment}
                  disabled={isSubmittingAssign}
                  className="primary-green"
                  style={{ padding: '10px 24px', borderRadius: '8px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '8px', opacity: isSubmittingAssign ? 0.7 : 1 }}
                >
                  <UserCheck size={15} />
                  {isSubmittingAssign ? 'Saving...' : 'Save Assignment'}
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

