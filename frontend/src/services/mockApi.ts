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

const mockShipments = [
  { id: 'mock-order-1', trackingCode: 'CPS-DEMO-001', batchId: null, status: 'pending', priority: 'standard', speed: 'next_day', vehicleType: 'motorbike', packageType: 'parcel', packageSize: 'medium', deliveryType: 'doorstep', customerId: 'mock-customer', senderName: 'Demo Customer', senderNumber: '0240000001', senderContact: null, pickupRegion: 'Kumasi', pickupLocation: 'Adum', pickupDate: null, receiverName: 'Ama Mensah', receiverNumber: '0241111111', dropoffRegion: 'Kumasi', dropoffKumasiSubArea: null, dropoffLocation: 'KNUST Campus', stationLocation: null, deliveryFee: '35.00', productFee: null, weightKg: null, podMethod: null, podRecipientName: null, podSignatureData: null, podPhotoUrl: null, packageImageUrl: null, additionalInstructions: 'Call on arrival', opsRemarks: null, stationDriverName: null, stationDriverNumber: null, stationCarNumber: null, stationReceiptUrl: null, stationHandoverAt: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'mock-order-2', trackingCode: 'CPS-DEMO-002', batchId: null, status: 'out_for_delivery', priority: 'high', speed: 'express', vehicleType: 'van', packageType: 'electronics', packageSize: 'big', deliveryType: 'station', customerId: 'mock-customer', senderName: 'Demo Customer', senderNumber: '0240000001', senderContact: null, pickupRegion: 'Kumasi', pickupLocation: 'Bantama', pickupDate: null, receiverName: 'Kofi Boateng', receiverNumber: '0242222222', dropoffRegion: 'Accra', dropoffKumasiSubArea: null, dropoffLocation: 'Accra Central', stationLocation: 'STC Terminal, Accra', deliveryFee: '85.00', productFee: null, weightKg: null, podMethod: null, podRecipientName: null, podSignatureData: null, podPhotoUrl: null, packageImageUrl: null, additionalInstructions: null, opsRemarks: null, stationDriverName: null, stationDriverNumber: null, stationCarNumber: null, stationReceiptUrl: null, stationHandoverAt: null, createdAt: new Date(Date.now() - 86400000).toISOString(), updatedAt: new Date().toISOString() },
];

