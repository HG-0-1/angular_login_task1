import {
  Component,
  inject,
  ChangeDetectionStrategy,
  DestroyRef,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  private readonly destroyRef = inject(DestroyRef);

  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly showPassword = signal(false);

  protected readonly loginForm = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(2)]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  get username() {
    return this.loginForm.get('username')!;
  }

  get password() {
    return this.loginForm.get('password')!;
  }

  protected togglePassword(): void {
    this.showPassword.update(v => !v);
  }

  protected onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }


    this.loginForm.disable();
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const { username, password } = this.loginForm.getRawValue();

    this.authService
      .login(username!, password!)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isLoading.set(false);
          this.router.navigate(['/dashboard']);
        },
        error: (err: Error) => {
          this.isLoading.set(false);
          // Re-enable the form so the user can correct their credentials and retry.
          this.loginForm.enable();
          this.errorMessage.set(
            err.message ?? 'Login failed. Please check your credentials and try again.'
          );
        },
      });
  }
}
