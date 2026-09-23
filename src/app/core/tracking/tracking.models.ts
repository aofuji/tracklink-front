import { Coordinates } from '../geolocation/geolocation.models';

export type TrackingDerivedStatus = 'active' | 'inactive' | 'expired';

export interface TrackingSummary {
  token: string;
  isActive: boolean;
  latitude: number;
  longitude: number;
  updatedAt: string;
  expiresAt: string;
}

export type TrackingLocationPayload = Coordinates;

export interface CreateTrackingResponse {
  token: string;
}
