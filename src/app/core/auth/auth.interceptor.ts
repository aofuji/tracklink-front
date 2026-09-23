import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { API_BASE_URL } from '../api/api.config';
import { AuthService } from './auth.service';

const SKIP_REFRESH_ENDPOINTS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/auth/logout',
];

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const apiBaseUrl = inject(API_BASE_URL);

  const requestWithAuth = attachAccessToken(request, authService.accessToken(), apiBaseUrl);

  return next(requestWithAuth).pipe(
    catchError((error: unknown) => {
      if (!shouldRefresh(error, requestWithAuth)) {
        return throwError(() => error);
      }

      return authService.refreshSession().pipe(
        switchMap((accessToken) => next(markRetried(attachAccessToken(request, accessToken, apiBaseUrl)))),
        catchError((refreshError: unknown) => {
          authService.endSession();
          void router.navigate(['/login']);
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};

function attachAccessToken(request: HttpRequest<unknown>, accessToken: string | null, apiBaseUrl: string): HttpRequest<unknown> {
  if (!accessToken || !isApiRequest(request.url, apiBaseUrl) || isAuthMutationEndpoint(request.url)) {
    return request;
  }

  return request.clone({
    setHeaders: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

function shouldRefresh(error: unknown, request: HttpRequest<unknown>): error is HttpErrorResponse {
  return error instanceof HttpErrorResponse
    && error.status === 401
    && !wasRetried(request)
    && !isAuthMutationEndpoint(request.url);
}

function isApiRequest(url: string, apiBaseUrl: string): boolean {
  return url.startsWith(apiBaseUrl) || url.startsWith('/api/');
}

function isAuthMutationEndpoint(url: string): boolean {
  return SKIP_REFRESH_ENDPOINTS.some((endpoint) => url.endsWith(endpoint));
}

function wasRetried(request: HttpRequest<unknown>): boolean {
  return request.headers.get('X-Auth-Retry') === 'true';
}

function markRetried(request: HttpRequest<unknown>): HttpRequest<unknown> {
  return request.clone({
    setHeaders: {
      'X-Auth-Retry': 'true',
    },
  });
}
