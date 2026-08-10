import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { EMPTY, Observable, expand, of, reduce } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreateUserPayload, PageResponse, RoleResponse, UpdateUserPayload, UserSummary } from '../models/api.models';
import { AuthService } from './auth.service';

const PREVIEW_USERS: UserSummary[] = [
  { id: 'preview-admin', email: 'alex.morgan@sam.edu', firstName: 'Alex', lastName: 'Morgan', enabled: true, roles: ['ADMIN'], createdAt: '2026-01-12T08:30:00Z' },
  { id: 'u2', email: 'john.smith@sam.edu', firstName: 'John', lastName: 'Smith', enabled: true, roles: ['TEACHER'], teacherId: 't1', employeeNumber: 'TCH-001', createdAt: '2026-02-10T09:00:00Z' },
  { id: 'u3', email: 'emily.johnson@sam.edu', firstName: 'Emily', lastName: 'Johnson', enabled: true, roles: ['TEACHER'], teacherId: 't2', employeeNumber: 'TCH-002', createdAt: '2026-03-04T09:00:00Z' },
  { id: 'u4', email: 'mia.anderson@sam.edu', firstName: 'Mia', lastName: 'Anderson', enabled: true, roles: ['STUDENT'], studentId: 's1', studentNumber: 'STU-24018', createdAt: '2026-04-11T09:00:00Z' },
  { id: 'u5', email: 'noah.williams@sam.edu', firstName: 'Noah', lastName: 'Williams', enabled: true, roles: ['STUDENT'], studentId: 's2', studentNumber: 'STU-24019', createdAt: '2026-04-12T09:00:00Z' },
  { id: 'u6', email: 'ava.brown@sam.edu', firstName: 'Ava', lastName: 'Brown', enabled: false, roles: ['STUDENT'], studentId: 's3', studentNumber: 'STU-24020', createdAt: '2026-04-13T09:00:00Z' },
];

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly previewUsers = signal<UserSummary[]>(PREVIEW_USERS);

  list(query = '', page = 0, size = 10): Observable<PageResponse<UserSummary>> {
    if (this.auth.isPreview()) {
      const normalized = query.trim().toLowerCase();
      const filtered = this.previewUsers().filter(user => !normalized || `${user.firstName} ${user.lastName} ${user.email} ${user.studentNumber ?? ''} ${user.employeeNumber ?? ''}`.toLowerCase().includes(normalized));
      const content = filtered.slice(page * size, page * size + size);
      return of({ content, page, size, totalElements: filtered.length, totalPages: Math.ceil(filtered.length / size), first: page === 0, last: page >= Math.ceil(filtered.length / size) - 1 });
    }
    const params = new HttpParams().set('query', query).set('page', page).set('size', size);
    return this.http.get<PageResponse<UserSummary>>(`${environment.apiUrl}/users`, { params });
  }

  listAll(query = ''): Observable<UserSummary[]> {
    return this.list(query, 0, 100).pipe(
      expand(page => page.last ? EMPTY : this.list(query, page.page + 1, 100)),
      reduce((users, page) => [...users, ...page.content], [] as UserSummary[]),
    );
  }

  get(id: string): Observable<UserSummary> {
    if (this.auth.isPreview()) return of(this.previewUsers().find(user => user.id === id)!);
    return this.http.get<UserSummary>(`${environment.apiUrl}/users/${id}`);
  }

  listRoles(): Observable<RoleResponse[]> {
    if (this.auth.isPreview()) return of([{ id: 'r1', name: 'ADMIN' }, { id: 'r2', name: 'STUDENT' }, { id: 'r3', name: 'TEACHER' }]);
    return this.http.get<RoleResponse[]>(`${environment.apiUrl}/roles`);
  }

  create(payload: CreateUserPayload): Observable<UserSummary> {
    if (this.auth.isPreview()) {
      const user: UserSummary = { id: crypto.randomUUID(), email: payload.email, firstName: payload.firstName, lastName: payload.lastName, roles: payload.roles, enabled: true, studentNumber: payload.studentNumber ?? undefined, employeeNumber: payload.employeeNumber ?? undefined, createdAt: new Date().toISOString(), studentId: payload.roles.includes('STUDENT') ? crypto.randomUUID() : undefined, teacherId: payload.roles.includes('TEACHER') ? crypto.randomUUID() : undefined };
      this.previewUsers.update(users => [user, ...users]);
      return of(user);
    }
    return this.http.post<UserSummary>(`${environment.apiUrl}/users`, payload);
  }

  update(id: string, payload: UpdateUserPayload): Observable<UserSummary> {
    if (this.auth.isPreview()) {
      const existing = this.previewUsers().find(user => user.id === id)!;
      const updated: UserSummary = { ...existing, email: payload.email, firstName: payload.firstName, lastName: payload.lastName, roles: payload.roles, enabled: payload.enabled, studentNumber: payload.studentNumber ?? undefined, employeeNumber: payload.employeeNumber ?? undefined, updatedAt: new Date().toISOString() };
      this.previewUsers.update(users => users.map(user => user.id === id ? updated : user));
      return of(updated);
    }
    return this.http.put<UserSummary>(`${environment.apiUrl}/users/${id}`, payload);
  }

  delete(id: string): Observable<void> {
    if (this.auth.isPreview()) {
      this.previewUsers.update(users => users.filter(user => user.id !== id));
      return of(undefined);
    }
    return this.http.delete<void>(`${environment.apiUrl}/users/${id}`);
  }
}
