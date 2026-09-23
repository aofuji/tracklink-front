export interface Coordinates {
  latitude: number;
  longitude: number;
}

export type GeolocationFailureCode = 'unsupported' | 'permission-denied' | 'position-unavailable' | 'timeout' | 'unknown';

export class GeolocationFailure extends Error {
  constructor(readonly code: GeolocationFailureCode, message: string) {
    super(message);
    this.name = 'GeolocationFailure';
  }
}
