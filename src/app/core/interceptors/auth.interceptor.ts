import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { BehaviorSubject, catchError, filter, switchMap, take, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../../shared/components/toast/toast.service';

let refreshing = false;
const refreshDone$ = new BehaviorSubject<boolean>(false);

const PUBLIC_PATTERNS: RegExp[] = [
  /\/auth\/(login|signup|google|refresh)$/,
  /\/games(\?.*)?$/,
  /\/quests(\?.*)?$/,
  /\/lore(\?.*)?$/,
];

function isPublic(url: string): boolean {
  return PUBLIC_PATTERNS.some((p) => p.test(url));
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const toast = inject(ToastService);

  const addBearer = (token: string) =>
    req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });

  const token = auth.getAccessToken();
  const authedReq = token && !isPublic(req.url) ? addBearer(token) : req;

  return next(authedReq).pipe(
    catchError((err: HttpErrorResponse) => {
      // Don't try to refresh on the refresh call itself, or for non-401 errors
      const hasRefreshToken = !!localStorage.getItem('sg_refresh_token');
      if (err.status !== 401 || req.url.includes('/auth/refresh') || !hasRefreshToken) {
        return throwError(() => err);
      }

      if (refreshing) {
        // Another request already triggered a refresh — wait for it, then retry
        return refreshDone$.pipe(
          filter((done) => done),
          take(1),
          switchMap(() => {
            const fresh = auth.getAccessToken();
            return next(fresh ? addBearer(fresh) : req);
          }),
        );
      }

      refreshing = true;
      refreshDone$.next(false);

      return auth.refresh().pipe(
        catchError((refreshErr) => {
          refreshing = false;
          refreshDone$.next(false);
          toast.error('Sessão expirada', 'Faça login novamente para continuar.');
          auth.logout();
          return throwError(() => refreshErr);
        }),
        switchMap((tokens) => {
          auth.saveTokens(tokens);
          refreshing = false;
          refreshDone$.next(true);
          return next(addBearer(tokens.accessToken));
        }),
      );
    }),
  );
};
