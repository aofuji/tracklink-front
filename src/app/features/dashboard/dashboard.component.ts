import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-dashboard',
  styleUrl: './dashboard.component.scss',
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly user = this.authService.user;
  readonly isLoggingOut = signal(false);
  readonly errorMessage = signal<string | null>(null);

  logout(): void {
    if (this.isLoggingOut()) {
      return;
    }

    this.errorMessage.set(null);
    this.isLoggingOut.set(true);
    this.authService.logout().pipe(
      finalize(() => this.isLoggingOut.set(false)),
    ).subscribe({
      next: () => {
        void this.router.navigate(['/login']);
      },
      error: () => {
        this.errorMessage.set('Não foi possível encerrar a sessão agora.');
        void this.router.navigate(['/login']);
      },
    });
  }
}
