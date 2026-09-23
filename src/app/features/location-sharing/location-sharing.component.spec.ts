import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { Coordinates, GeolocationFailure } from '../../core/geolocation/geolocation.models';
import { GeolocationService } from '../../core/geolocation/geolocation.service';
import { LocationSharingSessionService } from '../../core/tracking/location-sharing-session.service';
import { TrackingService } from '../../core/tracking/tracking.service';
import { LocationSharingComponent } from './location-sharing.component';

const initialPosition: Coordinates = { latitude: 0, longitude: 0 };
const atLeastTenMeters: Coordinates = { latitude: 10 / 6371000 * 180 / Math.PI, longitude: 0 };
const twentyMeters: Coordinates = { latitude: 20 / 6371000 * 180 / Math.PI, longitude: 0 };
const belowTenMeters: Coordinates = { latitude: 5 / 6371000 * 180 / Math.PI, longitude: 0 };

describe('LocationSharingComponent', () => {
  let fixture: ComponentFixture<LocationSharingComponent>;
  let component: LocationSharingComponent;
  let initialPosition$: Subject<Coordinates>;
  let watchSuccess: (position: Coordinates) => void;
  let watchError: (failure: GeolocationFailure) => void;
  let geolocationService: {
    getCurrentPosition: ReturnType<typeof vi.fn>;
    watchPosition: ReturnType<typeof vi.fn>;
    clearWatch: ReturnType<typeof vi.fn>;
  };
  let trackingService: {
    createTracking: ReturnType<typeof vi.fn>;
    updateTracking: ReturnType<typeof vi.fn>;
    endTracking: ReturnType<typeof vi.fn>;
  };

  async function createComponent(): Promise<void> {
    initialPosition$ = new Subject<Coordinates>();
    geolocationService = {
      getCurrentPosition: vi.fn().mockReturnValue(initialPosition$.asObservable()),
      watchPosition: vi.fn((next: (position: Coordinates) => void, error: (failure: GeolocationFailure) => void) => {
        watchSuccess = next;
        watchError = error;
        return 77;
      }),
      clearWatch: vi.fn(),
    };
    trackingService = {
      createTracking: vi.fn().mockReturnValue(of({ token: 'tracking-token' })),
      updateTracking: vi.fn().mockReturnValue(of(undefined)),
      endTracking: vi.fn().mockReturnValue(of(undefined)),
    };

    await TestBed.configureTestingModule({
      imports: [LocationSharingComponent],
      providers: [
        LocationSharingSessionService,
        { provide: GeolocationService, useValue: geolocationService },
        { provide: TrackingService, useValue: trackingService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LocationSharingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  function activateSharing(): void {
    initialPosition$.next(initialPosition);
    initialPosition$.complete();
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-23T00:00:00Z'));
  });

  afterEach(() => {
    fixture?.destroy();
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  it('gets an initial position before creating tracking and then starts watching', async () => {
    await createComponent();

    expect(trackingService.createTracking).not.toHaveBeenCalled();

    activateSharing();

    expect(trackingService.createTracking).toHaveBeenCalledWith({ latitude: 0, longitude: 0 });
    expect(component.token()).toBe('tracking-token');
    expect(component.state()).toBe('active');
    expect(geolocationService.watchPosition).toHaveBeenCalledOnce();
  });

  it('sends PUT when movement is greater than or equal to 10 meters', async () => {
    await createComponent();
    activateSharing();
    trackingService.updateTracking.mockClear();

    watchSuccess(atLeastTenMeters);

    expect(trackingService.updateTracking).toHaveBeenCalledWith('tracking-token', atLeastTenMeters);
  });

  it('sends PUT when at least 10 seconds have passed since the last confirmed send', async () => {
    await createComponent();
    activateSharing();
    trackingService.updateTracking.mockClear();
    vi.setSystemTime(new Date('2026-09-23T00:00:10Z'));

    watchSuccess(initialPosition);

    expect(trackingService.updateTracking).toHaveBeenCalledWith('tracking-token', initialPosition);
  });

  it('does not send PUT below both the 10 meter and 10 second limits', async () => {
    await createComponent();
    activateSharing();
    trackingService.updateTracking.mockClear();
    vi.setSystemTime(new Date('2026-09-23T00:00:09Z'));

    watchSuccess(belowTenMeters);

    expect(trackingService.updateTracking).not.toHaveBeenCalled();
  });

  it('does not run concurrent PUTs and keeps only the latest pending eligible position', async () => {
    const firstUpdate = new Subject<void>();
    await createComponent();
    activateSharing();
    trackingService.updateTracking
      .mockReset()
      .mockReturnValueOnce(firstUpdate.asObservable())
      .mockReturnValue(of(undefined));

    watchSuccess(atLeastTenMeters);
    watchSuccess(twentyMeters);

    expect(trackingService.updateTracking).toHaveBeenCalledTimes(1);
    expect(trackingService.updateTracking).toHaveBeenNthCalledWith(1, 'tracking-token', atLeastTenMeters);

    firstUpdate.next();
    firstUpdate.complete();

    expect(trackingService.updateTracking).toHaveBeenCalledTimes(2);
    expect(trackingService.updateTracking).toHaveBeenNthCalledWith(2, 'tracking-token', twentyMeters);
  });

  it('cleans the watcher when the component is destroyed', async () => {
    await createComponent();
    activateSharing();

    fixture.destroy();

    expect(geolocationService.clearWatch).toHaveBeenCalledWith(77);
  });

  it('handles permission denied without creating a tracking and allows retry state', async () => {
    await createComponent();

    initialPosition$.error(new GeolocationFailure('permission-denied', 'denied'));

    expect(component.state()).toBe('error');
    expect(component.message()).toContain('Permissão de localização negada');
    expect(trackingService.createTracking).not.toHaveBeenCalled();
  });

  it('does not end active sharing for temporary geolocation errors', async () => {
    await createComponent();
    activateSharing();

    watchError(new GeolocationFailure('timeout', 'timeout'));

    expect(component.state()).toBe('active');
    expect(geolocationService.clearWatch).not.toHaveBeenCalled();
  });

  it('does not end active sharing for temporary PUT errors', async () => {
    await createComponent();
    activateSharing();
    trackingService.updateTracking.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));

    watchSuccess(atLeastTenMeters);

    expect(component.state()).toBe('active');
    expect(geolocationService.clearWatch).not.toHaveBeenCalled();
    expect(component.message()).toContain('Não foi possível atualizar');
  });

  it('stops the watcher when PUT indicates the tracking is no longer active', async () => {
    await createComponent();
    activateSharing();
    trackingService.updateTracking.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));

    watchSuccess(atLeastTenMeters);

    expect(component.state()).toBe('ended');
    expect(geolocationService.clearWatch).toHaveBeenCalledWith(77);
    expect(component.message()).toContain('não está mais ativo');
  });

  it('ends sharing successfully and clears the watcher', async () => {
    await createComponent();
    activateSharing();

    component.endSharing();

    expect(trackingService.endTracking).toHaveBeenCalledWith('tracking-token');
    expect(component.state()).toBe('ended');
    expect(geolocationService.clearWatch).toHaveBeenCalledWith(77);
  });

  it('clears the watcher and finalizes local flow on DELETE 404', async () => {
    await createComponent();
    activateSharing();
    trackingService.endTracking.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));

    component.endSharing();

    expect(component.state()).toBe('ended');
    expect(component.message()).toContain('não foi encontrado');
    expect(geolocationService.clearWatch).toHaveBeenCalledWith(77);
  });

  it('does not present sharing as ended when DELETE fails for another reason', async () => {
    await createComponent();
    activateSharing();
    trackingService.endTracking.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));

    component.endSharing();

    expect(component.state()).toBe('active');
    expect(component.message()).toContain('Não foi possível encerrar');
    expect(geolocationService.clearWatch).not.toHaveBeenCalled();
  });

  it('prevents a second local active sharing flow', async () => {
    await createComponent();
    activateSharing();

    const secondFixture = TestBed.createComponent(LocationSharingComponent);
    const secondComponent = secondFixture.componentInstance;
    secondFixture.detectChanges();

    expect(secondComponent.state()).toBe('error');
    expect(secondComponent.message()).toContain('Já existe um compartilhamento ativo');
    expect(geolocationService.getCurrentPosition).toHaveBeenCalledTimes(1);

    secondFixture.destroy();
  });
});
