import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, of, switchMap, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, CurrentUser, Role } from '../models/api.models';

const ACCESS_KEY = 'sam_access_token';
const REFRESH_KEY = 'sam_refresh_token';
const USER_KEY = 'sam_current_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly _user = signal<CurrentUser | null>(this.readUser());

  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => !!this.accessToken && !!this._user());
  readonly primaryRole = computed<Role | null>(() => {
    const roles = this._user()?.roles ?? [];
    return roles.includes('ADMIN') ? 'ADMIN' : roles.includes('TEACHER') ? 'TEACHER' : roles.includes('STUDENT') ? 'STUDENT' : null;
  });

  get accessToken(): string | null { return localStorage.getItem(ACCESS_KEY); }
  get refreshToken(): string | null { return localStorage.getItem(REFRESH_KEY); }

  login(email: string, password: string): Observable<CurrentUser> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, { email, password }).pipe(
      tap(tokens => this.storeTokens(tokens)),
      switchMap(() => this.http.get<CurrentUser>(`${environment.apiUrl}/me`)),
      tap(user => this.storeUser(user)),
    );
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

  hasRole(role: Role): boolean { return this._user()?.roles.includes(role) ?? false; }
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
}
