import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let component: LoginComponent;
  let authService: { login: ReturnType<typeof vi.fn> };
  let router: Router;

  beforeEach(async () => {
    authService = { login: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
  });

  it('does not show session expired message on normal login access', () => {
    expect(component.errorMessage()).toBeNull();
  });

  it('shows a session expired message from controlled navigation query', () => {
    vi.spyOn(router, 'url', 'get').mockReturnValue('/login?sessionExpired=1&returnUrl=%2Fdashboard');
    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;

    expect(component.errorMessage()).toBe('Sua sessão expirou. Entre novamente.');
  });

  it('submits credentials and redirects to dashboard by default', () => {
    authService.login.mockReturnValue(of(null));
    component.form.setValue({ email: 'ana@example.com', password: 'secret' });

    component.submit();

    expect(authService.login).toHaveBeenCalledWith({ email: 'ana@example.com', password: 'secret' });
    expect(router.navigateByUrl).toHaveBeenCalledWith('/dashboard');
    expect(component.isSubmitting()).toBe(false);
  });

  it('uses a safe internal returnUrl after login, including after session expiration', async () => {
    vi.spyOn(router, 'url', 'get').mockReturnValue('/login?sessionExpired=1&returnUrl=%2Fdashboard');
    authService.login.mockReturnValue(of(null));
    component.form.setValue({ email: 'ana@example.com', password: 'secret' });

    component.submit();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/dashboard');
  });

  it('does not submit invalid forms', () => {
    component.submit();

    expect(authService.login).not.toHaveBeenCalled();
    expect(component.form.controls.email.touched).toBe(true);
  });

  it('shows a safe error message when login fails', () => {
    authService.login.mockReturnValue(throwError(() => new Error('internal token detail')));
    component.form.setValue({ email: 'ana@example.com', password: 'wrong' });

    component.submit();

    expect(component.errorMessage()).toBe('Não foi possível entrar. Verifique suas credenciais e tente novamente.');
    expect(component.errorMessage()).not.toContain('token');
  });
});
