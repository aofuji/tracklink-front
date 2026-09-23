export type TrackingDerivedStatus = 'active' | 'inactive' | 'expired';

export interface TrackingSummary {
  token: string;
  isActive: boolean;
  latitude: number;
  longitude: number;
  updatedAt: string;
  expiresAt: string;
}
