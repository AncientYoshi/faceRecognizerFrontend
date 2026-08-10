import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, catchError, finalize, shareReplay, switchMap, throwError } from 'rxjs';
import { AuthResponse } from '../models/api.models';
import { AuthService } from '../services/auth.service';

let refreshRequest: Observable<AuthResponse> | null = null;

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const token = auth.accessToken;
  if (!token || token === 'preview-token' || request.url.includes('/auth/login') || request.url.includes('/auth/refresh')) {
    return next(request);
  }
  return next(request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};

export const errorInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  return next(request).pipe(catchError((error: HttpErrorResponse) => {
    const authRequest=request.url.includes('/auth/login')||request.url.includes('/auth/refresh')||request.url.includes('/auth/logout');
    if (error.status === 401 && !authRequest && auth.refreshToken && !auth.isPreview()) {
      refreshRequest ??= auth.refresh().pipe(finalize(()=>refreshRequest=null),shareReplay(1));
      return refreshRequest.pipe(
        switchMap(tokens=>next(request.clone({setHeaders:{Authorization:`Bearer ${tokens.accessToken}`}}))),
        catchError(refreshError=>{auth.expireSession();return throwError(()=>refreshError)}),
      );
    }
    if(error.status===401&&!authRequest){
      auth.expireSession();
    }
    return throwError(() => error);
  }));
};
