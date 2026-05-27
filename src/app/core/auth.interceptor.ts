import { inject } from '@angular/core';
import { HttpRequest, HttpHandlerFn, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, switchMap, catchError, BehaviorSubject, take } from 'rxjs';
import { AuthService } from './auth.service';

/** Флаг: идёт ли сейчас refresh */
let isRefreshing = false;

/** Очередь запросов, ожидающих refresh */
const refreshQueue = new BehaviorSubject<boolean | null>(null);

/**
 * Auth interceptor — JWT в httpOnly cookies (withCredentials через credentialsInterceptor).
 * При 401 пытается обновить сессию через /auth/refresh.
 */
export function authInterceptor(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> {
  const auth = inject(AuthService);

  if (req.url.includes('/auth/')) {
    return next(req);
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401) {
        return throwError(() => error);
      }

      if (isRefreshing) {
        return waitForRefresh(req, next, refreshQueue);
      }

      isRefreshing = true;
      refreshQueue.next(null);

      return auth.refresh().pipe(
        switchMap((user) => {
          isRefreshing = false;
          if (user) {
            refreshQueue.next(true);
            return next(req);
          }
          refreshQueue.next(false);
          auth.logout();
          return throwError(() => error);
        }),
        catchError((refreshError) => {
          isRefreshing = false;
          refreshQueue.next(false);
          auth.logout();
          return throwError(() => refreshError);
        }),
      );
    }),
  );
}

function waitForRefresh(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  queue: BehaviorSubject<boolean | null>,
): Observable<HttpEvent<unknown>> {
  return queue.pipe(
    take(1),
    switchMap((ok) => {
      if (ok) {
        return next(req);
      }
      return throwError(() => new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' }));
    }),
  );
}
