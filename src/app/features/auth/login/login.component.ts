import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { isInternalReturnUrl } from '../../../core/auth/auth.utils';

@Component({
  imports: [ReactiveFormsModule, RouterLink],
  selector: 'app-login',
  styleUrl: './login.component.scss',
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);

  readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly canSubmit = computed(() => this.form.valid && !this.isSubmitting());

  submit(): void {
    this.errorMessage.set(null);

    if (this.form.invalid || this.isSubmitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.authService.login(this.form.getRawValue()).pipe(
      finalize(() => this.isSubmitting.set(false)),
    ).subscribe({
      next: () => {
        void this.router.navigateByUrl(this.getSafeReturnUrl());
      },
      error: () => {
        this.errorMessage.set('Não foi possível entrar. Verifique suas credenciais e tente novamente.');
      },
    });
  }

  private getSafeReturnUrl(): string {
    const candidate = this.router.parseUrl(this.router.url).queryParams['returnUrl'];
    return isInternalReturnUrl(candidate) ? candidate : '/dashboard';
  }
}
