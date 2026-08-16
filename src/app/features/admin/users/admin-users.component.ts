import { DatePipe, TitleCasePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CreateUserPayload, PageResponse, Role, RoleResponse, UpdateUserPayload, UserSummary } from '../../../core/models/api.models';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe, TitleCasePipe, IconComponent],
  templateUrl: './admin-users.component.html',
  styleUrl: './admin-users.component.css',
})
export class AdminUsersComponent implements OnInit {
  private readonly users = inject(UserService);
  private readonly fb = inject(FormBuilder);
  readonly auth = inject(AuthService);
  private readonly searchTerms = new Subject<string>();

  readonly page = signal<PageResponse<UserSummary>>({ content: [], page: 0, size: 10, totalElements: 0, totalPages: 0, first: true, last: true });
  readonly roles = signal<RoleResponse[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly query = signal('');
  readonly error = signal('');
  readonly toast = signal('');
  readonly modalOpen = signal(false);
  readonly editingUser = signal<UserSummary | null>(null);
  readonly deleteTarget = signal<UserSummary | null>(null);
  readonly deleteError = signal('');
  readonly selectedRole = signal<Role | null>(null);
  readonly isEdit = computed(() => !!this.editingUser());

  readonly form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.maxLength(100)]],
    lastName: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    studentNumber: [''],
    employeeNumber: [''],
    enabled: [true],
  });

  constructor() {
    this.searchTerms.pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed()).subscribe(query => {
      this.query.set(query);
      this.load(0);
    });
  }

  ngOnInit(): void {
    this.load();
    this.users.listRoles().subscribe({ next: roles => this.roles.set(roles), error: () => this.roles.set([]) });
  }

  search(event: Event): void { this.searchTerms.next((event.target as HTMLInputElement).value); }

  load(page = this.page().page): void {
    this.loading.set(true); this.error.set('');
    this.users.list(this.query(), page, 10).subscribe({
      next: result => { this.page.set(result); this.loading.set(false); },
      error: error => { this.loading.set(false); this.error.set(this.message(error, 'Could not load users.')); },
    });
  }

  openCreate(): void {
    this.error.set('');
    this.editingUser.set(null);
    this.selectedRole.set('STUDENT');
    this.form.reset({ firstName: '', lastName: '', email: '', password: '', studentNumber: '', employeeNumber: '', enabled: true });
    this.form.controls.password.setValidators([Validators.required, Validators.minLength(8)]);
    this.form.controls.password.updateValueAndValidity();
    this.modalOpen.set(true);
  }

  openEdit(user: UserSummary): void {
    this.error.set('');
    this.editingUser.set(user);
    this.selectedRole.set(this.auth.roleOf(user));
    this.form.reset({ firstName: user.firstName, lastName: user.lastName, email: user.email, password: '', studentNumber: user.studentNumber ?? '', employeeNumber: user.employeeNumber ?? '', enabled: user.enabled });
    this.form.controls.password.setValidators([Validators.minLength(8)]);
    this.form.controls.password.updateValueAndValidity();
    this.modalOpen.set(true);
  }

  closeModal(): void { if (!this.saving()) this.modalOpen.set(false); }

  openDelete(user: UserSummary): void {
    this.error.set('');
    this.deleteError.set('');
    this.deleteTarget.set(user);
  }

  cancelDelete(): void {
    if (this.saving()) return;
    this.deleteError.set('');
    this.deleteTarget.set(null);
  }

  selectRole(role: Role): void { this.selectedRole.set(role); }

  hasRole(role: Role): boolean { return this.selectedRole() === role; }

  submit(): void {
    if (this.form.invalid || !this.selectedRole()) { this.form.markAllAsTouched(); this.error.set(!this.selectedRole() ? 'Select a role.' : 'Check the highlighted form fields.'); return; }
    const value = this.form.getRawValue();
    if (this.hasRole('STUDENT') && !value.studentNumber.trim()) { this.error.set('Roll number is required for the Student role.'); return; }
    if (this.hasRole('TEACHER') && !value.employeeNumber.trim()) { this.error.set('Employee number is required for the Teacher role.'); return; }
    this.saving.set(true); this.error.set('');
    const common = { email: value.email.trim(), firstName: value.firstName.trim(), lastName: value.lastName.trim(), roles: [this.selectedRole()!], studentNumber: this.hasRole('STUDENT') ? value.studentNumber.trim() : null, employeeNumber: this.hasRole('TEACHER') ? value.employeeNumber.trim() : null };
    const request = this.isEdit()
      ? this.users.update(this.editingUser()!.id, { ...common, password: value.password || null, enabled: value.enabled } as UpdateUserPayload)
      : this.users.create({ ...common, password: value.password } as CreateUserPayload);
    request.subscribe({
      next: () => { this.saving.set(false); this.modalOpen.set(false); this.showToast(this.isEdit() ? 'User updated successfully.' : 'User created successfully.'); this.load(this.isEdit() ? this.page().page : 0); },
      error: error => { this.saving.set(false); this.error.set(this.message(error, `Could not ${this.isEdit() ? 'update' : 'create'} the user.`)); },
    });
  }

  confirmDelete(): void {
    const target = this.deleteTarget();
    if (!target) return;
    this.saving.set(true); this.error.set(''); this.deleteError.set('');
    this.users.delete(target.id).subscribe({
      next: () => { this.saving.set(false); this.deleteError.set(''); this.deleteTarget.set(null); this.showToast('User deleted successfully.'); this.load(Math.max(0, this.page().content.length === 1 ? this.page().page - 1 : this.page().page)); },
      error: error => { this.saving.set(false); this.deleteError.set(this.message(error, 'Could not delete the user.')); },
    });
  }

  initials(user: UserSummary): string { return `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase(); }
  identity(user: UserSummary): string { return user.studentNumber || user.employeeNumber || '—'; }
  enabledCount(): number { return this.page().content.filter(user => user.enabled).length; }
  userRole(user: UserSummary): Role | null { return this.auth.roleOf(user); }
  roleCount(role: Role): number { return this.page().content.filter(user => this.userRole(user) === role).length; }

  private showToast(message: string): void { this.toast.set(message); window.setTimeout(() => this.toast.set(''), 2800); }
  private message(error: any, fallback: string): string {
    if (error.status === 0) return 'Cannot reach the Smart Attendance API. Please check your connection.';
    let body=error.error;
    if(typeof body==='string'){try{body=JSON.parse(body)}catch{return body||fallback}}
    return body?.message||body?.detail||error.message||fallback;
  }
}
