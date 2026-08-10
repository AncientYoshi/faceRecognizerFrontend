import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Role } from '../models/api.models';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isAuthenticated() ? true : inject(Router).createUrlTree(['/login']);
};

export const roleGuard: CanActivateFn = route => {
  const auth = inject(AuthService);
  const roles = (route.data['roles'] ?? []) as Role[];
  if (!auth.isAuthenticated()) return inject(Router).createUrlTree(['/login']);
  if (roles.some(role => auth.hasRole(role))) return true;
  const fallback = auth.hasRole('ADMIN')
    ? '/admin/dashboard'
    : auth.hasRole('TEACHER')
      ? '/admin/teacher-dashboard'
      : '/student/dashboard';
  return inject(Router).createUrlTree([fallback]);
};
