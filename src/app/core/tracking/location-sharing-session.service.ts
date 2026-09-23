import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LocationSharingSessionService {
  private activeOwner: symbol | null = null;

  claim(owner: symbol): boolean {
    if (this.activeOwner && this.activeOwner !== owner) {
      return false;
    }

    this.activeOwner = owner;
    return true;
  }

  release(owner: symbol): void {
    if (this.activeOwner === owner) {
      this.activeOwner = null;
    }
  }

  isActive(owner?: symbol): boolean {
    return owner ? this.activeOwner === owner : this.activeOwner !== null;
  }
}
