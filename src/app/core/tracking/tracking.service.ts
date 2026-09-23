import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api/api.config';
import { CreateTrackingResponse, TrackingLocationPayload, TrackingSummary } from './tracking.models';

@Injectable({ providedIn: 'root' })
export class TrackingService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  getMyTrackings(): Observable<TrackingSummary[]> {
    return this.http.get<TrackingSummary[]>(this.url('/api/tracking/my'));
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

  private url(path: string): string {
    return `${this.apiBaseUrl}${path}`;
  }
}
