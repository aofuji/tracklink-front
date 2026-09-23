import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../api/api.config';
import { TrackingRealtimeService } from './tracking-realtime.service';
import { LocationUpdatedPayload } from './tracking.models';

const API_BASE = 'http://api.test';

describe('TrackingRealtimeService', () => {
  let service: TrackingRealtimeService;
  let handlers: Record<string, (...args: unknown[]) => void>;
  let reconnectingHandler: (() => void) | undefined;
  let reconnectedHandler: (() => void) | undefined;
  let closeHandler: (() => void) | undefined;
  let connection: {
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
    invoke: ReturnType<typeof vi.fn>;
    on: ReturnType<typeof vi.fn>;
    onreconnecting: ReturnType<typeof vi.fn>;
    onreconnected: ReturnType<typeof vi.fn>;
    onclose: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    handlers = {};
    reconnectingHandler = undefined;
    reconnectedHandler = undefined;
    closeHandler = undefined;
    connection = {
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue(undefined),
      invoke: vi.fn().mockResolvedValue(undefined),
      on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
        handlers[event] = handler;
      }),
      onreconnecting: vi.fn((handler: () => void) => {
        reconnectingHandler = handler;
      }),
      onreconnected: vi.fn((handler: () => void) => {
        reconnectedHandler = handler;
      }),
      onclose: vi.fn((handler: () => void) => {
        closeHandler = handler;
      }),
    };

    TestBed.configureTestingModule({
      providers: [
        TrackingRealtimeService,
        { provide: API_BASE_URL, useValue: API_BASE },
      ],
    });

    service = TestBed.inject(TrackingRealtimeService);
    service.setConnectionFactoryForTesting((url) => {
      expect(url).toBe(API_BASE + '/hubs/tracking');
      return connection as never;
    });
  });

  it('starts the connection and joins the tracking group', async () => {
    await firstValueFrom(service.connect('public-token'));

    expect(connection.start).toHaveBeenCalledOnce();
    expect(connection.invoke).toHaveBeenCalledWith('JoinTracking', 'public-token');
  });

  it('joins the tracking group again after reconnecting', async () => {
    await firstValueFrom(service.connect('public-token'));
    connection.invoke.mockClear();

    reconnectedHandler?.();
    await Promise.resolve();

    expect(connection.invoke).toHaveBeenCalledWith('JoinTracking', 'public-token');
  });

  it('emits LocationUpdated and TrackingEnded events', async () => {
    const updates: LocationUpdatedPayload[] = [];
    let ended = false;
    service.locationUpdated$.subscribe((payload) => updates.push(payload));
    service.trackingEnded$.subscribe(() => {
      ended = true;
    });
    await firstValueFrom(service.connect('public-token'));

    handlers['LocationUpdated']?.({ token: 'public-token', latitude: 1, longitude: 2, updatedAt: 'now', isActive: true, expiresAt: 'later' });
    handlers['TrackingEnded']?.();

    expect(updates).toEqual([{ token: 'public-token', latitude: 1, longitude: 2, updatedAt: 'now', isActive: true, expiresAt: 'later' }]);
    expect(ended).toBe(true);
  });

  it('reports reconnecting state and stops the connection during cleanup', async () => {
    const states: string[] = [];
    service.connectionState$.subscribe((state) => states.push(state));
    await firstValueFrom(service.connect('public-token'));

    reconnectingHandler?.();
    service.stop();
    closeHandler?.();

    expect(states).toContain('reconnecting');
    expect(connection.stop).toHaveBeenCalledOnce();
  });
});
