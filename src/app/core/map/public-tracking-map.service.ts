import { ElementRef, Injectable } from '@angular/core';
import * as L from 'leaflet';
import { Coordinates } from '../geolocation/geolocation.models';
import { TrackingHistoryLocation } from '../tracking/tracking.models';

const INITIAL_ZOOM = 16;
const OSM_TILE_LAYER = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

@Injectable({ providedIn: 'root' })
export class PublicTrackingMapService {
  private map: L.Map | null = null;
  private marker: L.Marker | null = null;
  private route: L.Polyline | null = null;
  private routePoints: L.LatLngExpression[] = [];

  initialize(container: HTMLElement | ElementRef<HTMLElement>, currentPosition: Coordinates, history: TrackingHistoryLocation[]): void {
    this.destroy();

    const element = container instanceof ElementRef ? container.nativeElement : container;
    const center: L.LatLngExpression = [currentPosition.latitude, currentPosition.longitude];

    this.routePoints = history.map((location) => [location.latitude, location.longitude]);
    if (this.routePoints.length === 0) {
      this.routePoints = [center];
    }

    this.map = L.map(element).setView(center, INITIAL_ZOOM);
    L.tileLayer(OSM_TILE_LAYER, {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(this.map);

    this.route = L.polyline(this.routePoints, { color: '#2563eb', weight: 4 }).addTo(this.map);
    this.marker = L.marker(center, { icon: this.markerIcon() }).addTo(this.map);
  }

  setCurrentPosition(position: Coordinates): void {
    const next: L.LatLngExpression = [position.latitude, position.longitude];
    this.marker?.setLatLng(next);
    this.map?.setView(next, INITIAL_ZOOM);
  }

  addRoutePoint(position: Coordinates): void {
    const next: L.LatLngExpression = [position.latitude, position.longitude];
    this.routePoints = [...this.routePoints, next];
    this.route?.setLatLngs(this.routePoints);
  }

  destroy(): void {
    this.marker = null;
    this.route = null;
    this.routePoints = [];

    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  private markerIcon(): L.DivIcon {
    return L.divIcon({
      className: 'public-tracking-marker',
      html: '<span aria-hidden="true"></span>',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
  }
}
