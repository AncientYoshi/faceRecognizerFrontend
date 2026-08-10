import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, IconComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly loading = signal(false);
  readonly showPassword = signal(false);
  readonly error = signal('');
  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true); this.error.set('');
    const { email, password } = this.form.getRawValue();
    this.auth.login(email, password).subscribe({
      next: user => {
        this.loading.set(false);
        const path = user.roles.includes('ADMIN') ? '/admin/dashboard' : user.roles.includes('TEACHER') ? '/admin/teacher-dashboard' : '/student/dashboard';
        this.router.navigateByUrl(path);
      },
      error: err => {
        this.loading.set(false);
        this.error.set(err.status === 0 ? 'Cannot reach the Smart Attendance API. Please check your connection.' : (err.error?.message || 'Incorrect email or password.'));
      },
    });
  }

  preview(role: 'ADMIN' | 'TEACHER' | 'STUDENT'): void { this.auth.enterPreview(role); }
}
