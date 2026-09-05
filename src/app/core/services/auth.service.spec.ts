import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

describe('AuthService login', () => {
  let auth: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    vi.stubGlobal('localStorage', memoryStorage());
    vi.stubGlobal('sessionStorage', memoryStorage());
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: { navigateByUrl: vi.fn() } },
      ],
    });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http?.verify();
    vi.unstubAllGlobals();
  });

  it('establishes the session from the JWT without waiting for the profile request', () => {
    const received: string[] = [];
    auth.login('student@example.edu', 'secret').subscribe((user) => received.push(user.id));

    http.expectOne(`${environment.apiUrl}/auth/login`).flush({
      accessToken: token({
        sub: 'student-1',
        email: 'student@example.edu',
        roles: ['STUDENT'],
        iat: 1_788_537_600,
      }),
      refreshToken: 'refresh-token',
      tokenType: 'Bearer',
      expiresIn: 900,
    });

    expect(received).toEqual(['student-1']);
    expect(auth.isAuthenticated()).toBe(true);

    http.expectOne(`${environment.apiUrl}/me`).flush({
      id: 'student-1',
      email: 'student@example.edu',
      firstName: 'Paing',
      lastName: 'Swan',
      enabled: true,
      roles: ['STUDENT'],
      createdAt: '2026-09-05T00:00:00Z',
    });

    expect(auth.user()?.firstName).toBe('Paing');
  });

  it('clears partially stored tokens when the fallback profile request fails', () => {
    let failed = false;
    auth.login('student@example.edu', 'secret').subscribe({ error: () => (failed = true) });

    http.expectOne(`${environment.apiUrl}/auth/login`).flush({
      accessToken: 'not-a-jwt',
      refreshToken: 'refresh-token',
      tokenType: 'Bearer',
      expiresIn: 900,
    });
    http
      .expectOne(`${environment.apiUrl}/me`)
      .flush({ message: 'Unavailable' }, { status: 503, statusText: 'Unavailable' });

    expect(failed).toBe(true);
    expect(auth.accessToken).toBeNull();
    expect(auth.refreshToken).toBeNull();
    expect(auth.user()).toBeNull();
  });
});

function token(payload: object): string {
  return `header.${btoa(JSON.stringify(payload)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')}.signature`;
}

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => {
      values.delete(key);
    },
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}
