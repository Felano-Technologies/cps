export type VehicleType = 'motorbike' | 'van' | 'truck';
export type RiderStatus = 'available' | 'en_route' | 'loading' | 'maintenance' | 'offline';
export type ShipmentStatus =
  | 'awaiting_price'
  | 'pending'
  | 'picked_up'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'delayed'
  | 'failed'
  | 'cancelled';
export type ShipmentPriority = 'standard' | 'high';
export type ShipmentSpeed = 'same_day' | 'next_day' | 'express';
export type PackageType = 'document' | 'parcel' | 'electronics' | 'fragile' | 'food' | 'other';
export type PackageSize = 'small' | 'medium' | 'big';
export type DeliveryType = 'doorstep' | 'station';
export type PodMethod = 'signature' | 'photo';

export interface RiderProfile {
  id: string;
  userId: string;
  vehicleId: string | null;
  vehicleType: VehicleType | null;
  currentStatus: RiderStatus;
  currentLocation: string | null;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
  user: { id?: string; name: string; email?: string; phone?: string | null };
}

export interface ShipmentCustomer {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role?: string;
}

export interface ShipmentStatusEvent {
  id: string;
  shipmentId: string;
  status: ShipmentStatus;
  note: string | null;
  createdAt: string;
}

export interface Shipment {
  id: string;
  trackingCode: string;
  batchId: string | null;
  status: ShipmentStatus;
  priority: ShipmentPriority;
  speed: ShipmentSpeed;
  vehicleType: VehicleType;
  packageType: PackageType;
  packageSize: PackageSize;
  deliveryType: DeliveryType;
  customerId: string | null;
  customer?: ShipmentCustomer | null;
  assignedRiderId: string | null;
  assignedRider?: RiderProfile | null;
  pickupRiderId?: string | null;
  pickupRider?: RiderProfile | null;
  dropoffRiderId?: string | null;
  dropoffRider?: RiderProfile | null;
  senderName: string;
  senderNumber: string;
  senderContact: string | null;
  pickupRegion: string;
  pickupLocation: string;
  pickupDate: string | null;
  receiverName: string;
  receiverNumber: string;
  dropoffRegion: string;
  dropoffKumasiSubArea: 'CampusAndEnvirons' | 'Other' | null;
  dropoffLocation: string;
  stationLocation: string | null;
  stationDriverName: string | null;
  stationDriverNumber: string | null;
  stationCarNumber: string | null;
  stationReceiptUrl: string | null;
  stationHandoverAt: string | null;
  deliveryFee: string;
  productFee: string | null;
  weightKg: string | null;
  podMethod: PodMethod | null;
  podRecipientName: string | null;
  podSignatureData: string | null;
  podPhotoUrl: string | null;
  packageImageUrl?: string | null;
  additionalInstructions: string | null;
  opsRemarks?: string;
  // Partner API orders
  businessId?: string | null;
  business?: { id: string; name: string } | null;
  externalReference?: string | null;
  prepaid?: boolean;
  deliveryCodeHash?: string | null;
  deliveryCodeAttempts?: number;
  deliveryCodeVerifiedAt?: string | null;
  deliveryCodeOverrideNote?: string | null;
  createdAt: string;
  updatedAt: string;
  statusEvents?: ShipmentStatusEvent[];
}

/** True when the rider must collect the partner's delivery code before POD. */
export function needsDeliveryCode(s: Pick<Shipment, 'deliveryCodeHash' | 'deliveryCodeVerifiedAt'>) {
  return !!s.deliveryCodeHash && !s.deliveryCodeVerifiedAt;
}

// ── Business portal / Partner API ───────────────────────────────────────────

export type BusinessStatus = 'pending' | 'approved' | 'suspended';

