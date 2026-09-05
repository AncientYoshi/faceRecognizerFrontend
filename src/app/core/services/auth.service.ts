import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  EMPTY,
  Observable,
  catchError,
  concat,
  finalize,
  of,
  shareReplay,
  switchMap,
  tap,
  throwError,
} from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AuthResponse,
  CurrentUser,
  PublicDepartment,
  RegisterUserPayload,
  RegisterUserResponse,
  Role,
} from '../models/api.models';

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
  private authStorage = this.initialAuthStorage();
  private readonly _user = signal<CurrentUser | null>(this.readUser());
  private departmentCache = this.readDepartments();
  private departmentRefresh$: Observable<PublicDepartment[]> | null = null;

  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => !!this.accessToken && !!this._user());
  readonly primaryRole = computed<Role | null>(() => this.roleOf(this._user()));

  get accessToken(): string | null {
    return this.authStorage.getItem(ACCESS_KEY);
  }
  get refreshToken(): string | null {
    return this.authStorage.getItem(REFRESH_KEY);
  }

  login(email: string, password: string, rememberMe = false): Observable<CurrentUser> {
    let tokensStored = false;
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/login`, { email, password })
      .pipe(
        tap((tokens) => {
          this.storeTokens(tokens, rememberMe);
          tokensStored = true;
        }),
        switchMap((tokens) => {
          const provisionalUser = this.userFromAccessToken(tokens.accessToken, email);
          if (!provisionalUser) return this.fetchCurrentUser();

          this.storeUser(provisionalUser);
          this.refreshCurrentUserInBackground();
          return of(provisionalUser);
        }),
        catchError((error) => {
          if (tokensStored) this.clearAuthentication();
          return throwError(() => error);
        }),
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
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/refresh`, { refreshToken: this.refreshToken })
      .pipe(tap((tokens) => this.storeTokens(tokens)));
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
    this.selectAuthStorage(true);
    this.authStorage.setItem(ACCESS_KEY, 'preview-token');
    this.storeUser(user);
    const path =
      role === 'ADMIN'
        ? '/admin/dashboard'
        : role === 'TEACHER'
          ? '/admin/teacher-dashboard'
          : '/student/dashboard';
    this.router.navigateByUrl(path);
  }

  logout(): void {
    const refreshToken = this.refreshToken;
    const finish = () => this.expireSession();
    if (refreshToken && this.accessToken !== 'preview-token') {
      this.http
        .post(`${environment.apiUrl}/auth/logout`, { refreshToken })
        .subscribe({ next: finish, error: finish });
    } else {
      finish();
    }
  }

  expireSession(): void {
    this.clearAuthentication();
    this.router.navigateByUrl('/login');
  }

  private clearAuthentication(): void {
    this.clearAuthStorage(localStorage);
    this.clearAuthStorage(sessionStorage);
    this._user.set(null);
  }

  roleOf(user: Pick<CurrentUser, 'roles'> | null | undefined): Role | null {
    if (!user) return null;
    return user.roles.includes('ADMIN') ? 'ADMIN' : (user.roles[0] ?? null);
  }

  homeFor(role = this.primaryRole()): string {
    return role === 'ADMIN'
      ? '/admin/dashboard'
      : role === 'TEACHER'
        ? '/admin/teacher-dashboard'
        : '/student/dashboard';
  }

  hasRole(role: Role): boolean {
    return this.primaryRole() === role;
  }
  isPreview(): boolean {
    return this.accessToken === 'preview-token';
  }

  private storeTokens(tokens: AuthResponse, rememberMe?: boolean): void {
    if (rememberMe !== undefined) this.selectAuthStorage(rememberMe);
    this.authStorage.setItem(ACCESS_KEY, tokens.accessToken);
    this.authStorage.setItem(REFRESH_KEY, tokens.refreshToken);
  }

  private storeUser(user: CurrentUser): void {
    this.authStorage.setItem(USER_KEY, JSON.stringify(user));
    this._user.set(user);
  }

  private fetchCurrentUser(): Observable<CurrentUser> {
    return this.http
      .get<CurrentUser>(`${environment.apiUrl}/me`)
      .pipe(tap((user) => this.storeUser(user)));
  }

  private refreshCurrentUserInBackground(): void {
    const sessionToken = this.accessToken;
    this.http.get<CurrentUser>(`${environment.apiUrl}/me`).subscribe({
      next: (user) => {
        if (this.accessToken === sessionToken) this.storeUser(user);
      },
      error: () => {
        // The access token already establishes the session. API authorization
        // failures are handled centrally by the HTTP error interceptor.
      },
    });
  }

  private userFromAccessToken(accessToken: string, fallbackEmail: string): CurrentUser | null {
    try {
      const encodedPayload = accessToken.split('.')[1];
      if (!encodedPayload) return null;

      const normalized = encodedPayload.replaceAll('-', '+').replaceAll('_', '/');
      const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
      const payload = JSON.parse(atob(padded)) as {
        sub?: string;
        email?: string;
        roles?: unknown;
        iat?: number;
      };
      const roles = Array.isArray(payload.roles)
        ? payload.roles.filter(
            (role): role is Role => role === 'ADMIN' || role === 'TEACHER' || role === 'STUDENT',
          )
        : [];
      if (!payload.sub || !roles.length) return null;

      const email = payload.email || fallbackEmail;
      const nameParts = email
        .split('@')[0]
        .split(/[._-]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1));

      return {
        id: payload.sub,
        email,
        firstName: nameParts[0] || 'User',
        lastName: nameParts.slice(1).join(' '),
        enabled: true,
        roles,
        createdAt: new Date((payload.iat || Date.now() / 1000) * 1000).toISOString(),
      };
    } catch {
      return null;
    }
  }

  private readUser(): CurrentUser | null {
    try {
      return JSON.parse(this.authStorage.getItem(USER_KEY) || 'null');
    } catch {
      return null;
    }
  }

  private initialAuthStorage(): Storage {
    return sessionStorage.getItem(ACCESS_KEY) ? sessionStorage : localStorage;
  }

  private selectAuthStorage(rememberMe: boolean): void {
    this.clearAuthStorage(localStorage);
    this.clearAuthStorage(sessionStorage);
    this.authStorage = rememberMe ? localStorage : sessionStorage;
  }

  private clearAuthStorage(storage: Storage): void {
    storage.removeItem(ACCESS_KEY);
    storage.removeItem(REFRESH_KEY);
    storage.removeItem(USER_KEY);
  }

  private refreshDepartments(): Observable<PublicDepartment[]> {
    if (this.departmentRefresh$) return this.departmentRefresh$;
    this.departmentRefresh$ = this.http
      .get<PublicDepartment[]>(`${environment.apiUrl}/public/departments`)
      .pipe(
        tap((departments) => this.storeDepartments(departments)),
        finalize(() => (this.departmentRefresh$ = null)),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    return this.departmentRefresh$;
  }

  private storeDepartments(departments: PublicDepartment[]): void {
    this.departmentCache = departments;
    try {
      const cache: PublicDepartmentCache = { savedAt: new Date().toISOString(), departments };
      localStorage.setItem(DEPARTMENTS_KEY, JSON.stringify(cache));
    } catch {
      /* Browsers may disable storage; the in-memory cache still works. */
    }
  }

  private readDepartments(): PublicDepartment[] | null {
    try {
      const cache = JSON.parse(
        localStorage.getItem(DEPARTMENTS_KEY) || 'null',
      ) as PublicDepartmentCache | null;
      if (!cache || !Array.isArray(cache.departments)) return null;
      const valid = cache.departments.every(
        (department) =>
          typeof department?.id === 'string' &&
          typeof department?.code === 'string' &&
          typeof department?.name === 'string',
      );
      return valid ? cache.departments : null;
    } catch {
      return null;
    }
  }
}
