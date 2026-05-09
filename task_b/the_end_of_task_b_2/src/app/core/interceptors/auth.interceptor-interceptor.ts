import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { catchError, throwError, switchMap } from 'rxjs';

export const authInterceptorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  // Skip token attachment for non-same-origin requests (CSRF protection)
  if (!isSameOrigin(req.url)) {
    return next(req);
  }

  // Only proceed if we have a valid token
  if (!authService.isTokenValid()) {
    // If token is invalid but refresh token exists, try to refresh
    const refreshToken = authService.getRefreshToken();
    if (refreshToken) {
      return authService.refreshAccessToken().pipe(
        switchMap((response) => {
          req = attachTokenToRequest(req, response.access_token);
          return next(req);
        }),
        catchError((error) => {
          // Refresh failed, logout and reject request
          return throwError(() => error);
        })
      );
    }
    // No token and no refresh token, proceed without auth
    return next(req).pipe(
      catchError((error: HttpErrorResponse) => {
        handleAuthError(authService, error);
        return throwError(() => error);
      })
    );
  }

  const token = authService.getToken();

  // Attach valid token to request
  if (token) {
    req = attachTokenToRequest(req, token);
  }

  // Handle responses and catch auth errors
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      handleAuthError(authService, error);
      return throwError(() => error);
    })
  );
};

/**
 * Attach Bearer token to Authorization header
 */
function attachTokenToRequest(req: any, token: string): any {
  return req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });
}

/**
 * Check if a URL is same-origin to prevent token leakage to third-party APIs
 */
function isSameOrigin(url: string): boolean {
  const currentOrigin = `${window.location.protocol}//${window.location.host}`;
  return url.startsWith(currentOrigin) || url.startsWith('/');
}

/**
 * Handle authentication-related HTTP errors
 */
function handleAuthError(authService: AuthService, error: HttpErrorResponse): void {
  switch (error.status) {
    case 400:
      // Bad Request - likely invalid grant or refresh token
      authService.logout();
      break;
    case 401:
      // Unauthorized - clear session
      authService.logout();
      break;
    case 403:
      // Forbidden - possibly invalid token
      authService.logout();
      break;
    case 422:
      // Unprocessable Entity - validation error, likely auth-related
      authService.logout();
      break;
    case 0:
      // Network error - could be CORS or connectivity issue
      console.error('Network error - check CORS and connectivity');
      break;
  }
}
