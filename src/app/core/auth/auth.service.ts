import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, finalize, map, Observable, of, shareReplay, switchMap, tap, throwError } from 'rxjs';
import { API_BASE_URL } from '../api/api.config';
import { AuthenticatedUser, AuthResponse, AuthStatus, LoginRequest, RegisterRequest } from './auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly statusSignal = signal<AuthStatus>('checking');
  private readonly accessTokenSignal = signal<string | null>(null);
  private readonly userSignal = signal<AuthenticatedUser | null>(null);
  private refreshRequest$: Observable<string> | null = null;

  readonly status = this.statusSignal.asReadonly();
  readonly accessToken = this.accessTokenSignal.asReadonly();
  readonly user = this.userSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.statusSignal() === 'authenticated');
  readonly isChecking = computed(() => this.statusSignal() === 'checking');

  register(request: RegisterRequest): Observable<void> {
    return this.http.post<void>(this.url('/api/auth/register'), request);
  }

  login(request: LoginRequest): Observable<AuthenticatedUser | null> {
    this.statusSignal.set('checking');

    return this.http
      .post<AuthResponse>(this.url('/api/auth/login'), request, { withCredentials: true })
      .pipe(
        tap((response) => this.setAccessToken(response.accessToken)),
        switchMap(() => this.loadCurrentUser().pipe(catchError(() => of(null)))),
        tap(() => this.statusSignal.set('authenticated')),
        catchError((error: unknown) => {
          this.clearSession();
          return throwError(() => error);
        }),
      );
  }

  refreshSession(): Observable<string> {
    if (this.refreshRequest$) {
      return this.refreshRequest$;
    }

    this.refreshRequest$ = this.http
      .post<AuthResponse>(this.url('/api/auth/refresh'), {}, { withCredentials: true })
      .pipe(
        map((response) => response.accessToken),
        tap((accessToken) => {
          this.setAccessToken(accessToken);
          this.statusSignal.set('authenticated');
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
        finalize(() => {
          this.refreshRequest$ = null;
        }),
      );

    return this.refreshRequest$;
  }

  restoreSession(): Observable<boolean> {
    this.statusSignal.set('checking');

    return this.refreshSession().pipe(
      switchMap(() => this.loadCurrentUser().pipe(catchError(() => of(null)))),
      map(() => true),
      catchError(() => {
        this.clearSession();
        return of(false);
      }),
    );
  }

  loadCurrentUser(): Observable<AuthenticatedUser> {
    return this.http.get<AuthenticatedUser>(this.url('/api/auth/me')).pipe(
      tap((user) => this.userSignal.set(user)),
    );
  }

  logout(): Observable<void> {
    return this.http.post<void>(this.url('/api/auth/logout'), {}, { withCredentials: true }).pipe(
      finalize(() => this.clearSession()),
    );
  }

  setAccessToken(accessToken: string): void {
    this.accessTokenSignal.set(accessToken);
  }

  endSession(): void {
    this.clearSession();
  }

  private clearSession(): void {
    this.accessTokenSignal.set(null);
    this.userSignal.set(null);
    this.statusSignal.set('anonymous');
  }

  private url(path: string): string {
    return `${this.apiBaseUrl}${path}`;
  }
}