// Deliberately varied fixtures for testing filters, status controls, station handovers,
// receipts, package sizes, regions, and operations pricing flows.
const additionalMockShipments = [
  { ...mockShipments[0], id: 'mock-order-3', trackingCode: 'CPS-DEMO-003', status: 'awaiting_price', packageType: 'food', packageSize: 'small', speed: 'same_day', pickupRegion: 'Kumasi', pickupLocation: 'Ahodwo', receiverName: 'Esi Owusu', receiverNumber: '0243333333', dropoffRegion: 'Takoradi', dropoffLocation: 'Market Circle', deliveryFee: '55.00', createdAt: new Date(Date.now() - 2 * 86400000).toISOString() },
  { ...mockShipments[0], id: 'mock-order-4', trackingCode: 'CPS-DEMO-004', status: 'picked_up', packageType: 'fragile', packageSize: 'small', pickupLocation: 'Kumasi City Mall', receiverName: 'Yaw Asante', receiverNumber: '0244444444', dropoffRegion: 'Sunyani', dropoffLocation: 'Fiapre', deliveryFee: '60.00', assignedRiderId: 'mock-rider-profile', pickupRiderId: 'mock-rider-profile', createdAt: new Date(Date.now() - 3 * 86400000).toISOString() },
  { ...mockShipments[0], id: 'mock-order-5', trackingCode: 'CPS-DEMO-005', status: 'in_transit', packageType: 'document', packageSize: 'small', pickupLocation: 'Kumasi Central Post', receiverName: 'Akosua Mensima', receiverNumber: '0245555555', dropoffRegion: 'Tamale', dropoffLocation: 'Lamashegu', deliveryFee: '70.00', assignedRiderId: 'mock-rider-profile', dropoffRiderId: 'mock-rider-profile', createdAt: new Date(Date.now() - 4 * 86400000).toISOString() },
  { ...mockShipments[0], id: 'mock-order-6', trackingCode: 'CPS-DEMO-006', status: 'delayed', packageType: 'parcel', packageSize: 'big', pickupLocation: 'Asokwa', receiverName: 'Kojo Mensah', receiverNumber: '0246666666', dropoffRegion: 'Accra', dropoffLocation: 'Madina', deliveryFee: '80.00', additionalInstructions: 'Delayed due to traffic', assignedRiderId: 'mock-rider-profile', dropoffRiderId: 'mock-rider-profile', createdAt: new Date(Date.now() - 5 * 86400000).toISOString() },
  { ...mockShipments[0], id: 'mock-order-7', trackingCode: 'CPS-DEMO-007', status: 'delivered', packageType: 'electronics', packageSize: 'medium', pickupLocation: 'Oforikrom', receiverName: 'Adjoa Quaye', receiverNumber: '0247777777', dropoffRegion: 'Kumasi', dropoffLocation: 'Daban', deliveryFee: '40.00', podMethod: 'photo', podRecipientName: 'Adjoa Quaye', assignedRiderId: 'mock-rider-profile', dropoffRiderId: 'mock-rider-profile', createdAt: new Date(Date.now() - 6 * 86400000).toISOString() },
  { ...mockShipments[1], id: 'mock-order-8', trackingCode: 'CPS-DEMO-008', status: 'delivered', packageType: 'parcel', packageSize: 'medium', receiverName: 'Nana Addo', receiverNumber: '0248888888', dropoffRegion: 'Accra', dropoffLocation: 'Kaneshie', stationLocation: 'Kaneshie Station', stationDriverName: 'Kwame Driver', stationDriverNumber: '0249999991', stationCarNumber: 'GR 1234-26', stationReceiptUrl: 'https://example.com/demo-receipt-008.jpg', stationHandoverAt: new Date().toISOString(), assignedRiderId: 'mock-rider-profile', dropoffRiderId: 'mock-rider-profile', createdAt: new Date(Date.now() - 7 * 86400000).toISOString() },
  { ...mockShipments[0], id: 'mock-order-9', trackingCode: 'CPS-DEMO-009', status: 'cancelled', packageType: 'other', packageSize: 'big', pickupLocation: 'KNUST', receiverName: 'Mawusi Kpegah', receiverNumber: '0241010101', dropoffRegion: 'Takoradi', dropoffLocation: 'Effia', deliveryFee: '65.00', createdAt: new Date(Date.now() - 8 * 86400000).toISOString() },
  { ...mockShipments[1], id: 'mock-order-10', trackingCode: 'CPS-DEMO-010', status: 'pending', packageType: 'food', packageSize: 'small', pickupLocation: 'Bantama', receiverName: 'Abena Boateng', receiverNumber: '0242020202', dropoffRegion: 'Sunyani', dropoffLocation: 'New Dormaa', stationLocation: 'Sunyani VIP Station', deliveryFee: '58.00', assignedRiderId: 'mock-rider-profile', dropoffRiderId: 'mock-rider-profile', createdAt: new Date(Date.now() - 9 * 86400000).toISOString() },
];

const mockBulkShipments = [
  { ...mockShipments[0], id: 'mock-bulk-1', trackingCode: 'CPS-BULK-001-A', batchId: 'mock-batch-001', status: 'pending', senderName: 'Demo Bulk Sender', senderNumber: '0243030303', pickupLocation: 'Kumasi Warehouse', packageType: 'parcel', packageSize: 'medium', receiverName: 'Bulk Receiver One', receiverNumber: '0243131313', dropoffRegion: 'Kumasi', dropoffLocation: 'Baba Yara Stadium', deliveryFee: '35.00', createdAt: new Date(Date.now() - 3600000).toISOString() },
  { ...mockShipments[0], id: 'mock-bulk-2', trackingCode: 'CPS-BULK-001-B', batchId: 'mock-batch-001', status: 'pending', senderName: 'Demo Bulk Sender', senderNumber: '0243030303', pickupLocation: 'Kumasi Warehouse', packageType: 'parcel', packageSize: 'medium', receiverName: 'Bulk Receiver Two', receiverNumber: '0243232323', dropoffRegion: 'Accra', dropoffLocation: 'Osu Oxford Street', deliveryFee: '85.00', createdAt: new Date(Date.now() - 3600000).toISOString() },
  { ...mockShipments[0], id: 'mock-bulk-3', trackingCode: 'CPS-BULK-001-C', batchId: 'mock-batch-001', status: 'picked_up', senderName: 'Demo Bulk Sender', senderNumber: '0243030303', pickupLocation: 'Kumasi Warehouse', packageType: 'parcel', packageSize: 'medium', receiverName: 'Bulk Receiver Three', receiverNumber: '0243334343', dropoffRegion: 'Sunyani', dropoffLocation: 'Sunyani Central', deliveryFee: '60.00', assignedRiderId: 'mock-rider-profile', pickupRiderId: 'mock-rider-profile', createdAt: new Date(Date.now() - 3600000).toISOString() },
];

