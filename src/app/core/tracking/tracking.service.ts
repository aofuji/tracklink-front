import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api/api.config';
import { SKIP_AUTH } from '../auth/auth.interceptor';
import {
  CreateTrackingResponse,
  PublicTracking,
  TrackingHistoryLocation,
  TrackingLocationPayload,
  TrackingSummary,
} from './tracking.models';

@Injectable({ providedIn: 'root' })
export class TrackingService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  getMyTrackings(): Observable<TrackingSummary[]> {
    return this.http.get<TrackingSummary[]>(this.url('/api/tracking/my'));
  }

  getPublicTracking(token: string): Observable<PublicTracking> {
    return this.http.get<PublicTracking>(this.url(`/api/tracking/${encodeURIComponent(token)}`), {
      context: this.publicContext(),
    });
  }

  getPublicTrackingHistory(token: string): Observable<TrackingHistoryLocation[]> {
    return this.http.get<TrackingHistoryLocation[]>(this.url(`/api/tracking/${encodeURIComponent(token)}/history`), {
      context: this.publicContext(),
    });
  }

  createTracking(payload: TrackingLocationPayload): Observable<CreateTrackingResponse> {
    return this.http.post<CreateTrackingResponse>(this.url('/api/tracking'), payload);
  }

  updateTracking(token: string, payload: TrackingLocationPayload): Observable<void> {
    return this.http.put<void>(this.url(`/api/tracking/${encodeURIComponent(token)}`), payload);
  }

  endTracking(token: string): Observable<void> {
    return this.http.delete<void>(this.url(`/api/tracking/${encodeURIComponent(token)}`));
  }

  private publicContext(): HttpContext {
    return new HttpContext().set(SKIP_AUTH, true);
  }

  private url(path: string): string {
    return `${this.apiBaseUrl}${path}`;
  }
}
