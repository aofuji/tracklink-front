import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { Coordinates, GeolocationFailure } from '../../core/geolocation/geolocation.models';
import { distanceInMeters } from '../../core/geolocation/geo-distance';
import { GeolocationService } from '../../core/geolocation/geolocation.service';
import { LocationSharingSessionService } from '../../core/tracking/location-sharing-session.service';
import { TrackingService } from '../../core/tracking/tracking.service';

type SharingState = 'starting' | 'active' | 'ended' | 'error';

const MIN_DISTANCE_METERS = 10;
const MIN_UPDATE_INTERVAL_MS = 10000;

@Component({
  imports: [RouterLink],
  selector: 'app-location-sharing',
  styleUrl: './location-sharing.component.scss',
  templateUrl: './location-sharing.component.html',
})
export class LocationSharingComponent implements OnInit, OnDestroy {
  private readonly geolocationService = inject(GeolocationService);
  private readonly trackingService = inject(TrackingService);
  private readonly sharingSession = inject(LocationSharingSessionService);
  private readonly owner = Symbol('location-sharing-flow');

  private watchId: number | null = null;
  private tokenValue: string | null = null;
  private lastConfirmedPosition: Coordinates | null = null;
  private lastSuccessfulUpdateAt: number | null = null;
  private pendingPosition: Coordinates | null = null;
  private putInFlight = false;
  private flowFinalized = false;

  readonly state = signal<SharingState>('starting');
  readonly message = signal('Preparando compartilhamento de localização...');
  readonly token = signal<string | null>(null);
  readonly lastLocalPosition = signal<Coordinates | null>(null);
  readonly lastSyncedPosition = signal<Coordinates | null>(null);
  readonly isUpdating = signal(false);
  readonly isEnding = signal(false);

  ngOnInit(): void {
    this.start();
  }

  ngOnDestroy(): void {
    this.finalizeLocalFlow();
  }

  retry(): void {
    if (this.state() !== 'error') {
      return;
    }

    this.start();
  }

