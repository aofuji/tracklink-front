import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { signal } from '@angular/core';
import { of, Subject, throwError } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { TrackingSummary } from '../../core/tracking/tracking.models';
import { TrackingService } from '../../core/tracking/tracking.service';
import { DashboardComponent } from './dashboard.component';

const activeTracking: TrackingSummary = {
  token: 'abcdef1234567890',
  isActive: true,
  latitude: -23.5,
  longitude: -46.6,
  updatedAt: '2026-09-23T12:00:00Z',
  expiresAt: '2026-09-24T12:00:00Z',
};

const inactiveExpiredTracking: TrackingSummary = {
  token: 'inactive-token',
  isActive: false,
  latitude: -23.5,
  longitude: -46.6,
  updatedAt: '2026-09-22T12:00:00Z',
  expiresAt: '2026-09-22T13:00:00Z',
};

describe('DashboardComponent', () => {
  let fixture: ComponentFixture<DashboardComponent>;
  let component: DashboardComponent;
  let trackingService: {
    getMyTrackings: ReturnType<typeof vi.fn>;
    endTracking: ReturnType<typeof vi.fn>;
  };
  let authService: {
    user: ReturnType<typeof signal<{ email: string } | null>>;
    logout: ReturnType<typeof vi.fn>;
  };
  let router: { navigate: ReturnType<typeof vi.fn> };

  async function createComponent(trackings: TrackingSummary[] = [activeTracking]): Promise<void> {
    trackingService = {
      getMyTrackings: vi.fn().mockReturnValue(of(trackings)),
      endTracking: vi.fn().mockReturnValue(of(undefined)),
    };
    authService = {
      user: signal({ email: 'ana@example.com' }),
      logout: vi.fn().mockReturnValue(of(undefined)),
    };
    router = { navigate: vi.fn().mockResolvedValue(true) };

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        { provide: TrackingService, useValue: trackingService },
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('loads and displays the trackings list', async () => {
    await createComponent([activeTracking]);

    const text = fixture.nativeElement.textContent as string;
    expect(trackingService.getMyTrackings).toHaveBeenCalledOnce();
    expect(component.state()).toBe('loaded');
    expect(text).toContain('Ativo');
    expect(text).toContain('abcdef...7890');
    expect(text).toContain('Atualizado em');
    expect(text).toContain('Expira em');
    expect(text).not.toContain('-23.5');
    expect(text).not.toContain('-46.6');
  });

  it('shows an empty state when there are no trackings', async () => {
    await createComponent([]);

    expect(fixture.nativeElement.textContent).toContain('Você ainda não possui trackings.');
  });

  it('shows a recoverable loading error with retry', async () => {
    trackingService = {
      getMyTrackings: vi.fn()
        .mockReturnValueOnce(throwError(() => new Error('network detail')))
        .mockReturnValueOnce(of([activeTracking])),
      endTracking: vi.fn(),
    };
    authService = { user: signal(null), logout: vi.fn().mockReturnValue(of(undefined)) };
    router = { navigate: vi.fn().mockResolvedValue(true) };

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        { provide: TrackingService, useValue: trackingService },
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.state()).toBe('error');
    expect(fixture.nativeElement.textContent).toContain('Não foi possível carregar seus trackings.');
    expect(fixture.nativeElement.textContent).toContain('Tentar novamente');

    component.loadTrackings();
    fixture.detectChanges();

    expect(component.state()).toBe('loaded');
    expect(component.trackings()).toEqual([activeTracking]);
  });

  it('derives inactive before expired and uses a stable clock in tests', async () => {
    await createComponent([inactiveExpiredTracking]);

    expect(component.derivedStatus(inactiveExpiredTracking, new Date('2026-09-23T12:00:00Z'))).toBe('inactive');
    expect(component.derivedStatus({ ...activeTracking, expiresAt: '2026-09-22T12:00:00Z' }, new Date('2026-09-23T12:00:00Z'))).toBe('expired');
    expect(component.derivedStatus(activeTracking, new Date('2026-09-23T12:00:00Z'))).toBe('active');
  });

  it('navigates to the public tracking route using the token', async () => {
    await createComponent([activeTracking]);

    component.openTracking(activeTracking);

    expect(router.navigate).toHaveBeenCalledWith(['/tracking', 'abcdef1234567890']);
  });

  it('ends an active tracking and reloads the list after success', async () => {
    await createComponent([activeTracking]);
    trackingService.getMyTrackings.mockClear();
    trackingService.getMyTrackings.mockReturnValue(of([]));

    component.endTracking(activeTracking);

    expect(trackingService.endTracking).toHaveBeenCalledWith(activeTracking.token);
    expect(trackingService.getMyTrackings).toHaveBeenCalledOnce();
    expect(component.trackings()).toEqual([]);
  });

  it('blocks duplicate end requests for the same token while one is pending', async () => {
    const pendingDelete = new Subject<void>();
    await createComponent([activeTracking]);
    trackingService.endTracking.mockReturnValue(pendingDelete.asObservable());

    component.endTracking(activeTracking);
    component.endTracking(activeTracking);

    expect(trackingService.endTracking).toHaveBeenCalledOnce();
    pendingDelete.next();
    pendingDelete.complete();
  });

  it('handles 404 on delete with a specific message and reloads the list', async () => {
    await createComponent([activeTracking]);
    trackingService.endTracking.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    trackingService.getMyTrackings.mockClear();
    trackingService.getMyTrackings.mockReturnValue(of([]));

    component.endTracking(activeTracking);

    expect(component.actionMessage()).toBe('O tracking selecionado não foi encontrado. A lista foi atualizada.');
    expect(trackingService.getMyTrackings).toHaveBeenCalledOnce();
    expect(component.trackings()).toEqual([]);
  });

  it('shows a safe message when delete fails without marking the item as ended', async () => {
    await createComponent([activeTracking]);
    trackingService.endTracking.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    trackingService.getMyTrackings.mockClear();

    component.endTracking(activeTracking);

    expect(component.actionMessage()).toBe('Não foi possível encerrar o tracking. Tente novamente.');
    expect(trackingService.getMyTrackings).not.toHaveBeenCalled();
    expect(component.trackings()).toEqual([activeTracking]);
  });

  it('does not try to end inactive or expired trackings', async () => {
    await createComponent([inactiveExpiredTracking]);

    component.endTracking(inactiveExpiredTracking);

    expect(trackingService.endTracking).not.toHaveBeenCalled();
  });
});
