import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, RouterStateSnapshot } from '@angular/router';
import { AuthStatus } from './auth.models';
import { AuthService } from './auth.service';
import { anonymousGuard, authGuard } from './auth.guard';

class FakeAuthService {
  private readonly statusSignal = signal<AuthStatus>('anonymous');
  readonly status = this.statusSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.statusSignal() === 'authenticated');
  readonly isChecking = computed(() => this.statusSignal() === 'checking');

  setStatus(status: AuthStatus): void {
    this.statusSignal.set(status);
  }
}

describe('auth guards', () => {
  let authService: FakeAuthService;
  let router: Router;

  beforeEach(() => {
    authService = new FakeAuthService();

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authService },
      ],
    });

    router = TestBed.inject(Router);
  });

  it('allows authenticated users to access protected routes', () => {
    authService.setStatus('authenticated');

    const result = TestBed.runInInjectionContext(() => authGuard({} as never, { url: '/dashboard' } as RouterStateSnapshot));

    expect(result).toBe(true);
  });

  it('redirects anonymous users to login with an internal returnUrl', () => {
    authService.setStatus('anonymous');

    const result = TestBed.runInInjectionContext(() => authGuard({} as never, { url: '/dashboard' } as RouterStateSnapshot));

    expect(router.serializeUrl(result as ReturnType<typeof router.createUrlTree>)).toBe('/login?returnUrl=%2Fdashboard');
  });

  it('does not preserve external-looking return urls', () => {
    authService.setStatus('anonymous');

    const result = TestBed.runInInjectionContext(() => authGuard({} as never, { url: '//evil.example' } as RouterStateSnapshot));

    expect(router.serializeUrl(result as ReturnType<typeof router.createUrlTree>)).toBe('/login');
  });

  it('redirects authenticated users away from anonymous auth routes', () => {
    authService.setStatus('authenticated');

    const result = TestBed.runInInjectionContext(() => anonymousGuard({} as never, {} as RouterStateSnapshot));

    expect(router.serializeUrl(result as ReturnType<typeof router.createUrlTree>)).toBe('/dashboard');
  });

  it('allows anonymous users to access login and register routes', () => {
    authService.setStatus('anonymous');

    const result = TestBed.runInInjectionContext(() => anonymousGuard({} as never, {} as RouterStateSnapshot));

    expect(result).toBe(true);
  });
});
