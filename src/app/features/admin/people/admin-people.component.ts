import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Role, UserSummary } from '../../../core/models/api.models';
import { UserService } from '../../../core/services/user.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';
@Component({
  selector: 'app-admin-people',
  standalone: true,
  imports: [ReactiveFormsModule, IconComponent],
  templateUrl: './admin-people.component.html',
  styleUrl: './admin-people.component.css',
})
export class AdminPeopleComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(UserService);
  private fb = inject(FormBuilder);
  readonly role = this.route.snapshot.data['role'] as Role;
  readonly title = this.role === 'TEACHER' ? 'Teachers' : 'Students';
  readonly people = signal<UserSummary[]>([]);
  readonly modal = signal(false);
  readonly editing = signal<UserSummary | null>(null);
  readonly error = signal('');
  readonly deleteError = signal('');
  readonly loading = signal(true);
  form = this.fb.nonNullable.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.minLength(8)],
    reference: ['', Validators.required],
    studyYear: [1, [Validators.required, Validators.min(1), Validators.max(6)]],
    enabled: [true],
  });
  ngOnInit() {
    this.load();
  }
  load() {
    this.loading.set(true);
    this.error.set('');
    this.deleteError.set('');
    this.api.listAll().subscribe({
      next: (x) => {
        this.people.set(x.filter((u) => u.roles.includes(this.role)));
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(e.error?.message || 'Could not load users.');
        this.loading.set(false);
      },
    });
  }
  open(user?: UserSummary) {
    this.error.set('');
    this.editing.set(user || null);
    this.form.reset({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      password: '',
      reference: (this.role === 'TEACHER' ? user?.employeeNumber : user?.studentNumber) || '',
      studyYear: user?.studyYear || 1,
      enabled: user?.enabled ?? true,
    });
    this.form.controls.password.setValidators(
      user ? [Validators.minLength(8)] : [Validators.required, Validators.minLength(8)],
    );
    this.form.controls.password.updateValueAndValidity();
    this.modal.set(true);
  }
  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const common = {
      email: v.email,
      firstName: v.firstName,
      lastName: v.lastName,
      roles: [this.role],
      studentNumber: this.role === 'STUDENT' ? v.reference : null,
      studyYear: this.role === 'STUDENT' ? Number(v.studyYear) : null,
      employeeNumber: this.role === 'TEACHER' ? v.reference : null,
    };
    const req = this.editing()
      ? this.api.update(this.editing()!.id, {
          ...common,
          password: v.password || null,
          enabled: v.enabled,
        })
      : this.api.create({ ...common, password: v.password });
    req.subscribe({
      next: () => {
        this.modal.set(false);
        this.load();
      },
      error: (e) => this.error.set(e.error?.message || 'Could not save user.'),
    });
  }
  remove(u: UserSummary) {
    if (!confirm(`Delete ${u.firstName} ${u.lastName}?`)) return;
    this.deleteError.set('');
    this.api
      .delete(u.id)
      .subscribe({
        next: () => this.load(),
        error: (e) => this.deleteError.set(this.message(e, 'Could not delete user.')),
      });
  }

  private message(error: any, fallback: string): string {
    if (error.status === 0) return 'Cannot reach the Smart Attendance API. Please check your connection.';
    let body = error.error;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        return body || fallback;
      }
    }
    return body?.message || body?.detail || error.message || fallback;
  }
}
