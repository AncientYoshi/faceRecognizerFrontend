import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { CurrentUser, Role } from '../../../core/models/api.models';
import { AuthService } from '../../../core/services/auth.service';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  const user: CurrentUser = {
    id: 'student-1',
    email: 'student@example.edu',
    firstName: 'Paing',
    lastName: 'Swan',
    enabled: true,
    roles: ['STUDENT'],
    createdAt: '2026-09-05T00:00:00Z',
  };
  const auth = {
    login: vi.fn<() => Observable<CurrentUser>>(),
    homeFor: vi.fn(() => '/student/dashboard'),
    roleOf: vi.fn(() => 'STUDENT' as Role),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    });
  });

  it('keeps the form busy until portal navigation finishes and ignores duplicate submits', async () => {
    let finishNavigation!: (opened: boolean) => void;
    const navigation = new Promise<boolean>((resolve) => (finishNavigation = resolve));
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockReturnValue(navigation);
    auth.login.mockReturnValue(of(user));

    const fixture = TestBed.createComponent(LoginComponent);
    const component = fixture.componentInstance;
    component.form.setValue({
      email: 'student@example.edu',
      password: 'secret',
      rememberMe: false,
    });

    component.submit();
    component.submit();

    expect(auth.login).toHaveBeenCalledTimes(1);
    expect(component.loading()).toBe(true);
    expect(component.loadingLabel()).toBe('Opening portal…');

    finishNavigation(true);
    await navigation;
    await Promise.resolve();

    expect(component.loading()).toBe(false);
    expect(component.error()).toBe('');
  });
});
