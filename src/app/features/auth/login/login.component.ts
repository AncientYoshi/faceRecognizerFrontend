import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CurrentUser } from '../../../core/models/api.models';
import { AuthService } from '../../../core/services/auth.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, IconComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly loading = signal(false);
  readonly loadingLabel = signal('Signing in…');
  readonly showPassword = signal(false);
  readonly error = signal('');
  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
    rememberMe: [false],
  });

  submit(): void {
    if (this.loading()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.loadingLabel.set('Signing in…');
    this.error.set('');
    const { email, password, rememberMe } = this.form.getRawValue();
    this.auth.login(email, password, rememberMe).subscribe({
      next: (user) => {
        this.loadingLabel.set('Opening portal…');
        void this.openPortal(user);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(
          err.status === 0
            ? 'Cannot reach the Smart Attendance API. Please check your connection.'
            : err.error?.message || 'Incorrect email or password.',
        );
      },
    });
  }

  private async openPortal(user: CurrentUser): Promise<void> {
    try {
      const opened = await this.router.navigateByUrl(this.auth.homeFor(this.auth.roleOf(user)));
      if (!opened) {
        this.error.set('Signed in, but the portal could not be opened. Please try again.');
      }
    } catch {
      this.error.set('Signed in, but the portal could not be opened. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  preview(role: 'ADMIN' | 'TEACHER' | 'STUDENT'): void {
    this.auth.enterPreview(role);
  }
}
