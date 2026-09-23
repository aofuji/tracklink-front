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
