import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { PublicTrackingMapService } from '../../core/map/public-tracking-map.service';
import { TrackingRealtimeService } from '../../core/tracking/tracking-realtime.service';
import { LocationUpdatedPayload, PublicTracking, TrackingHistoryLocation } from '../../core/tracking/tracking.models';
import { TrackingService } from '../../core/tracking/tracking.service';
import { PublicTrackingComponent } from './public-tracking.component';

const activeTracking: PublicTracking = {
  token: 'public-token',
  latitude: 1,
  longitude: 2,
  updatedAt: '2026-09-23T12:00:00Z',
  isActive: true,
  expiresAt: '2999-09-23T12:00:00Z',
};

const history: TrackingHistoryLocation[] = [
  { latitude: 0, longitude: 1, recordedAt: '2026-09-23T11:59:00Z' },
  { latitude: 1, longitude: 2, recordedAt: '2026-09-23T12:00:00Z' },
];

describe('PublicTrackingComponent', () => {
  let fixture: ComponentFixture<PublicTrackingComponent>;
  let component: PublicTrackingComponent;
  let locationUpdated$: Subject<LocationUpdatedPayload>;
  let trackingEnded$: Subject<void>;
  let connectionState$: Subject<'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'failed'>;
  let trackingService: {
    getPublicTracking: ReturnType<typeof vi.fn>;
    getPublicTrackingHistory: ReturnType<typeof vi.fn>;
  };
  let realtimeService: {
    locationUpdated$: Subject<LocationUpdatedPayload>;
    trackingEnded$: Subject<void>;
    connectionState$: Subject<'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'failed'>;
    connect: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
  };
  let mapService: {
    initialize: ReturnType<typeof vi.fn>;
    setCurrentPosition: ReturnType<typeof vi.fn>;
    addRoutePoint: ReturnType<typeof vi.fn>;
    destroy: ReturnType<typeof vi.fn>;
  };

  async function createComponent(token = 'public-token'): Promise<void> {
    locationUpdated$ = new Subject<LocationUpdatedPayload>();
    trackingEnded$ = new Subject<void>();
    connectionState$ = new Subject<'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'failed'>();
    trackingService = {
      getPublicTracking: vi.fn().mockReturnValue(of(activeTracking)),
      getPublicTrackingHistory: vi.fn().mockReturnValue(of(history)),
    };
    realtimeService = {
      locationUpdated$,
      trackingEnded$,
      connectionState$,
      connect: vi.fn().mockReturnValue(of(undefined)),
      stop: vi.fn(),
    };
    mapService = {
      initialize: vi.fn(),
      setCurrentPosition: vi.fn(),
      addRoutePoint: vi.fn(),
      destroy: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [PublicTrackingComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ token }) } } },
        { provide: TrackingService, useValue: trackingService },
        { provide: TrackingRealtimeService, useValue: realtimeService },
        { provide: PublicTrackingMapService, useValue: mapService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PublicTrackingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  afterEach(() => {
    fixture?.destroy();
    TestBed.resetTestingModule();
  });

  it('loads current tracking, then history, then initializes the map and SignalR', async () => {
    await createComponent();

    expect(trackingService.getPublicTracking).toHaveBeenCalledWith('public-token');
    expect(trackingService.getPublicTrackingHistory).toHaveBeenCalledWith('public-token');
    expect(mapService.initialize).toHaveBeenCalledWith(expect.any(HTMLElement), { latitude: 1, longitude: 2 }, history);
    expect(realtimeService.connect).toHaveBeenCalledWith('public-token');
    expect(component.state()).toBe('active');
  });

  it('does not load history or SignalR when token is missing', async () => {
    await createComponent('');

    expect(component.state()).toBe('invalid');
    expect(trackingService.getPublicTracking).not.toHaveBeenCalled();
    expect(trackingService.getPublicTrackingHistory).not.toHaveBeenCalled();
    expect(realtimeService.connect).not.toHaveBeenCalled();
  });

  it('handles definitive REST states without loading history', async () => {
    await createComponent();
    fixture.destroy();
    TestBed.resetTestingModule();

    await setupWithInitialError(409);

    expect(component.state()).toBe('inactive');
    expect(component.message()).toBe('Este tracking foi encerrado.');
    expect(trackingService.getPublicTrackingHistory).not.toHaveBeenCalled();
    expect(realtimeService.connect).not.toHaveBeenCalled();
  });

  it('handles 404 and 410 initial responses', async () => {
    await setupWithInitialError(404);
    expect(component.state()).toBe('not-found');
    expect(component.message()).toBe('Tracking não encontrado.');

    fixture.destroy();
    TestBed.resetTestingModule();

    await setupWithInitialError(410);
    expect(component.state()).toBe('expired');
    expect(component.message()).toBe('Este tracking expirou.');
  });

  it('handles temporary REST failures separately from definitive states', async () => {
    await setupWithInitialError(500);

    expect(component.state()).toBe('error');
    expect(component.message()).toBe('Não foi possível carregar o tracking.');
    expect(trackingService.getPublicTrackingHistory).not.toHaveBeenCalled();
    expect(realtimeService.connect).not.toHaveBeenCalled();
  });

  it('keeps current map visible when history fails temporarily', async () => {
    await createComponent();
    fixture.destroy();
    TestBed.resetTestingModule();

    await setupWithHistoryFailure();

    expect(component.state()).toBe('active');
    expect(component.historyErrorMessage()).toBe('Não foi possível carregar o histórico.');
    expect(mapService.initialize).toHaveBeenCalledWith(expect.any(HTMLElement), { latitude: 1, longitude: 2 }, []);
    expect(realtimeService.connect).toHaveBeenCalledWith('public-token');
  });

  it('applies valid LocationUpdated payloads to marker and polyline', async () => {
    await createComponent();
    const update = { ...activeTracking, latitude: 3, longitude: 4, updatedAt: '2026-09-23T12:01:00Z' };

    locationUpdated$.next(update);

    expect(component.tracking()).toEqual(update);
    expect(mapService.setCurrentPosition).toHaveBeenCalledWith({ latitude: 3, longitude: 4 });
    expect(mapService.addRoutePoint).toHaveBeenCalledWith({ latitude: 3, longitude: 4 });
  });

  it('ignores LocationUpdated with a different token', async () => {
    await createComponent();

    locationUpdated$.next({ ...activeTracking, token: 'other-token', latitude: 9, longitude: 9 });

    expect(component.tracking()).toEqual(activeTracking);
    expect(mapService.setCurrentPosition).not.toHaveBeenCalled();
    expect(mapService.addRoutePoint).not.toHaveBeenCalled();
  });

  it('preserves the last map state and stops SignalR after TrackingEnded', async () => {
    await createComponent();

    trackingEnded$.next();

    expect(component.state()).toBe('ended');
    expect(component.message()).toBe('Este tracking foi encerrado.');
    expect(realtimeService.stop).toHaveBeenCalled();
    expect(mapService.destroy).not.toHaveBeenCalled();
  });

  it('shows realtime failure and reconnection messages', async () => {
    await createComponent();

    connectionState$.next('reconnecting');
    expect(component.realtimeMessage()).toBe('Reconectando atualizações em tempo real...');

    connectionState$.next('failed');
    expect(component.realtimeMessage()).toBe('Atualizações em tempo real indisponíveis.');
  });

  it('cleans up SignalR and map on destroy', async () => {
    await createComponent();

    fixture.destroy();

    expect(realtimeService.stop).toHaveBeenCalled();
    expect(mapService.destroy).toHaveBeenCalled();
  });

  async function setupWithInitialError(status: number): Promise<void> {
    locationUpdated$ = new Subject<LocationUpdatedPayload>();
    trackingEnded$ = new Subject<void>();
    connectionState$ = new Subject<'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'failed'>();
    trackingService = {
      getPublicTracking: vi.fn().mockReturnValue(throwError(() => new HttpErrorResponse({ status }))),
      getPublicTrackingHistory: vi.fn().mockReturnValue(of(history)),
    };
    realtimeService = {
      locationUpdated$,
      trackingEnded$,
      connectionState$,
      connect: vi.fn().mockReturnValue(of(undefined)),
      stop: vi.fn(),
    };
    mapService = {
      initialize: vi.fn(),
      setCurrentPosition: vi.fn(),
      addRoutePoint: vi.fn(),
      destroy: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [PublicTrackingComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ token: 'public-token' }) } } },
        { provide: TrackingService, useValue: trackingService },
        { provide: TrackingRealtimeService, useValue: realtimeService },
        { provide: PublicTrackingMapService, useValue: mapService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PublicTrackingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  async function setupWithHistoryFailure(): Promise<void> {
    locationUpdated$ = new Subject<LocationUpdatedPayload>();
    trackingEnded$ = new Subject<void>();
    connectionState$ = new Subject<'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'failed'>();
    trackingService = {
      getPublicTracking: vi.fn().mockReturnValue(of(activeTracking)),
      getPublicTrackingHistory: vi.fn().mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 }))),
    };
    realtimeService = {
      locationUpdated$,
      trackingEnded$,
      connectionState$,
      connect: vi.fn().mockReturnValue(of(undefined)),
      stop: vi.fn(),
    };
    mapService = {
      initialize: vi.fn(),
      setCurrentPosition: vi.fn(),
      addRoutePoint: vi.fn(),
      destroy: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [PublicTrackingComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ token: 'public-token' }) } } },
        { provide: TrackingService, useValue: trackingService },
        { provide: TrackingRealtimeService, useValue: realtimeService },
        { provide: PublicTrackingMapService, useValue: mapService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PublicTrackingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }
});