const mockNewBulkShipments = [
  { ...mockShipments[0], id: 'mock-new-bulk-1', trackingCode: 'CPS-BULK-NEW-A', batchId: 'mock-batch-new-001', status: 'awaiting_price', senderName: 'New Bulk Customer', senderNumber: '0244040404', pickupRegion: 'Kumasi', pickupLocation: 'Suame Magazine', packageType: 'parcel', packageSize: 'medium', receiverName: 'New Bulk Receiver One', receiverNumber: '0244141414', dropoffRegion: 'Kumasi', dropoffLocation: 'Kejetia Terminal', deliveryFee: '35.00', createdAt: new Date().toISOString() },
  { ...mockShipments[0], id: 'mock-new-bulk-2', trackingCode: 'CPS-BULK-NEW-B', batchId: 'mock-batch-new-001', status: 'awaiting_price', senderName: 'New Bulk Customer', senderNumber: '0244040404', pickupRegion: 'Kumasi', pickupLocation: 'Suame Magazine', packageType: 'parcel', packageSize: 'medium', receiverName: 'New Bulk Receiver Two', receiverNumber: '0244242424', dropoffRegion: 'Accra', dropoffLocation: 'Circle Station', deliveryFee: '85.00', createdAt: new Date().toISOString() },
  { ...mockShipments[0], id: 'mock-new-bulk-3', trackingCode: 'CPS-BULK-NEW-C', batchId: 'mock-batch-new-001', status: 'awaiting_price', senderName: 'New Bulk Customer', senderNumber: '0244040404', pickupRegion: 'Kumasi', pickupLocation: 'Suame Magazine', packageType: 'parcel', packageSize: 'medium', receiverName: 'New Bulk Receiver Three', receiverNumber: '0244343434', dropoffRegion: 'Sunyani', dropoffLocation: 'Sunyani Station', deliveryFee: '60.00', createdAt: new Date().toISOString() },
];

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
  if (method === 'get' && url.includes('/shipments')) return mockResponse(config, [...mockShipments, ...additionalMockShipments, ...mockBulkShipments, ...mockNewBulkShipments]);
  if (method === 'get' && url.endsWith('/riders/me')) return mockResponse(config, { id: 'mock-rider-profile', userId: 'mock-rider', vehicleId: 'DEMO-01', vehicleType: 'motorbike', currentStatus: 'available', currentLocation: null, isVerified: true, user: mockUsers.rider });
  if (method === 'get' && url.includes('/riders')) return mockResponse(config, [{ id: 'mock-rider-profile', userId: 'mock-rider', vehicleId: 'DEMO-01', vehicleType: 'motorbike', currentStatus: 'available', currentLocation: null, isVerified: true, user: mockUsers.rider }]);
  if (method === 'get') return mockResponse(config, []);
  if (method === 'post' || method === 'patch') {
    let body: Record<string, any> = {};
    try { body = typeof config.data === 'string' ? JSON.parse(config.data) : (config.data || {}); } catch { /* use empty body */ }
    const match = url.match(/\/shipments\/([^/]+)/);
    const batchMatch = url.match(/\/shipments\/batch\/([^/]+)\/(accept|decline)/);
    const all = [...mockShipments, ...additionalMockShipments, ...mockBulkShipments, ...mockNewBulkShipments];
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
