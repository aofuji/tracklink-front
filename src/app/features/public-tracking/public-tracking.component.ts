import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { AfterViewInit, Component, DestroyRef, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { catchError, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Coordinates } from '../../core/geolocation/geolocation.models';
import { PublicTrackingMapService } from '../../core/map/public-tracking-map.service';
import { TrackingRealtimeService } from '../../core/tracking/tracking-realtime.service';
import { LocationUpdatedPayload, PublicTracking, TrackingHistoryLocation } from '../../core/tracking/tracking.models';
import { TrackingService } from '../../core/tracking/tracking.service';

type PublicTrackingState = 'loading' | 'active' | 'not-found' | 'inactive' | 'expired' | 'ended' | 'error' | 'invalid';
type RealtimeState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'failed' | 'disconnected';

@Component({
  imports: [DatePipe],
  selector: 'app-public-tracking',
  styleUrl: './public-tracking.component.scss',
  templateUrl: './public-tracking.component.html',
})
export class PublicTrackingComponent implements AfterViewInit {
  private readonly route = inject(ActivatedRoute);
  private readonly trackingService = inject(TrackingService);
  private readonly realtimeService = inject(TrackingRealtimeService);
  private readonly mapService = inject(PublicTrackingMapService);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('mapContainer') private mapContainer?: ElementRef<HTMLElement>;

  readonly state = signal<PublicTrackingState>('loading');
  readonly realtimeState = signal<RealtimeState>('idle');
  readonly message = signal('Carregando tracking...');
  readonly realtimeMessage = signal<string | null>(null);
  readonly historyErrorMessage = signal<string | null>(null);
  readonly tracking = signal<PublicTracking | null>(null);
  readonly history = signal<TrackingHistoryLocation[]>([]);
  readonly currentPosition = signal<Coordinates | null>(null);

  ngAfterViewInit(): void {
    this.load();
  }

  private load(): void {
    const token = this.route.snapshot.paramMap.get('token')?.trim();

    if (!token) {
      this.state.set('invalid');
      this.message.set('Tracking não encontrado.');
      return;
    }

    this.state.set('loading');
    this.message.set('Carregando tracking...');

    this.trackingService.getPublicTracking(token).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (tracking) => this.handleInitialTracking(token, tracking),
      error: (error: unknown) => this.handleInitialError(error),
    });
  }

  private handleInitialTracking(token: string, tracking: PublicTracking): void {
    const state = this.deriveState(tracking);

    if (state !== 'active') {
      this.tracking.set(tracking);
      this.currentPosition.set(this.toPosition(tracking));
      this.state.set(state);
      this.message.set(state === 'inactive' ? 'Este tracking foi encerrado.' : 'Este tracking expirou.');
      return;
    }

    this.tracking.set(tracking);
    this.currentPosition.set(this.toPosition(tracking));
    this.state.set('active');
    this.message.set('Tracking ativo.');

    this.trackingService.getPublicTrackingHistory(token).pipe(
      catchError(() => {
        this.historyErrorMessage.set('Não foi possível carregar o histórico.');
        return of([] as TrackingHistoryLocation[]);
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((history) => {
      this.history.set(history);
      this.initializeMap(tracking, history);
      this.connectRealtime(token);
    });
  }

  private handleInitialError(error: unknown): void {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 404) {
        this.state.set('not-found');
        this.message.set('Tracking não encontrado.');
        return;
      }

      if (error.status === 409) {
        this.state.set('inactive');
        this.message.set('Este tracking foi encerrado.');
        return;
      }

      if (error.status === 410) {
        this.state.set('expired');
        this.message.set('Este tracking expirou.');
        return;
      }
    }

    this.state.set('error');
    this.message.set('Não foi possível carregar o tracking.');
  }

  private initializeMap(tracking: PublicTracking, history: TrackingHistoryLocation[]): void {
    const container = this.mapContainer?.nativeElement;
    if (!container) {
      return;
    }

    this.mapService.initialize(container, this.toPosition(tracking), history);
  }

  private connectRealtime(token: string): void {
    this.realtimeService.locationUpdated$.pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((payload) => this.handleLocationUpdated(token, payload));

    this.realtimeService.trackingEnded$.pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => this.handleTrackingEnded());

    this.realtimeService.connectionState$.pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((state) => this.handleRealtimeState(state));

    this.realtimeService.connect(token).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      error: () => {
        this.realtimeState.set('failed');
        this.realtimeMessage.set('Atualizações em tempo real indisponíveis.');
      },
    });
  }

  private handleLocationUpdated(token: string, payload: LocationUpdatedPayload): void {
    if (!this.isValidLocationUpdatedPayload(payload) || payload.token !== token) {
      return;
    }

    this.tracking.set(payload);
    this.currentPosition.set(this.toPosition(payload));
    this.state.set(this.deriveState(payload));

    if (this.state() === 'active') {
      this.message.set('Tracking ativo.');
      this.mapService.setCurrentPosition(this.toPosition(payload));
      this.mapService.addRoutePoint(this.toPosition(payload));
      return;
    }

    this.message.set(this.state() === 'inactive' ? 'Este tracking foi encerrado.' : 'Este tracking expirou.');
    this.realtimeService.stop();
  }

  private handleTrackingEnded(): void {
    this.state.set('ended');
    this.message.set('Este tracking foi encerrado.');
    this.realtimeService.stop();
  }

  private handleRealtimeState(state: RealtimeState): void {
    this.realtimeState.set(state);

    if (state === 'connecting') {
      this.realtimeMessage.set('Conectando atualizações em tempo real...');
      return;
    }

    if (state === 'connected') {
      this.realtimeMessage.set(null);
      return;
    }

    if (state === 'reconnecting') {
      this.realtimeMessage.set('Reconectando atualizações em tempo real...');
      return;
    }

    if (state === 'failed') {
      this.realtimeMessage.set('Atualizações em tempo real indisponíveis.');
    }
  }

  private deriveState(tracking: PublicTracking): PublicTrackingState {
    if (!tracking.isActive) {
      return 'inactive';
    }

    if (new Date(tracking.expiresAt).getTime() <= Date.now()) {
      return 'expired';
    }

    return 'active';
  }

  private toPosition(tracking: PublicTracking): Coordinates {
    return {
      latitude: tracking.latitude,
      longitude: tracking.longitude,
    };
  }

  private isValidLocationUpdatedPayload(payload: unknown): payload is LocationUpdatedPayload {
    if (!payload || typeof payload !== 'object') {
      return false;
    }

    const candidate = payload as LocationUpdatedPayload;
    return typeof candidate.token === 'string'
      && Number.isFinite(candidate.latitude)
      && Number.isFinite(candidate.longitude)
      && typeof candidate.updatedAt === 'string'
      && typeof candidate.isActive === 'boolean'
      && typeof candidate.expiresAt === 'string';
  }

  ngOnDestroy(): void {
    this.realtimeService.stop();
    this.mapService.destroy();
  }
}
