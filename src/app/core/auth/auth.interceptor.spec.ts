import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { API_BASE_URL } from '../api/api.config';
import { AuthService } from './auth.service';
import { authInterceptor } from './auth.interceptor';

const API_BASE = 'http://api.test';

describe('authInterceptor', () => {
  let httpClient: HttpClient;
  let http: HttpTestingController;
  let authService: AuthService;
  let router: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    router = { navigate: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: API_BASE },
        { provide: Router, useValue: router },
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
  });

  afterEach(() => {
    http.verify();
  });

  it('adds the bearer token to protected API requests', () => {
    authService.setAccessToken('access-token');

    httpClient.get(`${API_BASE}/api/tracking/my`).subscribe();

    const request = http.expectOne(`${API_BASE}/api/tracking/my`);
    expect(request.request.headers.get('Authorization')).toBe('Bearer access-token');
    request.flush([]);
  });

  it('refreshes after a 401 and retries the original request once', () => {
    authService.setAccessToken('old-token');
    let response: unknown;

    httpClient.get(`${API_BASE}/api/tracking/my`).subscribe((value) => {
      response = value;
    });

    const first = http.expectOne(`${API_BASE}/api/tracking/my`);
    expect(first.request.headers.get('Authorization')).toBe('Bearer old-token');
    first.flush({}, { status: 401, statusText: 'Unauthorized' });

    const refresh = http.expectOne(`${API_BASE}/api/auth/refresh`);
    expect(refresh.request.withCredentials).toBe(true);
    expect(refresh.request.headers.has('Authorization')).toBe(false);
    refresh.flush({ accessToken: 'new-token' });

    const retry = http.expectOne(`${API_BASE}/api/tracking/my`);
    expect(retry.request.headers.get('Authorization')).toBe('Bearer new-token');
    expect(retry.request.headers.get('X-Auth-Retry')).toBe('true');
    retry.flush([{ token: 'abc' }]);

    expect(response).toEqual([{ token: 'abc' }]);
    expect(authService.accessToken()).toBe('new-token');
  });

  it('shares one refresh request across concurrent 401 responses', () => {
    authService.setAccessToken('old-token');
    const responses: unknown[] = [];

    httpClient.get(`${API_BASE}/api/one`).subscribe((value) => responses.push(value));
    httpClient.get(`${API_BASE}/api/two`).subscribe((value) => responses.push(value));

    http.expectOne(`${API_BASE}/api/one`).flush({}, { status: 401, statusText: 'Unauthorized' });
    http.expectOne(`${API_BASE}/api/two`).flush({}, { status: 401, statusText: 'Unauthorized' });

    const refresh = http.expectOne(`${API_BASE}/api/auth/refresh`);
    refresh.flush({ accessToken: 'shared-token' });

    http.expectOne(`${API_BASE}/api/one`).flush({ ok: 1 });
    http.expectOne(`${API_BASE}/api/two`).flush({ ok: 2 });

    expect(responses).toEqual([{ ok: 1 }, { ok: 2 }]);
  });

  it('does not refresh auth mutation endpoints to avoid loops', () => {
    let failed = false;

    httpClient.post(`${API_BASE}/api/auth/refresh`, {}).subscribe({
      error: () => {
        failed = true;
      },
    });

    http.expectOne(`${API_BASE}/api/auth/refresh`).flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(failed).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('ends the session when refresh fails', () => {
    authService.setAccessToken('old-token');
    let failed = false;

    httpClient.get(`${API_BASE}/api/protected`).subscribe({
      error: () => {
        failed = true;
      },
    });

    http.expectOne(`${API_BASE}/api/protected`).flush({}, { status: 401, statusText: 'Unauthorized' });
    http.expectOne(`${API_BASE}/api/auth/refresh`).flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(failed).toBe(true);
    expect(authService.accessToken()).toBeNull();
    expect(authService.status()).toBe('anonymous');
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });
});
