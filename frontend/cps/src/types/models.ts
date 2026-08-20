export interface Job {
  id: string;
  status: 'Unassigned' | 'In Transit' | 'Delivered' | 'Delayed';
  pickupAddress: string;
  dropoffAddress: string;
  priority: 'Express' | 'Normal';
  createdAt: string;
}

export interface Rider {
  id: string;
  name: string;
  vehicleId: string;
  status: 'En Route' | 'Loading' | 'Maintenance' | 'Completed';
  location: string;
}

export interface Parcel {
  id: string;
  type: string;
  weight: number;
}