  endSharing(): void {
    const token = this.tokenValue;
    if (!token || this.isEnding() || this.state() !== 'active') {
      return;
    }

    this.isEnding.set(true);
    this.message.set('Encerrando compartilhamento...');

    this.trackingService.endTracking(token).pipe(
      finalize(() => this.isEnding.set(false)),
    ).subscribe({
      next: () => {
        this.message.set('Compartilhamento encerrado.');
        this.finalizeLocalFlow('ended');
      },
      error: (error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 404) {
          this.message.set('O tracking não foi encontrado. O compartilhamento local foi finalizado.');
          this.finalizeLocalFlow('ended');
          return;
        }

        this.message.set('Não foi possível encerrar o compartilhamento. Tente novamente.');
      },
    });
  }

  private start(): void {
    this.resetTransientState();

    if (!this.sharingSession.claim(this.owner)) {
      this.state.set('error');
      this.message.set('Já existe um compartilhamento ativo neste navegador.');
      return;
    }

    this.state.set('starting');
    this.message.set('Obtendo sua localização inicial...');

    this.geolocationService.getCurrentPosition().subscribe({
      next: (position) => this.createTracking(position),
      error: (error: unknown) => {
        this.sharingSession.release(this.owner);
        this.state.set('error');
        this.message.set(this.geolocationMessage(error));
      },
    });
  }

  private createTracking(position: Coordinates): void {
    this.lastLocalPosition.set(position);
    this.message.set('Criando compartilhamento...');

    this.trackingService.createTracking(position).subscribe({
      next: (response) => {
        this.tokenValue = response.token;
        this.token.set(response.token);
        this.lastConfirmedPosition = position;
        this.lastSuccessfulUpdateAt = Date.now();
        this.lastSyncedPosition.set(position);
        this.state.set('active');
        this.message.set('Compartilhamento ativo.');
        this.startWatcher();
      },
      error: () => {
        this.sharingSession.release(this.owner);
        this.state.set('error');
        this.message.set('Não foi possível criar o tracking. Tente novamente.');
      },
    });
  }

  private startWatcher(): void {
    try {
      this.watchId = this.geolocationService.watchPosition(
        (position) => this.handleWatchedPosition(position),
        (error) => this.handleWatchError(error),
      );
    } catch (error) {
      this.state.set('error');
      this.message.set(this.geolocationMessage(error));
      this.finalizeLocalFlow();
    }
  }

  private handleWatchedPosition(position: Coordinates): void {
    if (this.state() !== 'active' || !this.tokenValue) {
      return;
    }

    this.lastLocalPosition.set(position);

    if (!this.isEligibleForUpdate(position)) {
      return;
    }

    this.enqueueOrSend(position);
  }

  private handleWatchError(error: GeolocationFailure): void {
    if (this.state() !== 'active') {
      this.state.set('error');
      this.message.set(this.geolocationMessage(error));
      return;
    }

    this.message.set(this.geolocationMessage(error));
  }

  private enqueueOrSend(position: Coordinates): void {
    if (this.putInFlight) {
      this.pendingPosition = position;
      return;
    }

    this.sendUpdate(position);
  }

  private sendUpdate(position: Coordinates): void {
    const token = this.tokenValue;
    if (!token || this.state() !== 'active') {
      return;
    }

    this.putInFlight = true;
    this.isUpdating.set(true);

    this.trackingService.updateTracking(token, position).subscribe({
      next: () => {
        this.lastConfirmedPosition = position;
        this.lastSuccessfulUpdateAt = Date.now();
        this.lastSyncedPosition.set(position);
        this.message.set('Localização atualizada.');
        this.finishUpdateAndFlushPending();
      },
      error: (error: unknown) => {
        if (this.isTrackingNoLongerActive(error)) {
          this.message.set('Este compartilhamento não está mais ativo.');
          this.finishUpdate(false);
          this.finalizeLocalFlow('ended');
          return;
        }

        this.message.set('Não foi possível atualizar a localização. Uma próxima posição poderá tentar novamente.');
        this.finishUpdateAndFlushPending();
      },
    });
  }

  private finishUpdateAndFlushPending(): void {
    this.finishUpdate(true);

    const pending = this.pendingPosition;
    this.pendingPosition = null;

    if (pending && this.state() === 'active' && this.isEligibleForUpdate(pending)) {
      this.sendUpdate(pending);
    }
  }

  private finishUpdate(keepPending: boolean): void {
    this.putInFlight = false;
    this.isUpdating.set(false);

    if (!keepPending) {
      this.pendingPosition = null;
    }
  }

  private isEligibleForUpdate(position: Coordinates): boolean {
    if (!this.lastConfirmedPosition || this.lastSuccessfulUpdateAt === null) {
      return true;
    }

    const distance = distanceInMeters(this.lastConfirmedPosition, position);
    const elapsed = Date.now() - this.lastSuccessfulUpdateAt;

    return distance >= MIN_DISTANCE_METERS || elapsed >= MIN_UPDATE_INTERVAL_MS;
  }

  private isTrackingNoLongerActive(error: unknown): boolean {
    return error instanceof HttpErrorResponse && [404, 409, 410].includes(error.status);
  }

  private finalizeLocalFlow(finalState?: SharingState): void {
    if (this.watchId !== null) {
      this.geolocationService.clearWatch(this.watchId);
      this.watchId = null;
    }

    this.finishUpdate(false);
    this.tokenValue = null;
    this.sharingSession.release(this.owner);
    this.flowFinalized = true;

    if (finalState) {
      this.state.set(finalState);
    }
  }

  private resetTransientState(): void {
    this.flowFinalized = false;
    this.watchId = null;
    this.tokenValue = null;
    this.token.set(null);
    this.lastConfirmedPosition = null;
    this.lastSuccessfulUpdateAt = null;
    this.pendingPosition = null;
    this.putInFlight = false;
    this.isUpdating.set(false);
    this.isEnding.set(false);
    this.lastLocalPosition.set(null);
    this.lastSyncedPosition.set(null);
  }

  private geolocationMessage(error: unknown): string {
    if (error instanceof GeolocationFailure) {
      const messages: Record<string, string> = {
        unsupported: 'Este navegador não oferece suporte à localização.',
        'permission-denied': 'Permissão de localização negada. Ajuste a permissão no navegador e tente novamente.',
        'position-unavailable': 'A localização está indisponível no momento. Tente novamente.',
        timeout: 'Tempo limite ao obter localização. Tente novamente.',
        unknown: 'Não foi possível obter a localização. Tente novamente.',
      };

      return messages[error.code] ?? messages['unknown'];
    }

    return 'Não foi possível obter a localização. Tente novamente.';
  }
}
