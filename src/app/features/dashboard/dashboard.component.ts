import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, finalize, of, switchMap, throwError } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { TrackingDerivedStatus, TrackingSummary } from '../../core/tracking/tracking.models';
import { TrackingService } from '../../core/tracking/tracking.service';

type DashboardState = 'loading' | 'loaded' | 'error';

@Component({
  imports: [DatePipe],
  selector: 'app-dashboard',
  styleUrl: './dashboard.component.scss',
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly trackingService = inject(TrackingService);
  private readonly router = inject(Router);

  readonly user = this.authService.user;
  readonly state = signal<DashboardState>('loading');
  readonly trackings = signal<TrackingSummary[]>([]);
  readonly loadErrorMessage = signal<string | null>(null);
  readonly actionMessage = signal<string | null>(null);
  readonly isLoggingOut = signal(false);
  readonly endingTokens = signal<ReadonlySet<string>>(new Set<string>());

  ngOnInit(): void {
    this.loadTrackings();
  }

  loadTrackings(): void {
    this.state.set('loading');
    this.loadErrorMessage.set(null);

    this.trackingService.getMyTrackings().subscribe({
      next: (trackings) => {
        this.trackings.set(trackings);
        this.state.set('loaded');
      },
      error: () => {
        this.trackings.set([]);
        this.state.set('error');
        this.loadErrorMessage.set('Não foi possível carregar seus trackings.');
      },
    });
  }

  newSharing(): void {
    void this.router.navigate(['/tracking/new']);
  }

  openTracking(tracking: TrackingSummary): void {
    if (!tracking.token) {
      return;
    }

    void this.router.navigate(['/tracking', tracking.token]);
  }

  endTracking(tracking: TrackingSummary): void {
    if (!tracking.token || this.derivedStatus(tracking) !== 'active' || this.isEnding(tracking.token)) {
      return;
    }

    this.actionMessage.set(null);
    this.addEndingToken(tracking.token);

    this.trackingService.endTracking(tracking.token).pipe(
      switchMap(() => this.trackingService.getMyTrackings()),
      catchError((error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 404) {
          this.actionMessage.set('O tracking selecionado não foi encontrado. A lista foi atualizada.');
          return this.trackingService.getMyTrackings();
        }

        this.actionMessage.set('Não foi possível encerrar o tracking. Tente novamente.');
        return throwError(() => error);
      }),
      finalize(() => this.removeEndingToken(tracking.token)),
    ).subscribe({
      next: (trackings) => {
        this.trackings.set(trackings);
        this.state.set('loaded');
      },
      error: () => undefined,
    });
  }

  logout(): void {
    if (this.isLoggingOut()) {
      return;
    }

    this.actionMessage.set(null);
    this.isLoggingOut.set(true);
    this.authService.logout().pipe(
      finalize(() => this.isLoggingOut.set(false)),
    ).subscribe({
      next: () => {
        void this.router.navigate(['/login']);
      },
      error: () => {
        this.actionMessage.set('Não foi possível encerrar a sessão agora.');
        void this.router.navigate(['/login']);
      },
    });
  }

  derivedStatus(tracking: TrackingSummary, now = new Date()): TrackingDerivedStatus {
    if (!tracking.isActive) {
      return 'inactive';
    }

    if (new Date(tracking.expiresAt).getTime() <= now.getTime()) {
      return 'expired';
    }

    return 'active';
  }

  statusLabel(status: TrackingDerivedStatus): string {
    const labels: Record<TrackingDerivedStatus, string> = {
      active: 'Ativo',
      inactive: 'Inativo',
      expired: 'Expirado',
    };

    return labels[status];
  }

  shortToken(token: string): string {
    if (token.length <= 12) {
      return token;
    }

    return `${token.slice(0, 6)}...${token.slice(-4)}`;
  }

  isEnding(token: string): boolean {
    return this.endingTokens().has(token);
  }

  trackByToken(_index: number, tracking: TrackingSummary): string {
    return tracking.token;
  }

  private addEndingToken(token: string): void {
    const next = new Set(this.endingTokens());
    next.add(token);
    this.endingTokens.set(next);
  }

  private removeEndingToken(token: string): void {
    const next = new Set(this.endingTokens());
    next.delete(token);
    this.endingTokens.set(next);
  }
}
