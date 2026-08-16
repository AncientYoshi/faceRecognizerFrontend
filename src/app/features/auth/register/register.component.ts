import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PublicDepartment, RegisterUserResponse, SelfRegistrationRole } from '../../../core/models/api.models';
import { AuthService } from '../../../core/services/auth.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, IconComponent],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
})
export class RegisterComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  readonly departments = signal<PublicDepartment[]>([]);
  readonly loadingDepartments = signal(true);
  readonly loading = signal(false);
  readonly showPassword = signal(false);
  readonly error = signal('');
  readonly success = signal<RegisterUserResponse | null>(null);

  readonly form = this.fb.nonNullable.group({
    role: ['STUDENT' as SelfRegistrationRole, Validators.required],
    firstName: ['', [Validators.required, Validators.maxLength(100)]],
    lastName: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(320)]],
    referenceNumber: ['', [Validators.required, Validators.maxLength(80)]],
    departmentId: ['', Validators.required],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(200)]],
    confirmPassword: ['', Validators.required],
  });

  ngOnInit(): void {
    this.auth.publicDepartments().subscribe({
      next: departments => {
        this.departments.set(departments);
        const selectedDepartment = this.form.controls.departmentId.value;
        if (selectedDepartment && !departments.some(department => department.id === selectedDepartment)) {
          this.form.controls.departmentId.setValue('');
        } else if (!selectedDepartment && departments.length === 1) {
          this.form.controls.departmentId.setValue(departments[0].id);
        }
        this.loadingDepartments.set(false);
      },
      error: error => {
        this.loadingDepartments.set(false);
        this.error.set(this.message(error, 'Could not load departments. Please refresh and try again.'));
      },
    });
  }

  selectRole(role: SelfRegistrationRole): void {
    if (this.form.controls.role.value === role) return;
    this.form.controls.role.setValue(role);
    this.form.controls.referenceNumber.setValue('');
    this.form.controls.referenceNumber.markAsUntouched();
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Please complete all required fields.');
      return;
    }
    const value = this.form.getRawValue();
    if (value.password !== value.confirmPassword) {
      this.form.controls.confirmPassword.setErrors({ mismatch: true });
      this.form.controls.confirmPassword.markAsTouched();
      this.error.set('Passwords do not match.');
      return;
    }

    const referenceNumber = value.referenceNumber.trim();
    this.loading.set(true);
    this.error.set('');
    this.auth.register({
      email: value.email.trim().toLowerCase(),
      password: value.password,
      firstName: value.firstName.trim(),
      lastName: value.lastName.trim(),
      role: value.role,
      studentNumber: value.role === 'STUDENT' ? referenceNumber : null,
      employeeNumber: value.role === 'TEACHER' ? referenceNumber : null,
      departmentId: value.departmentId,
    }).subscribe({
      next: response => {
        this.loading.set(false);
        this.success.set(response);
      },
      error: error => {
        this.loading.set(false);
        this.error.set(this.message(error, 'Could not create your account. Please try again.'));
      },
    });
  }

  referenceLabel(): string {
    return this.form.controls.role.value === 'STUDENT' ? 'Roll number' : 'Employee number';
  }

  referencePlaceholder(): string {
    return this.form.controls.role.value === 'STUDENT' ? 'e.g. STU-2026-001' : 'e.g. TCH-2026-001';
  }

  private message(error: any, fallback: string): string {
    if (error.status === 0) return 'Cannot reach the Smart Attendance API. Please check your connection.';
    const details = error.error?.errors;
    if (Array.isArray(details) && details.length) return details.map((item: any) => item.message ?? item.defaultMessage).filter(Boolean).join(' ');
    return error.error?.message || error.error?.detail || fallback;
  }
}
