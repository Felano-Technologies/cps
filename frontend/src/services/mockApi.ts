import type { AxiosRequestConfig, AxiosResponse } from 'axios';

export const MOCK_MODE = import.meta.env.VITE_MOCK_MODE === 'true';
export const MOCK_USER_KEY = 'cps_mock_user';

export type MockRole = 'customer' | 'operations' | 'rider' | 'admin';

export const mockUsers = {
  customer: { id: 'mock-customer', name: 'Demo Customer', email: 'customer@cps.test', phone: '0240000001', role: 'customer' as const, phoneVerified: true },
  operations: { id: 'mock-ops', name: 'Demo Operations', email: 'ops@cps.test', phone: '0240000002', role: 'operations' as const, phoneVerified: true },
  rider: { id: 'mock-rider', name: 'Demo Rider', email: 'rider@cps.test', phone: '0240000003', role: 'rider' as const, phoneVerified: true },
  admin: { id: 'mock-admin', name: 'Demo Admin', email: 'admin@cps.test', phone: '0240000004', role: 'admin' as const, phoneVerified: true },
};

// Deliberately empty: real orders come from the backend. Mock mode remains available
// for frontend-only access, but it no longer injects demo operational data.
const mockShipments: Array<Record<string, any>> = [];

export function getMockUser() {
  try { const stored = localStorage.getItem(MOCK_USER_KEY); if (stored) return JSON.parse(stored); } catch { /* ignore */ }
  return null;
}

export function setMockUser(role: MockRole) { localStorage.setItem(MOCK_USER_KEY, JSON.stringify(mockUsers[role])); return mockUsers[role]; }
export function clearMockUser() { localStorage.removeItem(MOCK_USER_KEY); }

export function mockResponse(config: AxiosRequestConfig, data: unknown, status = 200): AxiosResponse {
  return { data, status, statusText: 'OK', headers: {}, config: config as AxiosResponse['config'], request: undefined };
}

export function mockFallback(config: AxiosRequestConfig): AxiosResponse | null {
  const method = (config.method || 'get').toLowerCase();
  const url = config.url || '';
  if (method === 'get' && url.endsWith('/auth/me')) return mockResponse(config, getMockUser(), getMockUser() ? 200 : 401);
  if (method === 'get' && url.includes('/shipments')) return mockResponse(config, mockShipments);
  if (method === 'get' && url.endsWith('/riders/me')) return mockResponse(config, { id: 'mock-rider-profile', userId: 'mock-rider', vehicleId: 'DEMO-01', vehicleType: 'motorbike', currentStatus: 'available', currentLocation: null, isVerified: true, user: mockUsers.rider });
  if (method === 'get' && url.includes('/riders')) return mockResponse(config, [{ id: 'mock-rider-profile', userId: 'mock-rider', vehicleId: 'DEMO-01', vehicleType: 'motorbike', currentStatus: 'available', currentLocation: null, isVerified: true, user: mockUsers.rider }]);
  if (method === 'get') return mockResponse(config, []);
  if (method === 'post' || method === 'patch') {
    let body: Record<string, any> = {};
    try { body = typeof config.data === 'string' ? JSON.parse(config.data) : (config.data || {}); } catch { /* use empty body */ }
    const match = url.match(/\/shipments\/([^/]+)/);
    const batchMatch = url.match(/\/shipments\/batch\/([^/]+)\/(accept|decline)/);
    const all = mockShipments;
    if (batchMatch) {
      const batchOrders = all.filter(item => item.batchId === batchMatch[1]);
      batchOrders.forEach(item => {
        if (batchMatch[2] === 'accept') Object.assign(item, { status: 'pending', deliveryFee: '0.00', pickupRiderId: body.pickupRiderId || null, assignedRiderId: body.pickupRiderId || null });
        else Object.assign(item, { status: 'cancelled', opsRemarks: body.reason || 'Bulk pickup declined by operations' });
      });
      return mockResponse(config, batchOrders);
    }
    const shipment = match ? all.find(item => item.id === match[1] || item.trackingCode === match[1]) : undefined;
    if (shipment) {
      if (url.endsWith('/status') && body.status) shipment.status = body.status;
      if (url.endsWith('/assign')) Object.assign(shipment, body, { assignedRiderId: body.dropoffRiderId || body.pickupRiderId || (shipment as any).assignedRiderId });
      if (url.endsWith('/station-handover')) Object.assign(shipment, body, { status: 'delivered', stationHandoverAt: new Date().toISOString() });
      if (url.endsWith('/pod')) Object.assign(shipment, body, { status: 'delivered' });
      if (url.endsWith('/process') && body.deliveryFee !== undefined) Object.assign(shipment, body, { status: 'pending' });
      return mockResponse(config, shipment);
    }
    return mockResponse(config, { ...body, id: 'mock-response', status: body.status || 'pending' });
  }
  return mockResponse(config, {});
}
