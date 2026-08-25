export type VehicleType = 'motorbike' | 'van' | 'truck';
export type RiderStatus = 'available' | 'en_route' | 'loading' | 'maintenance' | 'offline';
export type ShipmentStatus =
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
export type PodMethod = 'signature' | 'photo';

export interface RiderProfile {
  id: string;
  userId: string;
  vehicleId: string | null;
  vehicleType: VehicleType | null;
  currentStatus: RiderStatus;
  currentLocation: string | null;
  createdAt: string;
  updatedAt: string;
  user: { id?: string; name: string; phone?: string | null };
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
  customerId: string | null;
  assignedRiderId: string | null;
  assignedRider?: RiderProfile | null;
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
  deliveryFee: string;
  productFee: string | null;
  weightKg: string | null;
  podMethod: PodMethod | null;
  podRecipientName: string | null;
  additionalInstructions: string | null;
  createdAt: string;
  updatedAt: string;
  statusEvents?: ShipmentStatusEvent[];
}

export interface CreateShipmentInput {
  vehicleType: VehicleType;
  priority: ShipmentPriority;
  speed: ShipmentSpeed;
  packageType: PackageType;
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
  productFee?: number;
  weightKg?: number;
  additionalInstructions?: string;
}
