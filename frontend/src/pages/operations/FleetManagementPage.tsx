import { useState, useMemo } from 'react';
import EmptyState from '../../components/EmptyState';

type VehicleType = 'Motorbike' | 'Van' | 'Truck';
type FleetStatus = 'Available' | 'En Route' | 'Loading' | 'Maintenance' | 'Offline';

interface FleetMember {
  id: string;
  name: string;
  initials: string;
  vehicleId: string;
  vehicleType: VehicleType;
  location: string;
  status: FleetStatus;
}

const mockFleetData: FleetMember[] = [
  { id: 'RDR-001', name: 'John Doe', initials: 'JD', vehicleId: 'BK-1042', vehicleType: 'Motorbike', location: 'East Legon, Accra', status: 'En Route' },
  { id: 'RDR-002', name: 'Sarah Jenkins', initials: 'SJ', vehicleId: 'VN-2199', vehicleType: 'Van', location: 'Spintex Road, Accra', status: 'Loading' },
  { id: 'RDR-003', name: 'Michael Ross', initials: 'MR', vehicleId: 'BK-0883', vehicleType: 'Motorbike', location: 'Osu, Accra', status: 'Maintenance' },
  { id: 'RDR-004', name: 'Amanda Lee', initials: 'AL', vehicleId: 'VN-3321', vehicleType: 'Van', location: 'Airport Residential', status: 'Available' },
  { id: 'RDR-005', name: 'David Mensah', initials: 'DM', vehicleId: 'BK-9912', vehicleType: 'Motorbike', location: 'Cantonments, Accra', status: 'En Route' },
  { id: 'RDR-006', name: 'Kwame Osei', initials: 'KO', vehicleId: 'TK-5501', vehicleType: 'Truck', location: 'Tema Port', status: 'Offline' },
];

export default function FleetManagementPage() {
  const [activeTab, setActiveTab] = useState<string>('All Vehicles');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredFleet = useMemo(() => {
    return mockFleetData.filter(member => {
      let matchesTab = true;
      if (activeTab === 'Motorbikes') matchesTab = member.vehicleType === 'Motorbike';
      if (activeTab === 'Vans') matchesTab = member.vehicleType === 'Van';
      if (activeTab === 'Maintenance') matchesTab = member.status === 'Maintenance';
      
      const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            member.vehicleId.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesTab && matchesSearch;
    });
  }, [activeTab, searchQuery]);

  const getStatusColor = (status: FleetStatus) => {
    switch (status) {
      case 'Available': return { bg: '#e0ffe0', text: '#22863a', border: '#22863a' };
      case 'En Route': return { bg: '#dbeafe', text: '#1e40af', border: '#3b82f6' };
      case 'Loading': return { bg: '#fef3c7', text: '#b45309', border: '#f59e0b' };
      case 'Maintenance': return { bg: '#fee2e2', text: '#991b1b', border: '#ef4444' };
      case 'Offline': return { bg: '#f1f5f9', text: '#475569', border: '#94a3b8' };
      default: return { bg: '#f1f5f9', text: '#475569', border: '#94a3b8' };
    }
  };

  const getVehicleIcon = (type: VehicleType) => {
    switch (type) {
      case 'Motorbike': return '🏍️';
      case 'Van': return '🚐';
      case 'Truck': return '🚚';
      default: return '🚗';
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
            <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Riders/Drivers</div>
            <div style={{ fontSize: '36px', fontWeight: 800, color: '#0f172a', marginTop: '8px' }}>1,248</div>
            <div style={{ fontSize: '14px', color: '#078c35', fontWeight: 600, marginTop: '8px' }}>↑ 4.2% vs last week</div>
          </div>
          <div className="glass-card" style={{ padding: '24px' }}>
            <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>On-Time Rate</div>
            <div style={{ fontSize: '36px', fontWeight: 800, color: '#0f172a', marginTop: '8px' }}>98.4%</div>
            <div style={{ fontSize: '14px', color: '#078c35', fontWeight: 600, marginTop: '8px' }}>↑ 0.8% vs last week</div>
          </div>
          <div className="glass-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fleet Health</div>
                <div style={{ fontSize: '36px', fontWeight: 800, color: '#078c35', marginTop: '8px' }}>Good</div>
              </div>
            </div>
            <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden', marginTop: '12px' }}>
              <div style={{ height: '100%', width: '85%', background: '#078c35' }}></div>
            </div>
            <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 500, marginTop: '8px' }}>15% scheduled for maintenance</div>
          </div>
          <div className="glass-card" style={{ padding: '24px' }}>
            <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avg Utilization</div>
            <div style={{ fontSize: '36px', fontWeight: 800, color: '#0f172a', marginTop: '8px' }}>82<span style={{ fontSize: '20px', color: '#64748b' }}>%</span></div>
            <div style={{ fontSize: '14px', color: '#ef4444', fontWeight: 600, marginTop: '8px' }}>↓ 1.1% vs last week</div>
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
                    <tr>
                      <td colSpan={5} style={{ padding: '48px 24px', textAlign: 'center', color: '#64748b', fontWeight: 600, fontSize: '14px' }}>
                        Loading fleet data...
                      </td>
                    </tr>
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
                              <span style={{ fontSize: '24px' }}>{getVehicleIcon(member.vehicleType)}</span>
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
                              <select
                                value={member.currentStatus}
                                disabled={updatingId === member.id}
                                onChange={(e) => handleStatusChange(member.id, e.target.value as RiderStatus)}
                                style={{
                                  background: '#fff', border: '1px solid #cbd5e1', padding: '6px 8px',
                                  borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', color: '#0f172a'
                                }}
                              >
                                {STATUS_OPTIONS.map(status => (
                                  <option key={status} value={status}>{formatStatusLabel(status)}</option>
                                ))}
                              </select>
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

          {/* Live Heatmap Mini Card */}
          <div className="heatmap-container" style={{ height: '100%', minHeight: '600px' }}>
            <div className="heatmap-grid" />
            
            {/* Heat Zones */}
            <div className="heat-zone heat-high" style={{ top: '30%', left: '40%' }}></div>
            <div className="heat-zone heat-medium" style={{ top: '60%', left: '20%' }}></div>
            <div className="heat-zone heat-low" style={{ top: '20%', left: '70%' }}></div>
            <div className="heat-zone heat-medium" style={{ top: '70%', left: '60%' }}></div>

            {/* Overlay Info */}
            <div style={{ position: 'absolute', top: '24px', left: '24px', right: '24px', zIndex: 10 }}>
              <div style={{ background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)', padding: '12px 20px', borderRadius: '12px', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', display: 'inline-block' }}>
                <span style={{ fontWeight: 600, fontSize: '15px' }}>Live Density Heatmap</span>
              </div>
            </div>

            <div style={{ position: 'absolute', bottom: '24px', left: '24px', right: '24px', zIndex: 10 }}>
              <div style={{ background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Highest Density</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>East Legon Hub</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Active Units</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#ef4444' }}>412</div>
                </div>
              </div>
            </div>
          </div>
          
        </div>
      </main>
    </div>
  );
}
