import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { filter, map, Observable, take } from 'rxjs';
import { AuthService } from './auth.service';
import { isInternalReturnUrl } from './auth.utils';

export const authGuard: CanActivateFn = (_route, state): boolean | UrlTree | Observable<boolean | UrlTree> => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isChecking()) {
    return authService.isAuthenticated() ? true : loginTree(router, state.url);
  }

  return toObservable(authService.status).pipe(
    filter((status) => status !== 'checking'),
    take(1),
    map((status) => status === 'authenticated' ? true : loginTree(router, state.url)),
  );
};

export const anonymousGuard: CanActivateFn = (): boolean | UrlTree | Observable<boolean | UrlTree> => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isChecking()) {
    return authService.isAuthenticated() ? router.createUrlTree(['/dashboard']) : true;
  }

  return toObservable(authService.status).pipe(
    filter((status) => status !== 'checking'),
    take(1),
    map((status) => status === 'authenticated' ? router.createUrlTree(['/dashboard']) : true),
  );
};

function loginTree(router: Router, requestedUrl: string): UrlTree {
  const queryParams = isInternalReturnUrl(requestedUrl) ? { returnUrl: requestedUrl } : undefined;
  return router.createUrlTree(['/login'], { queryParams });
}
