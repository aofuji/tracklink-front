import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api/api.config';
import { TrackingSummary } from './tracking.models';

@Injectable({ providedIn: 'root' })
export class TrackingService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  getMyTrackings(): Observable<TrackingSummary[]> {
    return this.http.get<TrackingSummary[]>(this.url('/api/tracking/my'));
  }

  endTracking(token: string): Observable<void> {
    return this.http.delete<void>(this.url(`/api/tracking/${encodeURIComponent(token)}`));
  }

  private url(path: string): string {
    return `${this.apiBaseUrl}${path}`;
  }
}
