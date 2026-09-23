import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../api/api.config';
import { AuthService } from './auth.service';

const API_BASE = 'http://api.test';

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: API_BASE },
      ],
    });

    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('logs in with credentials, stores access token in memory, and loads the current user', () => {
    let completed = false;

    service.login({ email: 'ana@example.com', password: 'secret' }).subscribe(() => {
      completed = true;
    });

    const login = http.expectOne(`${API_BASE}/api/auth/login`);
    expect(login.request.method).toBe('POST');
    expect(login.request.withCredentials).toBe(true);
    expect(login.request.body).toEqual({ email: 'ana@example.com', password: 'secret' });
    login.flush({ accessToken: 'access-token' });

    const me = http.expectOne(`${API_BASE}/api/auth/me`);
    expect(me.request.method).toBe('GET');
    me.flush({ id: '1', email: 'ana@example.com' });

    expect(completed).toBe(true);
    expect(service.accessToken()).toBe('access-token');
    expect(service.status()).toBe('authenticated');
    expect(service.user()).toEqual({ id: '1', email: 'ana@example.com' });
  });

  it('keeps the user anonymous when login fails', () => {
    service.login({ email: 'bad@example.com', password: 'wrong' }).subscribe({ error: () => undefined });

    http.expectOne(`${API_BASE}/api/auth/login`).flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(service.accessToken()).toBeNull();
    expect(service.status()).toBe('anonymous');
  });

  it('registers a new user', () => {
    let completed = false;

    service.register({ name: 'Ana', email: 'ana@example.com', password: 'secret1' }).subscribe(() => {
      completed = true;
    });

    const request = http.expectOne(`${API_BASE}/api/auth/register`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ name: 'Ana', email: 'ana@example.com', password: 'secret1' });
    request.flush(null);

    expect(completed).toBe(true);
  });

  it('refreshes the session using the HttpOnly cookie and updates the in-memory token', () => {
    let token: string | undefined;

    service.refreshSession().subscribe((value) => {
      token = value;
    });

    const request = http.expectOne(`${API_BASE}/api/auth/refresh`);
    expect(request.request.method).toBe('POST');
    expect(request.request.withCredentials).toBe(true);
    expect(request.request.body).toEqual({});
    request.flush({ accessToken: 'fresh-token' });

    expect(token).toBe('fresh-token');
    expect(service.accessToken()).toBe('fresh-token');
    expect(service.status()).toBe('authenticated');
  });

  it('shares a single refresh request across concurrent callers', () => {
    const tokens: string[] = [];

    service.refreshSession().subscribe((token) => tokens.push(token));
    service.refreshSession().subscribe((token) => tokens.push(token));

    const request = http.expectOne(`${API_BASE}/api/auth/refresh`);
    request.flush({ accessToken: 'shared-token' });

    expect(tokens).toEqual(['shared-token', 'shared-token']);
    expect(service.accessToken()).toBe('shared-token');
  });

  it('restores the session after reload with refresh and current user requests', () => {
    let restored: boolean | undefined;

    service.restoreSession().subscribe((value) => {
      restored = value;
    });

    http.expectOne(`${API_BASE}/api/auth/refresh`).flush({ accessToken: 'restored-token' });
    http.expectOne(`${API_BASE}/api/auth/me`).flush({ id: '2', email: 'bia@example.com' });

    expect(restored).toBe(true);
    expect(service.accessToken()).toBe('restored-token');
    expect(service.status()).toBe('authenticated');
  });

  it('marks the user as anonymous when session restoration fails', () => {
    let restored: boolean | undefined;

    service.restoreSession().subscribe((value) => {
      restored = value;
    });

    http.expectOne(`${API_BASE}/api/auth/refresh`).flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(restored).toBe(false);
    expect(service.accessToken()).toBeNull();
    expect(service.status()).toBe('anonymous');
  });

  it('logs out using the refresh cookie and clears the local session', () => {
    service.setAccessToken('access-token');
    service.logout().subscribe();

    const request = http.expectOne(`${API_BASE}/api/auth/logout`);
    expect(request.request.method).toBe('POST');
    expect(request.request.withCredentials).toBe(true);
    request.flush(null);

    expect(service.accessToken()).toBeNull();
    expect(service.status()).toBe('anonymous');
  });
});
