import { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Printer, 
  Bike, 
  Truck, 
  Car, 
  Phone, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Clock, 
  Search,
  AlertCircle
} from 'lucide-react';
import cpsLogo from '../assets/logo2.png';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';
import Modal from './Modal';
import type { Shipment, RiderProfile } from '../types/models';

interface RiderManifestModalProps {
  onClose: () => void;
  initialRiderId?: string;
  initialRiders?: RiderProfile[];
  initialShipments?: Shipment[];
}

function formatFee(value: string | number | undefined | null): string {
  if (value === '' || value === undefined || value === null) return '0.00';
  const num = Number(value);
  if (isNaN(num)) return String(value);
  return num.toFixed(2);
}

function formatStatus(status: string): string {
  return status
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export default function RiderManifestModal({
  onClose,
  initialRiderId,
  initialRiders,
  initialShipments,
}: RiderManifestModalProps) {
  const toast = useToast();
  const [riders, setRiders] = useState<RiderProfile[]>(initialRiders || []);
  const [shipments, setShipments] = useState<Shipment[]>(initialShipments || []);
  const [selectedRiderId, setSelectedRiderId] = useState<string>(initialRiderId || '');
  const [isLoading, setIsLoading] = useState(!initialRiders || !initialShipments);
  const [filterMode, setFilterMode] = useState<'active' | 'today' | 'all'>('active');
  const [searchRiderQuery, setSearchRiderQuery] = useState('');

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const promises: [Promise<{ data: RiderProfile[] }> | null, Promise<{ data: Shipment[] }> | null] = [
          !initialRiders ? api.get<RiderProfile[]>('/riders') : null,
          !initialShipments ? api.get<Shipment[]>('/shipments') : null,
        ];

        const [ridersRes, shipmentsRes] = await Promise.all([
          promises[0] || Promise.resolve({ data: initialRiders || [] }),
          promises[1] || Promise.resolve({ data: initialShipments || [] }),
        ]);

        setRiders(ridersRes.data);
        setShipments(shipmentsRes.data);

        if (!selectedRiderId && ridersRes.data.length > 0) {
          setSelectedRiderId(ridersRes.data[0].id);
        }
      } catch {
        toast.error('Failed to load rider or order data for printing.');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [initialRiders, initialShipments]);

  // Set initial selected rider if passed later
  useEffect(() => {
    if (initialRiderId) {
      setSelectedRiderId(initialRiderId);
    } else if (!selectedRiderId && riders.length > 0) {
      setSelectedRiderId(riders[0].id);
    }
  }, [initialRiderId, riders]);

  const selectedRider = useMemo(() => {
    return riders.find(r => r.id === selectedRiderId) || null;
  }, [riders, selectedRiderId]);

  // Filtered riders for dropdown search
  const filteredRiders = useMemo(() => {
    if (!searchRiderQuery.trim()) return riders;
    const q = searchRiderQuery.toLowerCase();
    return riders.filter(r => 
      r.user.name.toLowerCase().includes(q) ||
      (r.vehicleId && r.vehicleId.toLowerCase().includes(q)) ||
      (r.user.phone && r.user.phone.toLowerCase().includes(q))
    );
  }, [riders, searchRiderQuery]);

  // Today's date filter helper
  const isToday = (dateStr: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const today = new Date();
    return (
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()
    );
  };

  // Extract Pickup Orders for selected rider
  const pickupOrders = useMemo(() => {
    if (!selectedRiderId) return [];

    return shipments.filter(order => {
      // Must be assigned to this rider for pickup
      const isPickupAssigned = 
        order.pickupRiderId === selectedRiderId ||
        (!order.pickupRiderId && !order.dropoffRiderId && order.assignedRiderId === selectedRiderId && ['pending', 'awaiting_price'].includes(order.status));

      if (!isPickupAssigned) return false;

      // Status filters
      if (filterMode === 'active') {
        // Active pickups: pending, awaiting_price, or not yet completed
        return !['delivered', 'cancelled'].includes(order.status);
      }
      if (filterMode === 'today') {
        return isToday(order.createdAt) || isToday(order.pickupDate || '');
      }
      return true; // 'all'
    });
  }, [shipments, selectedRiderId, filterMode]);

  // Extract Dropoff Orders for selected rider
  const dropoffOrders = useMemo(() => {
    if (!selectedRiderId) return [];

    return shipments.filter(order => {
      // Must be assigned to this rider for dropoff
      const isDropoffAssigned = 
        order.dropoffRiderId === selectedRiderId ||
        (!order.pickupRiderId && !order.dropoffRiderId && order.assignedRiderId === selectedRiderId && ['picked_up', 'in_transit', 'out_for_delivery'].includes(order.status));

      if (!isDropoffAssigned) return false;

      // Status filters
      if (filterMode === 'active') {
        // Active dropoffs: not yet delivered/cancelled
        return !['delivered', 'cancelled'].includes(order.status);
      }
      if (filterMode === 'today') {
        return isToday(order.createdAt);
      }
      return true; // 'all'
    });
  }, [shipments, selectedRiderId, filterMode]);

  // Financial summary
  const totalPickupFees = useMemo(() => {
    return pickupOrders.reduce((sum, o) => sum + (parseFloat(o.deliveryFee) || 0), 0);
  }, [pickupOrders]);

  const totalDropoffFees = useMemo(() => {
    return dropoffOrders.reduce((sum, o) => sum + (parseFloat(o.deliveryFee) || 0), 0);
  }, [dropoffOrders]);

  const totalCodAmount = useMemo(() => {
    const allUniqueOrderIds = new Set([...pickupOrders.map(o => o.id), ...dropoffOrders.map(o => o.id)]);
    let sum = 0;
    allUniqueOrderIds.forEach(id => {
      const ord = shipments.find(s => s.id === id);
      if (ord && ord.productFee) {
        sum += parseFloat(ord.productFee) || 0;
      }
    });
    return sum;
  }, [pickupOrders, dropoffOrders, shipments]);

  const handlePrint = () => {
    if (printRef.current) {
      window.print();
    }
  };

  const getVehicleIcon = (type: string | null) => {
    if (type === 'van') return <Truck size={15} />;
    if (type === 'truck') return <Car size={15} />;
    return <Bike size={15} />;
  };

  const formattedPrintDate = new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date());

  return (
    <>
      <style>
        {`
          @media print {
            @page {
              size: A4 portrait;
              margin: 10mm 10mm 12mm 10mm;
            }
            body {
              background: #ffffff !important;
              color: #000000 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            #root {
              display: none !important;
            }
            .no-print {
              display: none !important;
            }
            .modal-overlay {
              position: static !important;
              background: none !important;
              backdrop-filter: none !important;
              padding: 0 !important;
              overflow: visible !important;
            }
            .modal-shell {
              position: static !important;
              overflow: visible !important;
              max-height: none !important;
              max-width: 100% !important;
              width: 100% !important;
              box-shadow: none !important;
              border: none !important;
              background: #ffffff !important;
              padding: 0 !important;
              margin: 0 !important;
            }
            .modal-close-btn {
              display: none !important;
            }
            .modal-preview-wrapper {
              background: none !important;
              padding: 0 !important;
              overflow: visible !important;
              max-height: none !important;
              width: 100% !important;
            }
            #printable-manifest {
              width: 100% !important;
              max-width: 100% !important;
              box-shadow: none !important;
              border: none !important;
              padding: 0 !important;
              margin: 0 !important;
              background: #ffffff !important;
              color: #000000 !important;
            }
            .print-table {
              border-collapse: collapse !important;
              width: 100% !important;
            }
            .print-table th, .print-table td {
              border: 1px solid #333333 !important;
              padding: 6px 8px !important;
              font-size: 11px !important;
              line-height: 1.25 !important;
            }
            .print-table th {
              background-color: #f1f5f9 !important;
              color: #000000 !important;
              font-weight: 700 !important;
              text-transform: uppercase !important;
            }
            .section-header-banner {
              background: #f8fafc !important;
              border: 1.5px solid #000 !important;
              color: #000000 !important;
            }
            .page-break-inside-avoid {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
          }

          @media (max-width: 900px) {
            .manifest-layout-container {
              flex-direction: column !important;
            }
            .manifest-controls-panel {
              width: 100% !important;
              border-right: none !important;
              border-bottom: 1px solid var(--border) !important;
            }
          }
        `}
      </style>

      <Modal onClose={onClose} maxWidth="1200px" padding="0">
        <div 
          className="manifest-layout-container"
          style={{ 
            display: 'flex', 
            maxHeight: '92vh', 
            height: '92vh',
            width: '100%', 
            overflow: 'hidden',
            borderRadius: '16px',
            background: '#ffffff'
          }}
        >
          {/* Controls Side Panel (hidden on print) */}
          <div 
            className="manifest-controls-panel no-print"
            style={{ 
              width: '340px', 
              flexShrink: 0, 
              borderRight: '1px solid #e2e8f0', 
              padding: '24px', 
              display: 'flex', 
              flexDirection: 'column',
              background: '#f8fafc',
              overflowY: 'auto'
            }}
          >
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ 
                  background: '#dcfce7', 
                  color: '#166534', 
                  padding: '4px 8px', 
                  borderRadius: '6px', 
                  fontSize: '11px', 
                  fontWeight: 700, 
                  letterSpacing: '0.05em' 
                }}>
                  OPERATIONS
                </span>
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Rider Run Sheet
              </h2>
              <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px', margin: 0 }}>
                Generate & print a hardcopy route sheet for the rider's trips on the road.
              </p>
            </div>

            {/* Rider Selector */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '8px' }}>
                Select Rider
              </label>
              
              <div style={{ position: 'relative', marginBottom: '8px' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '11px', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Search rider by name, phone..."
                  value={searchRiderQuery}
                  onChange={(e) => setSearchRiderQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 32px',
                    fontSize: '13px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    background: '#ffffff',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ 
                maxHeight: '160px', 
                overflowY: 'auto', 
                border: '1px solid #e2e8f0', 
                borderRadius: '8px',
                background: '#ffffff',
              }}>
                {filteredRiders.length === 0 ? (
                  <div style={{ padding: '12px', fontSize: '13px', color: '#94a3b8', textAlign: 'center' }}>
                    No riders found
                  </div>
                ) : (
                  filteredRiders.map(r => {
                    const isSelected = r.id === selectedRiderId;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setSelectedRiderId(r.id)}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '10px 12px',
                          border: 'none',
                          borderBottom: '1px solid #f1f5f9',
                          background: isSelected ? '#ecfdf5' : 'transparent',
                          borderLeft: isSelected ? '4px solid #10b981' : '4px solid transparent',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: isSelected ? 700 : 600, color: isSelected ? '#065f46' : '#1e293b' }}>
                            {r.user.name}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                            {r.vehicleId || 'No vehicle'} • {r.user.phone || 'No phone'}
                          </div>
                        </div>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '10px',
                          background: r.currentStatus === 'available' ? '#dcfce7' : '#f1f5f9',
                          color: r.currentStatus === 'available' ? '#15803d' : '#64748b',
                        }}>
                          {formatStatus(r.currentStatus)}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Filter Toggle */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '8px' }}>
                Orders Scope
              </label>
              <div style={{ display: 'flex', gap: '6px', background: '#e2e8f0', padding: '3px', borderRadius: '8px' }}>
                {(['active', 'today', 'all'] as const).map(mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setFilterMode(mode)}
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      fontSize: '12px',
                      fontWeight: 600,
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      background: filterMode === mode ? '#ffffff' : 'transparent',
                      color: filterMode === mode ? '#0f172a' : '#64748b',
                      boxShadow: filterMode === mode ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    }}
                  >
                    {mode === 'active' ? 'Active Run' : mode === 'today' ? "Today's" : 'All'}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Metrics Summary */}
            <div style={{ 
              background: '#ffffff', 
              border: '1px solid #e2e8f0', 
              borderRadius: '10px', 
              padding: '14px', 
              marginBottom: '20px' 
            }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', marginBottom: '10px' }}>
                Run Summary
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                <span style={{ color: '#64748b' }}>Pickup Stops:</span>
                <span style={{ fontWeight: 700, color: '#0284c7' }}>{pickupOrders.length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                <span style={{ color: '#64748b' }}>Dropoff Stops:</span>
                <span style={{ fontWeight: 700, color: '#16a34a' }}>{dropoffOrders.length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', borderBottom: '1px dashed #e2e8f0', paddingBottom: '6px' }}>
                <span style={{ color: '#64748b' }}>Total Stops:</span>
                <span style={{ fontWeight: 800, color: '#0f172a' }}>{pickupOrders.length + dropoffOrders.length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '13px' }}>
                <span style={{ color: '#64748b' }}>Delivery Fees:</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>GHS {(totalPickupFees + totalDropoffFees).toFixed(2)}</span>
              </div>
              {totalCodAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#b45309' }}>
                  <span>COD to Collect:</span>
                  <span style={{ fontWeight: 700 }}>GHS {totalCodAmount.toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                onClick={handlePrint}
                disabled={!selectedRider}
                className="primary-green"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: selectedRider ? 'pointer' : 'not-allowed',
                  opacity: selectedRider ? 1 : 0.6,
                }}
              >
                <Printer size={18} /> Print Run Sheet (Hardcopy)
              </button>

              <button
                type="button"
                onClick={onClose}
                className="neutral-btn"
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 600,
                  textAlign: 'center',
                }}
              >
                Close
              </button>
            </div>
          </div>

          {/* Printable Manifest Preview Section */}
          <div 
            className="modal-preview-wrapper"
            style={{ 
              flex: 1, 
              background: '#e2e8f0', 
              padding: '24px', 
              overflowY: 'auto',
              display: 'flex',
              justifyContent: 'center'
            }}
          >
            {isLoading ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
                <Clock className="spin" size={32} style={{ margin: '0 auto 12px' }} />
                <p>Loading assigned orders and fleet data...</p>
              </div>
            ) : !selectedRider ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
                <AlertCircle size={32} style={{ margin: '0 auto 12px', color: '#ea580c' }} />
                <p>Please select a rider from the left panel to generate their run sheet.</p>
              </div>
            ) : (
              <div 
                ref={printRef}
                id="printable-manifest"
                style={{
                  width: '100%',
                  maxWidth: '850px',
                  background: '#ffffff',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                  padding: '32px 36px',
                  boxSizing: 'border-box',
                  fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
                  color: '#0f172a',
                }}
              >
                {/* Printable Header */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'flex-start', 
                  borderBottom: '2px solid #0f172a', 
                  paddingBottom: '16px', 
                  marginBottom: '20px' 
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <img 
                      src={cpsLogo} 
                      alt="CPS Logistics" 
                      style={{ height: '48px', objectFit: 'contain' }} 
                    />
                    <div>
                      <h1 style={{ fontSize: '20px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0, color: '#0f172a' }}>
                        CPS Logistics
                      </h1>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#059669', letterSpacing: '0.05em' }}>
                        OFFICIAL RIDER RUN SHEET & DISPATCH MANIFEST
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', fontSize: '11px', color: '#475569' }}>
                    <div><strong>Printed:</strong> {formattedPrintDate}</div>
                    <div><strong>Manifest ID:</strong> MNF-{selectedRider.id.slice(0, 6).toUpperCase()}-{Date.now().toString().slice(-4)}</div>
                    <div><strong>Scope:</strong> {filterMode === 'active' ? 'Active Run Sheet' : filterMode === 'today' ? "Today's Schedule" : 'Full Manifest'}</div>
                  </div>
                </div>

                {/* Rider & Run Details Box */}
                <div style={{ 
                  background: '#f8fafc', 
                  border: '1px solid #cbd5e1', 
                  borderRadius: '6px', 
                  padding: '12px 16px', 
                  marginBottom: '24px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '12px'
                }}>
                  <div>
                    <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>Assigned Rider</div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>{selectedRider.user.name}</div>
                    <div style={{ fontSize: '11px', color: '#475569' }}>
                      <Phone size={10} style={{ display: 'inline', marginRight: '4px' }} />
                      {selectedRider.user.phone || 'No Phone'}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>Vehicle / Plate</div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                      {selectedRider.vehicleId || 'Unassigned'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'capitalize', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                      {getVehicleIcon(selectedRider.vehicleType)}
                      {selectedRider.vehicleType || 'Motorbike'}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>Total Stops</div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                      {pickupOrders.length + dropoffOrders.length} Stops
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      {pickupOrders.length} Pickups | {dropoffOrders.length} Dropoffs
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>Collection Total</div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#059669' }}>
                      GHS {(totalPickupFees + totalDropoffFees + totalCodAmount).toFixed(2)}
                    </div>
                    <div style={{ fontSize: '10px', color: '#64748b' }}>
                      Fees: GHS {(totalPickupFees + totalDropoffFees).toFixed(2)} {totalCodAmount > 0 && `| COD: GHS ${totalCodAmount.toFixed(2)}`}
                    </div>
                  </div>
                </div>

                {/* ======================================================== */}
                {/* SECTION 1: PICKUP ORDERS */}
                {/* ======================================================== */}
                <div style={{ marginBottom: '28px' }} className="page-break-inside-avoid">
                  <div 
                    className="section-header-banner"
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      background: '#eff6ff', 
                      border: '1px solid #bfdbfe',
                      padding: '8px 14px', 
                      borderRadius: '4px',
                      marginBottom: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <ArrowDownLeft size={16} color="#1d4ed8" />
                      <span style={{ fontSize: '13px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#1e40af' }}>
                        1. PICKUP ORDERS ({pickupOrders.length})
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', color: '#3b82f6', fontWeight: 600 }}>
                      Collect package from sender & bring to hub / deliver
                    </span>
                  </div>

                  <table className="print-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
                        <th style={{ width: '28px', textAlign: 'center', padding: '8px 4px' }}>#</th>
                        <th style={{ width: '90px', textAlign: 'left', padding: '8px' }}>Order ID</th>
                        <th style={{ width: '170px', textAlign: 'left', padding: '8px' }}>Sender Contact</th>
                        <th style={{ textAlign: 'left', padding: '8px' }}>Pickup Location</th>
                        <th style={{ width: '85px', textAlign: 'right', padding: '8px' }}>Price</th>
                        <th style={{ width: '110px', textAlign: 'center', padding: '8px' }}>Sender Sign / Sign-off</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pickupOrders.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ padding: '16px', textAlign: 'center', color: '#64748b', fontStyle: 'italic', border: '1px solid #e2e8f0' }}>
                            No pickup orders assigned to this rider in this scope.
                          </td>
                        </tr>
                      ) : (
                        pickupOrders.map((order, idx) => (
                          <tr key={order.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ textAlign: 'center', fontWeight: 700, padding: '8px 4px', border: '1px solid #cbd5e1' }}>
                              {idx + 1}
                            </td>
                            <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>
                              <div style={{ fontWeight: 800, color: '#0f172a', fontFamily: 'monospace', fontSize: '12px' }}>
                                #{order.trackingCode}
                              </div>
                              <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'capitalize' }}>
                                {order.packageType} {order.priority === 'high' && '• High Priority'}
                              </div>
                            </td>
                            <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>
                              <div style={{ fontWeight: 700, color: '#0f172a' }}>
                                {order.senderName}
                              </div>
                              <div style={{ fontSize: '11px', color: '#0369a1', fontWeight: 600 }}>
                                📞 {order.senderNumber}
                              </div>
                            </td>
                            <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>
                              <div style={{ fontWeight: 600, color: '#0f172a' }}>
                                {order.pickupLocation}
                              </div>
                              <div style={{ fontSize: '10px', color: '#64748b' }}>
                                Region: {order.pickupRegion}
                              </div>
                              {order.additionalInstructions && (
                                <div style={{ fontSize: '10px', color: '#b45309', marginTop: '2px', fontStyle: 'italic' }}>
                                  Note: {order.additionalInstructions}
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #cbd5e1' }}>
                              <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '12px' }}>
                                GHS {formatFee(order.deliveryFee)}
                              </div>
                              {order.productFee && parseFloat(order.productFee) > 0 && (
                                <div style={{ fontSize: '9px', color: '#b45309', fontWeight: 700 }}>
                                  COD: GHS {formatFee(order.productFee)}
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #cbd5e1' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginBottom: '4px' }}>
                                <span style={{ display: 'inline-block', width: '12px', height: '12px', border: '1.5px solid #475569', borderRadius: '2px' }}></span>
                                <span style={{ fontSize: '9px', fontWeight: 700, color: '#475569' }}>[ ] Picked Up</span>
                              </div>
                              <div style={{ borderBottom: '1px solid #94a3b8', height: '14px', width: '90%', margin: '0 auto' }}></div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* ======================================================== */}
                {/* SECTION 2: DROPOFF ORDERS */}
                {/* ======================================================== */}
                <div style={{ marginBottom: '28px' }} className="page-break-inside-avoid">
                  <div 
                    className="section-header-banner"
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      background: '#f0fdf4', 
                      border: '1px solid #bbf7d0',
                      padding: '8px 14px', 
                      borderRadius: '4px',
                      marginBottom: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <ArrowUpRight size={16} color="#15803d" />
                      <span style={{ fontSize: '13px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#166534' }}>
                        2. DROPOFF ORDERS ({dropoffOrders.length})
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600 }}>
                      Deliver package to recipient and collect proof / cash
                    </span>
                  </div>

                  <table className="print-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
                        <th style={{ width: '28px', textAlign: 'center', padding: '8px 4px' }}>#</th>
                        <th style={{ width: '90px', textAlign: 'left', padding: '8px' }}>Order ID</th>
                        <th style={{ width: '170px', textAlign: 'left', padding: '8px' }}>Receiver Contact</th>
                        <th style={{ textAlign: 'left', padding: '8px' }}>Dropoff Location</th>
                        <th style={{ width: '85px', textAlign: 'right', padding: '8px' }}>Price</th>
                        <th style={{ width: '110px', textAlign: 'center', padding: '8px' }}>Receiver Sign / Sign-off</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dropoffOrders.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ padding: '16px', textAlign: 'center', color: '#64748b', fontStyle: 'italic', border: '1px solid #e2e8f0' }}>
                            No dropoff orders assigned to this rider in this scope.
                          </td>
                        </tr>
                      ) : (
                        dropoffOrders.map((order, idx) => (
                          <tr key={order.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ textAlign: 'center', fontWeight: 700, padding: '8px 4px', border: '1px solid #cbd5e1' }}>
                              {idx + 1}
                            </td>
                            <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>
                              <div style={{ fontWeight: 800, color: '#0f172a', fontFamily: 'monospace', fontSize: '12px' }}>
                                #{order.trackingCode}
                              </div>
                              <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'capitalize' }}>
                                {order.packageType} {order.priority === 'high' && '• High Priority'}
                              </div>
                            </td>
                            <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>
                              <div style={{ fontWeight: 700, color: '#0f172a' }}>
                                {order.receiverName}
                              </div>
                              <div style={{ fontSize: '11px', color: '#15803d', fontWeight: 600 }}>
                                📞 {order.receiverNumber}
                              </div>
                            </td>
                            <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>
                              <div style={{ fontWeight: 600, color: '#0f172a' }}>
                                {order.dropoffLocation}
                              </div>
                              <div style={{ fontSize: '10px', color: '#64748b' }}>
                                Region: {order.dropoffRegion}
                                {order.dropoffKumasiSubArea && ` • ${order.dropoffKumasiSubArea}`}
                              </div>
                              {order.additionalInstructions && (
                                <div style={{ fontSize: '10px', color: '#b45309', marginTop: '2px', fontStyle: 'italic' }}>
                                  Note: {order.additionalInstructions}
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #cbd5e1' }}>
                              <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '12px' }}>
                                GHS {formatFee(order.deliveryFee)}
                              </div>
                              {order.productFee && parseFloat(order.productFee) > 0 && (
                                <div style={{ fontSize: '9px', color: '#b45309', fontWeight: 700 }}>
                                  COD: GHS {formatFee(order.productFee)}
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #cbd5e1' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginBottom: '4px' }}>
                                <span style={{ display: 'inline-block', width: '12px', height: '12px', border: '1.5px solid #475569', borderRadius: '2px' }}></span>
                                <span style={{ fontSize: '9px', fontWeight: 700, color: '#475569' }}>[ ] Delivered</span>
                              </div>
                              <div style={{ borderBottom: '1px solid #94a3b8', height: '14px', width: '90%', margin: '0 auto' }}></div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Printable Sign-off & Instructions Footer */}
                <div style={{ 
                  marginTop: '32px', 
                  borderTop: '2px solid #0f172a', 
                  paddingTop: '16px' 
                }} className="page-break-inside-avoid">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '20px' }}>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#475569', marginBottom: '24px' }}>
                        Dispatched By (Operations Team)
                      </div>
                      <div style={{ borderBottom: '1px solid #000', marginBottom: '6px' }}></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748b' }}>
                        <span>Name & Signature</span>
                        <span>Date / Time</span>
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#475569', marginBottom: '24px' }}>
                        Rider Hardcopy Acknowledgment
                      </div>
                      <div style={{ borderBottom: '1px solid #000', marginBottom: '6px' }}></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748b' }}>
                        <span>{selectedRider.user.name}</span>
                        <span>Date / Time</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ 
                    background: '#f8fafc', 
                    border: '1px dashed #cbd5e1', 
                    borderRadius: '4px', 
                    padding: '8px 12px', 
                    fontSize: '10px', 
                    color: '#64748b',
                    textAlign: 'center'
                  }}>
                    <strong>Rider Notice:</strong> Please verify all package contents and sender/receiver identities on site. For any customer delays or unreachable numbers, alert Operations immediately.
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}
