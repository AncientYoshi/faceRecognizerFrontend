import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { EMPTY, Observable, catchError, concat, finalize, of, shareReplay, switchMap, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, CurrentUser, PublicDepartment, RegisterUserPayload, RegisterUserResponse, Role } from '../models/api.models';

const ACCESS_KEY = 'sam_access_token';
const REFRESH_KEY = 'sam_refresh_token';
const USER_KEY = 'sam_current_user';
const DEPARTMENTS_KEY = 'sam_public_departments_v1';

interface PublicDepartmentCache {
  savedAt: string;
  departments: PublicDepartment[];
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly _user = signal<CurrentUser | null>(this.readUser());
  private departmentCache = this.readDepartments();
  private departmentRefresh$: Observable<PublicDepartment[]> | null = null;

  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => !!this.accessToken && !!this._user());
  readonly primaryRole = computed<Role | null>(() => this.roleOf(this._user()));

  get accessToken(): string | null { return localStorage.getItem(ACCESS_KEY); }
  get refreshToken(): string | null { return localStorage.getItem(REFRESH_KEY); }

  login(email: string, password: string): Observable<CurrentUser> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, { email, password }).pipe(
      tap(tokens => this.storeTokens(tokens)),
      switchMap(() => this.http.get<CurrentUser>(`${environment.apiUrl}/me`)),
      tap(user => this.storeUser(user)),
    );
  }

  register(payload: RegisterUserPayload): Observable<RegisterUserResponse> {
    return this.http.post<RegisterUserResponse>(`${environment.apiUrl}/auth/register`, payload);
  }

  publicDepartments(): Observable<PublicDepartment[]> {
    const refresh = this.refreshDepartments();
    return this.departmentCache
      ? concat(of(this.departmentCache), refresh.pipe(catchError(() => EMPTY)))
      : refresh;
  }

  refresh(): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/refresh`, { refreshToken: this.refreshToken }).pipe(
      tap(tokens => this.storeTokens(tokens)),
    );
  }

  /** Enables UI review when the backend is not running. It never creates an API token. */
  enterPreview(role: Role): void {
    const user: CurrentUser = {
      id: `preview-${role.toLowerCase()}`,
      email: `${role.toLowerCase()}@sam.edu`,
      firstName: role === 'ADMIN' ? 'Alex' : role === 'TEACHER' ? 'John' : 'Mia',
      lastName: role === 'ADMIN' ? 'Morgan' : role === 'TEACHER' ? 'Smith' : 'Anderson',
      enabled: true,
      roles: [role],
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem(ACCESS_KEY, 'preview-token');
    this.storeUser(user);
    const path = role === 'ADMIN' ? '/admin/dashboard' : role === 'TEACHER' ? '/admin/teacher-dashboard' : '/student/dashboard';
    this.router.navigateByUrl(path);
  }

  logout(): void {
    const refreshToken = this.refreshToken;
    const finish = () => this.expireSession();
    if (refreshToken && this.accessToken !== 'preview-token') {
      this.http.post(`${environment.apiUrl}/auth/logout`, { refreshToken }).subscribe({ next: finish, error: finish });
    } else {
      finish();
    }
  }


  expireSession(): void {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    this._user.set(null);
    this.router.navigateByUrl('/login');
  }

  roleOf(user: Pick<CurrentUser, 'roles'> | null | undefined): Role | null {
    if (!user) return null;
    return user.roles.includes('ADMIN') ? 'ADMIN' : user.roles[0] ?? null;
  }

  homeFor(role = this.primaryRole()): string {
    return role === 'ADMIN' ? '/admin/dashboard' : role === 'TEACHER' ? '/admin/teacher-dashboard' : '/student/dashboard';
  }

  hasRole(role: Role): boolean { return this.primaryRole() === role; }
  isPreview(): boolean { return this.accessToken === 'preview-token'; }

  private storeTokens(tokens: AuthResponse): void {
    localStorage.setItem(ACCESS_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
  }

  private storeUser(user: CurrentUser): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this._user.set(user);
  }

  private readUser(): CurrentUser | null {
    try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); }
    catch { return null; }
  }

  private refreshDepartments(): Observable<PublicDepartment[]> {
    if (this.departmentRefresh$) return this.departmentRefresh$;
    this.departmentRefresh$ = this.http.get<PublicDepartment[]>(`${environment.apiUrl}/public/departments`).pipe(
      tap(departments => this.storeDepartments(departments)),
      finalize(() => this.departmentRefresh$ = null),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.departmentRefresh$;
  }

  private storeDepartments(departments: PublicDepartment[]): void {
    this.departmentCache = departments;
    try {
      const cache: PublicDepartmentCache = { savedAt: new Date().toISOString(), departments };
      localStorage.setItem(DEPARTMENTS_KEY, JSON.stringify(cache));
    } catch { /* Browsers may disable storage; the in-memory cache still works. */ }
  }

  private readDepartments(): PublicDepartment[] | null {
    try {
      const cache = JSON.parse(localStorage.getItem(DEPARTMENTS_KEY) || 'null') as PublicDepartmentCache | null;
      if (!cache || !Array.isArray(cache.departments)) return null;
      const valid = cache.departments.every(department =>
        typeof department?.id === 'string' &&
        typeof department?.code === 'string' &&
        typeof department?.name === 'string'
      );
      return valid ? cache.departments : null;
    } catch {
      return null;
    }
  }
}
