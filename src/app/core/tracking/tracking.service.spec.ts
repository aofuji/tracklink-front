import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../api/api.config';
import { TrackingService } from './tracking.service';

const API_BASE = 'http://api.test';

describe('TrackingService', () => {
  let service: TrackingService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: API_BASE },
      ],
    });

    service = TestBed.inject(TrackingService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('loads the authenticated user trackings', () => {
    const response = [
      {
        token: 'token-1',
        isActive: true,
        latitude: -23.5,
        longitude: -46.6,
        updatedAt: '2026-09-23T12:00:00Z',
        expiresAt: '2026-09-24T12:00:00Z',
      },
    ];
    let result: unknown;

    service.getMyTrackings().subscribe((trackings) => {
      result = trackings;
    });

    const request = http.expectOne(`${API_BASE}/api/tracking/my`);
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush(response);

    expect(result).toEqual(response);
  });

  it('loads public tracking without credentials', () => {
    const response = {
      token: 'public-token',
      isActive: true,
      latitude: -23.5,
      longitude: -46.6,
      updatedAt: '2026-09-23T12:00:00Z',
      expiresAt: '2026-09-24T12:00:00Z',
    };
    let result: unknown;

    service.getPublicTracking('abc/123').subscribe((tracking) => {
      result = tracking;
    });

    const request = http.expectOne(API_BASE + '/api/tracking/abc%2F123');
    expect(request.request.method).toBe('GET');
    expect(request.request.withCredentials).toBe(false);
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush(response);

    expect(result).toEqual(response);
  });

  it('loads public tracking history without credentials', () => {
    const response = [
      { latitude: 1, longitude: 2, recordedAt: '2026-09-23T12:00:00Z' },
    ];
    let result: unknown;

    service.getPublicTrackingHistory('abc/123').subscribe((history) => {
      result = history;
    });

    const request = http.expectOne(API_BASE + '/api/tracking/abc%2F123/history');
    expect(request.request.method).toBe('GET');
    expect(request.request.withCredentials).toBe(false);
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush(response);

    expect(result).toEqual(response);
  });

  it('creates a tracking with latitude and longitude only', () => {
    let token: string | undefined;

    service.createTracking({ latitude: 1, longitude: 2 }).subscribe((response) => {
      token = response.token;
    });

    const request = http.expectOne(`${API_BASE}/api/tracking`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ latitude: 1, longitude: 2 });
    expect(Object.keys(request.request.body)).toEqual(['latitude', 'longitude']);
    request.flush({ token: 'public-token' });

    expect(token).toBe('public-token');
  });

  it('updates a tracking with latitude and longitude only', () => {
    let completed = false;

    service.updateTracking('abc/123', { latitude: 3, longitude: 4 }).subscribe(() => {
      completed = true;
    });

    const request = http.expectOne(`${API_BASE}/api/tracking/abc%2F123`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ latitude: 3, longitude: 4 });
    expect(Object.keys(request.request.body)).toEqual(['latitude', 'longitude']);
    request.flush(null);

    expect(completed).toBe(true);
  });

  it('ends a tracking by token', () => {
    let completed = false;

    service.endTracking('abc/123').subscribe(() => {
      completed = true;
    });

    const request = http.expectOne(`${API_BASE}/api/tracking/abc%2F123`);
    expect(request.request.method).toBe('DELETE');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush(null);

    expect(completed).toBe(true);
  });
});
