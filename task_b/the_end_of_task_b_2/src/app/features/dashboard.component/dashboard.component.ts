import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { FormatDatePipe } from '../../shared/pipes/format-date.pipe';
import { AuthOnlyDirective } from '../../shared/directives/auth-only.directive';

/**
 * Angular equivalent of Task A's dashboardcontroller.
 *
 * All methods are synchronous - no Observables needed.
 * User data comes through AuthService getter methods.
 *
 * isLoggingOut signal prevents double-submit by disabling the button.
 * OnPush is safe here: all state is either a signal or a getter method.
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [FormatDatePipe, AuthOnlyDirective],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly isLoggingOut = signal(false);
  readonly logoutError = signal<string | null>(null);

  get username(): string | null {
    return this.authService.getUsername();
  }

  get loginTimestamp(): number | null {
    return this.authService.getLoginTimestamp();
  }

  get isAuthenticated(): boolean {
    return this.authService.isLoggedIn();
  }

  logout(): void {
    // Block any subsequent clicks
    if (this.isLoggingOut()) return;

    this.isLoggingOut.set(true);
    this.logoutError.set(null);
    // logout() is synchronous
    this.authService.logout();
    // Trigger change detection since getters now return different values
    this.cdr.markForCheck();
    // AuthService clears its own state; we just navigate
    this.router.navigate(['/login']); this.logoutError.set('Logout failed. Please try again.');
  }
}
