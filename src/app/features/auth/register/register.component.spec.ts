import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { RegisterComponent } from './register.component';

describe('RegisterComponent', () => {
  let fixture: ComponentFixture<RegisterComponent>;
  let component: RegisterComponent;
  let authService: { register: ReturnType<typeof vi.fn> };
  let router: Router;

  beforeEach(async () => {
    authService = { register: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  it('submits registration data and sends the user to login', () => {
    authService.register.mockReturnValue(of(undefined));
    component.form.setValue({ name: 'Ana', email: 'ana@example.com', password: 'secret12' });

    component.submit();

    expect(authService.register).toHaveBeenCalledWith({ name: 'Ana', email: 'ana@example.com', password: 'secret12' });
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
    expect(component.isSubmitting()).toBe(false);
  });

  it('does not submit invalid forms', () => {
    component.submit();

    expect(authService.register).not.toHaveBeenCalled();
    expect(component.form.controls.email.touched).toBe(true);
  });


  it('requires at least 8 password characters', () => {
    const password = component.form.controls.password;

    password.setValue('1234567');
    password.markAsTouched();
    fixture.detectChanges();

    expect(password.invalid).toBe(true);
    expect(password.errors?.['minlength']).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Informe uma senha com pelo menos 8 caracteres.');

    password.setValue('12345678');

    expect(password.valid).toBe(true);
  });

  it('shows a specific message when the email is already registered', () => {
    authService.register.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    component.form.setValue({ name: 'Ana', email: 'ana@example.com', password: 'secret12' });

    component.submit();

    expect(component.errorMessage()).toBe('Este email já está cadastrado.');
  });

  it('shows a safe generic error message for other registration failures', () => {
    authService.register.mockReturnValue(throwError(() => new Error('stack trace')));
    component.form.setValue({ name: 'Ana', email: 'ana@example.com', password: 'secret12' });

    component.submit();

    expect(component.errorMessage()).toBe('Não foi possível criar a conta. Verifique os dados e tente novamente.');
    expect(component.errorMessage()).not.toContain('stack');
  });
});
