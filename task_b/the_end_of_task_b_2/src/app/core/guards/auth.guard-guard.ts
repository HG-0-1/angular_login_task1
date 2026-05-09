import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuardGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isTokenValid()) {
    return true;
  }

  // If a stale session exists, clear it before redirecting.
  if (authService.isLoggedIn()) {
    authService.logout();
  }

  const redirectTo = route.data?.['redirectTo'] as string | undefined;
  return router.parseUrl(redirectTo ?? '/');
};
