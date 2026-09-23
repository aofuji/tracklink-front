import { inject, Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { from, Observable, Subject } from 'rxjs';
import { API_BASE_URL } from '../api/api.config';
import { LocationUpdatedPayload } from './tracking.models';

export type RealtimeConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'failed';

type HubConnectionFactory = (url: string) => signalR.HubConnection;

export const createTrackingHubConnection: HubConnectionFactory = (url) => new signalR.HubConnectionBuilder()
  .withUrl(url, { withCredentials: false })
  .withAutomaticReconnect()
  .build();

@Injectable({ providedIn: 'root' })
export class TrackingRealtimeService {
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly locationUpdatedSubject = new Subject<LocationUpdatedPayload>();
  private readonly trackingEndedSubject = new Subject<void>();
  private readonly connectionStateSubject = new Subject<RealtimeConnectionState>();
  private connection: signalR.HubConnection | null = null;
  private token: string | null = null;
  private connectionFactory: HubConnectionFactory = createTrackingHubConnection;

  readonly locationUpdated$ = this.locationUpdatedSubject.asObservable();
  readonly trackingEnded$ = this.trackingEndedSubject.asObservable();
  readonly connectionState$ = this.connectionStateSubject.asObservable();

  connect(token: string): Observable<void> {
    this.stop();
    this.token = token;
    this.connectionStateSubject.next('connecting');

    const connection = this.connectionFactory(this.hubUrl());
    this.connection = connection;

    connection.on('LocationUpdated', (payload: LocationUpdatedPayload) => {
      this.locationUpdatedSubject.next(payload);
    });

    connection.on('TrackingEnded', () => {
      this.trackingEndedSubject.next();
    });

    connection.onreconnecting(() => {
      this.connectionStateSubject.next('reconnecting');
    });

    connection.onreconnected(() => {
      this.connectionStateSubject.next('connected');
      void this.joinTracking();
    });

    connection.onclose(() => {
      if (this.connection === connection) {
        this.connectionStateSubject.next('disconnected');
      }
    });

    return from(connection.start()
      .then(() => this.joinTracking())
      .then(() => {
        this.connectionStateSubject.next('connected');
      })
      .catch((error: unknown) => {
        this.connectionStateSubject.next('failed');
        throw error;
      }));
  }

  stop(): void {
    const connection = this.connection;
    this.connection = null;
    this.token = null;

    if (connection) {
      void connection.stop();
    }

    this.connectionStateSubject.next('disconnected');
  }

  setConnectionFactoryForTesting(factory: HubConnectionFactory): void {
    this.connectionFactory = factory;
  }

  private joinTracking(): Promise<void> {
    if (!this.connection || !this.token) {
      return Promise.resolve();
    }

    return this.connection.invoke('JoinTracking', this.token);
  }

  private hubUrl(): string {
    return `${this.apiBaseUrl}/hubs/tracking`;
  }
}
