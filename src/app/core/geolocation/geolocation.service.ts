import { inject, Injectable, InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { Coordinates, GeolocationFailure } from './geolocation.models';

export const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 5000,
};

export const GEOLOCATION = new InjectionToken<Geolocation | null>('GEOLOCATION', {
  factory: () => globalThis.navigator?.geolocation ?? null,
  providedIn: 'root',
});

@Injectable({ providedIn: 'root' })
export class GeolocationService {
  private readonly geolocation = inject(GEOLOCATION);

  getCurrentPosition(): Observable<Coordinates> {
    return new Observable<Coordinates>((subscriber) => {
      if (!this.geolocation) {
        subscriber.error(new GeolocationFailure('unsupported', 'Geolocation is not supported.'));
        return undefined;
      }

      this.geolocation.getCurrentPosition(
        (position) => {
          subscriber.next(toCoordinates(position));
          subscriber.complete();
        },
        (error) => subscriber.error(toFailure(error)),
        GEOLOCATION_OPTIONS,
      );

      return undefined;
    });
  }

  watchPosition(next: (position: Coordinates) => void, error: (failure: GeolocationFailure) => void): number {
    if (!this.geolocation) {
      throw new GeolocationFailure('unsupported', 'Geolocation is not supported.');
    }

    return this.geolocation.watchPosition(
      (position) => next(toCoordinates(position)),
      (failure) => error(toFailure(failure)),
      GEOLOCATION_OPTIONS,
    );
  }

  clearWatch(watchId: number): void {
    this.geolocation?.clearWatch(watchId);
  }
}

function toCoordinates(position: GeolocationPosition): Coordinates {
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  };
}

function toFailure(error: GeolocationPositionError): GeolocationFailure {
  switch (error.code) {
    case 1:
      return new GeolocationFailure('permission-denied', 'Geolocation permission was denied.');
    case 2:
      return new GeolocationFailure('position-unavailable', 'Geolocation position is unavailable.');
    case 3:
      return new GeolocationFailure('timeout', 'Geolocation request timed out.');
    default:
      return new GeolocationFailure('unknown', 'Geolocation failed.');
  }
}
