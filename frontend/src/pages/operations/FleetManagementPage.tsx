import { useState, useMemo, useEffect } from 'react';
import { Truck, Bike, Car, Settings2 } from 'lucide-react';
import EmptyState from '../../components/EmptyState';
import CustomSelect from '../../components/Form/CustomSelect';
import { SkeletonTableRows } from '../../components/Skeleton';
import AssignVehicleModal from '../../components/AssignVehicleModal';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import type { RiderProfile, RiderStatus, VehicleType } from '../../types/models';

const STATUS_OPTIONS: RiderStatus[] = ['available', 'en_route', 'loading', 'maintenance', 'offline'];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('');
}

function formatStatusLabel(status: string): string {
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

const STATUS_SELECT_OPTIONS = STATUS_OPTIONS.map(status => ({ value: status, label: formatStatusLabel(status) }));

export default function FleetManagementPage() {
  const toast = useToast();
  const [riders, setRiders] = useState<RiderProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('All Vehicles');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [assigningRider, setAssigningRider] = useState<RiderProfile | null>(null);

  useEffect(() => {
    const fetchRiders = async () => {
      try {
        const { data } = await api.get<RiderProfile[]>('/riders');
        setRiders(data);
      } catch {
        setError('Failed to load fleet data.');
        toast.error('Failed to load fleet data.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchRiders();
  }, []);

  const handleStatusChange = async (riderId: string, newStatus: RiderStatus) => {
    setActionError(null);
    setUpdatingId(riderId);
    try {
      const { data } = await api.patch<RiderProfile>(`/riders/${riderId}`, { currentStatus: newStatus });
      setRiders(prev => prev.map(r => (r.id === riderId ? data : r)));
      toast.success('Rider status updated.');
    } catch {
      setActionError('Failed to update rider status.');
      toast.error('Failed to update rider status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredFleet = useMemo(() => {
    return riders.filter(member => {
      let matchesTab = true;
      if (activeTab === 'Motorbikes') matchesTab = member.vehicleType === 'motorbike';
      if (activeTab === 'Vans') matchesTab = member.vehicleType === 'van';
      if (activeTab === 'Maintenance') matchesTab = member.currentStatus === 'maintenance';

      const query = searchQuery.toLowerCase();
      const matchesSearch =
        member.user.name.toLowerCase().includes(query) ||
        (member.vehicleId ?? '').toLowerCase().includes(query);

      return matchesTab && matchesSearch;
    });
  }, [riders, activeTab, searchQuery]);

  const availableCount = useMemo(() => riders.filter(r => r.currentStatus === 'available').length, [riders]);
  const maintenanceCount = useMemo(() => riders.filter(r => r.currentStatus === 'maintenance').length, [riders]);
  const unassignedCount = useMemo(() => riders.filter(r => !r.vehicleId).length, [riders]);

  const getStatusColor = (status: RiderStatus) => {
    switch (status) {
      case 'available': return { bg: '#e0ffe0', text: '#22863a', border: '#22863a' };
      case 'en_route': return { bg: '#e2e8f0', text: '#0f172a', border: '#334155' };
      case 'loading': return { bg: '#fef3c7', text: '#b45309', border: '#f59e0b' };
      case 'maintenance': return { bg: '#fee2e2', text: '#991b1b', border: '#ef4444' };
      case 'offline': return { bg: '#f1f5f9', text: '#475569', border: '#94a3b8' };
      default: return { bg: '#f1f5f9', text: '#475569', border: '#94a3b8' };
    }
  };

  const getVehicleIcon = (type: VehicleType | null) => {
    switch (type) {
      case 'motorbike': return <Bike size={20} />;
      case 'van': return <Truck size={20} />;
      case 'truck': return <Truck size={20} />;
      default: return <Car size={20} />;
    }
  };

  return (
    <div className="page-shell light-shell">
      <style>{`
        /* Reuse glass-card from Ops Board */
        .glass-card {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.8);
          box-shadow: 0 8px 32px rgba(15, 23, 42, 0.05);
          border-radius: 16px;
        }

        .heatmap-container {
          background: #0f172a;
          border-radius: 16px;
          position: relative;
          overflow: hidden;
          box-shadow: inset 0 0 60px rgba(0,0,0,0.5), 0 10px 30px rgba(15, 23, 42, 0.2);
        }

        .heatmap-grid {
          position: absolute;
          inset: 0;
          background-image: 
            linear-gradient(rgba(245, 158, 11, 0.15) 1px, transparent 1px),
            linear-gradient(90deg, rgba(245, 158, 11, 0.15) 1px, transparent 1px);
          background-size: 40px 40px;
          opacity: 0.6;
        }

        .heat-zone {
          position: absolute;
          border-radius: 50%;
          filter: blur(20px);
          animation: pulseHeat 4s infinite alternate;
        }
        .heat-high { background: rgba(239, 68, 68, 0.6); width: 120px; height: 120px; }
        .heat-medium { background: rgba(245, 158, 11, 0.5); width: 150px; height: 150px; }
        .heat-low { background: rgba(131, 211, 20, 0.4); width: 200px; height: 200px; }

        @keyframes pulseHeat {
          0% { transform: scale(1); opacity: 0.7; }
          100% { transform: scale(1.2); opacity: 1; }
        }

        .filter-tab {
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          border: none;
          background: transparent;
          color: #64748b;
          transition: all 0.2s;
        }
        .filter-tab:hover {
          background: #f1f5f9;
        }
        .filter-tab.active {
          background: #078c35;
          color: #fff;
          box-shadow: 0 4px 12px rgba(7, 140, 53, 0.2);
        }

        .fleet-main-grid {
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 24px;
          padding: 0 24px;
          align-items: start;
        }

        .responsive-table-container {
          overflow-x: auto;
          width: 100%;
        }

        .avatar-circle {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 14px;
          flex-shrink: 0;
        }

        @media (max-width: 1024px) {
          .fleet-main-grid {
            grid-template-columns: 1fr;
          }
          .heatmap-container {
            height: 400px !important;
          }
        }
        @media (max-width: 768px) {
          .fleet-main-grid, .kpi-row, .header-row {
            padding: 0 16px !important;
          }
        }
      `}</style>

      <main className="container" style={{ padding: '32px 0', maxWidth: '1400px' }}>
        
        {/* Header Section */}
        <div className="header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '32px', padding: '0 24px' }}>
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', marginBottom: '8px', letterSpacing: '-0.02em' }}>Fleet Management</h1>
            <p className="muted-text" style={{ fontSize: '16px', color: '#64748b' }}>Real-time status for riders, bikes, vans, and active zones.</p>
          </div>
          
          <div style={{ display: 'flex', gap: '12px', background: '#fff', padding: '6px', borderRadius: '12px', border: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
            {['All Vehicles', 'Motorbikes', 'Vans', 'Maintenance'].map(tab => (
              <button 
                key={tab} 
                className={`filter-tab ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* KPI Row */}
        <div className="kpi-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '32px', padding: '0 24px' }}>
          <div className="glass-card" style={{ padding: '24px' }}>
            <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Riders</div>
            <div style={{ fontSize: '36px', fontWeight: 800, color: '#0f172a', marginTop: '8px' }}>{riders.length}</div>
          </div>
          <div className="glass-card" style={{ padding: '24px' }}>
            <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Available Now</div>
            <div style={{ fontSize: '36px', fontWeight: 800, color: '#078c35', marginTop: '8px' }}>{availableCount}</div>
          </div>
          <div className="glass-card" style={{ padding: '24px' }}>
            <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>In Maintenance</div>
            <div style={{ fontSize: '36px', fontWeight: 800, color: maintenanceCount > 0 ? '#ef4444' : '#0f172a', marginTop: '8px' }}>{maintenanceCount}</div>
          </div>
          <div className="glass-card" style={{ padding: '24px' }}>
            <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Unassigned Vehicle</div>
            <div style={{ fontSize: '36px', fontWeight: 800, color: '#0f172a', marginTop: '8px' }}>{unassignedCount}</div>
          </div>
        </div>

        {/* Main Dashboard Grid */}
        <div className="fleet-main-grid">
          
          {/* Detailed Fleet List */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0', background: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>Detailed Fleet List</h3>
              <input 
                type="text" 
                placeholder="Search Driver or Vehicle ID..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', maxWidth: '300px', padding: '10px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
              />
            </div>

            {actionError && (
              <div style={{ padding: '12px 24px', background: '#fee2e2', color: '#991b1b', fontSize: '13px', fontWeight: 600, borderBottom: '1px solid #fecaca' }}>
                {actionError}
              </div>
            )}

            <div className="responsive-table-container">
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '16px 24px', fontWeight: 600, color: '#64748b', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Driver</th>
                    <th style={{ padding: '16px 24px', fontWeight: 600, color: '#64748b', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Vehicle</th>
                    <th style={{ padding: '16px 24px', fontWeight: 600, color: '#64748b', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Location</th>
                    <th style={{ padding: '16px 24px', fontWeight: 600, color: '#64748b', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Status</th>
                    <th style={{ padding: '16px 24px', fontWeight: 600, color: '#64748b', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <SkeletonTableRows rows={6} cols={5} avatar />
                  ) : error ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '48px 24px', textAlign: 'center', color: '#991b1b', fontWeight: 600, fontSize: '14px' }}>
                        {error}
                      </td>
                    </tr>
                  ) : filteredFleet.length > 0 ? (
                    filteredFleet.map(member => {
                      const statusColor = getStatusColor(member.currentStatus);
                      const avatarBg = member.currentStatus === 'maintenance' ? '#f59e0b' : '#078c35';
                      return (
                        <tr key={member.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '16px 24px', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div className="avatar-circle" style={{ background: avatarBg, color: '#fff' }}>
                                {getInitials(member.user.name)}
                              </div>
                              <div>
                                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '15px' }}>{member.user.name}</div>
                                <div style={{ color: member.vehicleId ? '#64748b' : '#94a3b8', fontSize: '13px', marginTop: '2px', fontWeight: 600 }}>
                                  {member.vehicleId ?? 'Unassigned'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '16px 24px' }} title={member.vehicleType ?? 'Unassigned'}>
                            {member.vehicleType ? (
                              <span style={{ color: '#475569', display: 'inline-flex' }}>{getVehicleIcon(member.vehicleType)}</span>
                            ) : (
                              <span style={{ color: '#94a3b8', fontWeight: 600, fontSize: '13px' }}>Unassigned</span>
                            )}
                          </td>
                          <td style={{ padding: '16px 24px', color: '#475569', fontWeight: 500, fontSize: '14px', whiteSpace: 'nowrap' }}>
                            {member.currentLocation ?? 'Unknown'}
                          </td>
                          <td style={{ padding: '16px 24px', whiteSpace: 'nowrap' }}>
                            <span style={{
                              background: statusColor.bg, color: statusColor.text, border: `1px solid ${statusColor.border}`,
                              padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, display: 'inline-block'
                            }}>
                              {formatStatusLabel(member.currentStatus)}
                            </span>
                          </td>
                          <td style={{ padding: '16px 24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <div style={{ width: '180px' }}>
                                {updatingId === member.id ? (
                                  <div style={{
                                    display: 'flex', alignItems: 'center', gap: '8px', width: '100%', minHeight: '44px',
                                    border: '1px solid #e2e8f0', borderRadius: '10px', background: '#f1f5f9',
                                    padding: '0.65rem 0.9rem', color: '#94a3b8', fontSize: '0.95rem', cursor: 'not-allowed'
                                  }}>
                                    <Truck size={16} />
                                    Updating…
                                  </div>
                                ) : (
                                  <CustomSelect
                                    value={member.currentStatus}
                                    onChange={(v) => handleStatusChange(member.id, v as RiderStatus)}
                                    options={STATUS_SELECT_OPTIONS}
                                    icon={<Truck size={16} />}
                                  />
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => setAssigningRider(member)}
                                title="Assign vehicle"
                                aria-label="Assign vehicle"
                                style={{
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  width: '44px', height: '44px', flexShrink: 0,
                                  border: '1px solid #e2e8f0', borderRadius: '10px', background: '#fff',
                                  color: '#475569', cursor: 'pointer',
                                }}
                              >
                                <Settings2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} style={{ padding: 0 }}>
                        <EmptyState
                          icon="🚐"
                          title="No Fleet Found"
                          message="There are no riders or vehicles matching your current filters."
                          actionLabel="Clear Filters"
                          onAction={() => { setSearchQuery(''); setActiveTab('All Vehicles'); }}
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Fleet Status Breakdown */}
          <div className="glass-card" style={{ height: '100%', minHeight: '600px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Fleet Status Breakdown</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {STATUS_OPTIONS.map(status => {
                const count = riders.filter(r => r.currentStatus === status).length;
                const pct = riders.length > 0 ? Math.round((count / riders.length) * 100) : 0;
                const colors = getStatusColor(status);
                return (
                  <div key={status}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                      <span>{formatStatusLabel(status)}</span>
                      <span>{count}</span>
                    </div>
                    <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: colors.border, borderRadius: '4px' }} />
                    </div>
                  </div>
                );
              })}
            </div>
            {riders.length === 0 && (
              <p style={{ marginTop: '16px', fontSize: '13px', color: '#94a3b8', fontWeight: 600 }}>No riders registered yet.</p>
            )}
          </div>
          
        </div>
      </main>

      {assigningRider && (
        <AssignVehicleModal
          rider={assigningRider}
          onClose={() => setAssigningRider(null)}
          onUpdate={(updated) => {
            setRiders(prev => prev.map(r => (r.id === updated.id ? updated : r)));
            setAssigningRider(null);
          }}
        />
      )}
    </div>
  );
}
