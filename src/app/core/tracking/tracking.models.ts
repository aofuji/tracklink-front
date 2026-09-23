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

export interface PublicTracking {
  token: string;
  latitude: number;
  longitude: number;
  updatedAt: string;
  isActive: boolean;
  expiresAt: string;
}

export interface TrackingHistoryLocation {
  latitude: number;
  longitude: number;
  recordedAt: string;
}

export type LocationUpdatedPayload = PublicTracking;

export type TrackingLocationPayload = Coordinates;

export interface CreateTrackingResponse {
  token: string;
}