export interface BusinessProfile {
  id: string;
  name: string;
  contactEmail: string | null;
  contactPhone: string | null;
  status: BusinessStatus;
  webhookUrl: string | null;
  createdAt: string;
  activeKeys: number;
  shipmentCounts: Partial<Record<ShipmentStatus, number>>;
}

export interface ApiKeySummary {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export interface WebhookEventView {
  id: string;
  type: string;
  sequence: number;
  trackingCode: string | null;
  externalReference: string | null;
  state: 'pending' | 'delivered' | 'failed';
  attempts: number;
  lastStatusCode: number | null;
  lastError: string | null;
  nextAttemptAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  body: unknown;
}

/** Shipment as returned by the Partner API (see backend lib/partnerSerializer.ts). */
export interface PartnerShipment {
  trackingCode: string;
  externalReference: string | null;
  status: ShipmentStatus;
  deliveryType: DeliveryType;
  fee: { amount: number; currency: 'GHS' };
  pickup: { name: string; phone: string; region: string; location: string };
  dropoff: { name: string; phone: string; region: string; kumasiSubArea: string | null; location: string };
  package: { type: PackageType; size: PackageSize };
  rider: { name: string; phone: string | null } | null;
  deliveryCodeRequired: boolean;
  proofOfDelivery: { method: PodMethod | null; recipientName: string | null; photoUrl: string | null; deliveryCodeVerified: boolean } | null;
  cancellationReason: string | null;
  events: { status: ShipmentStatus; note: string | null; at: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface BusinessStatement {
  from: string;
  to: string;
  currency: 'GHS';
  count: number;
  totalFees: number;
  rows: { trackingCode: string; externalReference: string | null; receiverName: string; dropoffRegion: string; deliveredAt: string; fee: number }[];
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  shipmentId: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface CreateShipmentInput {
  vehicleType: VehicleType;
  priority: ShipmentPriority;
  speed: ShipmentSpeed;
  packageType: PackageType;
  packageSize: PackageSize;
  deliveryType?: DeliveryType;
  senderName: string;
  senderNumber: string;
  senderContact?: string;
  pickupRegion: string;
  pickupLocation: string;
  pickupDate?: string;
  receiverName: string;
  receiverNumber: string;
  dropoffRegion: string;
  dropoffKumasiSubArea?: 'CampusAndEnvirons' | 'Other';
  dropoffLocation: string;
  stationLocation?: string;
  productFee?: number;
  weightKg?: number;
  additionalInstructions?: string;
  packageImageUrl?: string;
}

export type DeductionCategory =
  | 'late_delivery'
  | 'damaged_goods'
  | 'fuel_advance'
  | 'equipment'
  | 'disciplinary'
  | 'loan_repayment'
  | 'other';

export interface RiderDeduction {
  id: string;
  riderId: string;
  rider?: RiderProfile;
  amount: string | number;
  category: DeductionCategory;
  reason: string;
  shipmentId: string | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DeductionSummary {
  totalAmount: number;
  totalCount: number;
  uniqueRiders: number;
  categoryBreakdown: Record<string, number>;
}

export type BonusType = 'pickup' | 'dropoff';

export interface RiderBonus {
  id: string;
  riderId: string;
  rider?: RiderProfile;
  shipmentId: string;
  shipment?: {
    id: string;
    trackingCode: string;
    pickupLocation: string;
    dropoffLocation: string;
    status?: string;
    deliveryFee?: string | number;
    productFee?: string | number | null;
  };
  type: BonusType;
  amount: string | number;
  createdAt: string;
}

export interface BonusSummary {
  totalCount: number;
  totalAmount: number;
  pickupCount: number;
  pickupAmount: number;
  dropoffCount: number;
  dropoffAmount: number;
}

export interface RiderBonusAggregate {
  riderId: string;
  riderName: string;
  phone: string | null;
  vehicleId: string | null;
  vehicleType: string | null;
  pickupCount: number;
  dropoffCount: number;
  totalBonusCount: number;
  totalBonusAmount: number;
}


