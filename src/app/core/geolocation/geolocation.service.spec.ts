import { TestBed } from '@angular/core/testing';
import { GEOLOCATION, GEOLOCATION_OPTIONS, GeolocationService } from './geolocation.service';
import { GeolocationFailure } from './geolocation.models';

describe('GeolocationService', () => {
  function setup(geolocation: Partial<Geolocation> | null) {
    TestBed.configureTestingModule({
      providers: [
        GeolocationService,
        { provide: GEOLOCATION, useValue: geolocation },
      ],
    });

    return TestBed.inject(GeolocationService);
  }

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('gets the current position with the configured options', () => {
    const getCurrentPosition = vi.fn((success: PositionCallback) => {
      success({ coords: { latitude: 1, longitude: 2 } } as GeolocationPosition);
    });
    const service = setup({ getCurrentPosition });
    let result: unknown;

    service.getCurrentPosition().subscribe((position) => {
      result = position;
    });

    expect(getCurrentPosition).toHaveBeenCalledWith(expect.any(Function), expect.any(Function), GEOLOCATION_OPTIONS);
    expect(result).toEqual({ latitude: 1, longitude: 2 });
  });

  it('maps geolocation permission errors', () => {
    const getCurrentPosition = vi.fn((_success: PositionCallback, error: PositionErrorCallback) => {
      error({ code: 1 } as GeolocationPositionError);
    });
    const service = setup({ getCurrentPosition });
    let failure: unknown;

    service.getCurrentPosition().subscribe({ error: (error: unknown) => { failure = error; } });

    expect(failure).toBeInstanceOf(GeolocationFailure);
    expect((failure as GeolocationFailure).code).toBe('permission-denied');
  });

  it('reports unsupported browsers', () => {
    const service = setup(null);
    let failure: unknown;

    service.getCurrentPosition().subscribe({ error: (error: unknown) => { failure = error; } });

    expect(failure).toBeInstanceOf(GeolocationFailure);
    expect((failure as GeolocationFailure).code).toBe('unsupported');
  });

  it('starts and clears a position watcher', () => {
    const watchPosition = vi.fn((success: PositionCallback) => {
      success({ coords: { latitude: 3, longitude: 4 } } as GeolocationPosition);
      return 42;
    });
    const clearWatch = vi.fn();
    const service = setup({ watchPosition, clearWatch });
    let result: unknown;

    const watchId = service.watchPosition((position) => { result = position; }, () => undefined);
    service.clearWatch(watchId);

    expect(watchId).toBe(42);
    expect(watchPosition).toHaveBeenCalledWith(expect.any(Function), expect.any(Function), GEOLOCATION_OPTIONS);
    expect(clearWatch).toHaveBeenCalledWith(42);
    expect(result).toEqual({ latitude: 3, longitude: 4 });
  });
});
