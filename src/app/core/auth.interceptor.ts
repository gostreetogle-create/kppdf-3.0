import { inject } from '@angular/core';
import { HttpRequest, HttpHandlerFn, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, switchMap, catchError, BehaviorSubject, of, take } from 'rxjs';
import { AuthService } from './auth.service';

/** Флаг: идёт ли сейчас refresh */
let isRefreshing = false;

/** Очередь запросов, ожидающих refresh */
const refreshQueue = new BehaviorSubject<string | null>(null);

/**
 * Функциональный AuthInterceptor (Angular 19).
 * - Добавляет Bearer-токен ко всем запросам, кроме /auth/.
 * - При 401 пытается обновить токен.
 * - Если refresh успешен — переотправляет все ожидающие запросы.
 * - Если refresh провален — logout.
 */
export function authInterceptor(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> {
  const auth = inject(AuthService);

  // Не перехватываем /auth/ запросы (login, refresh)
  if (req.url.includes('/auth/')) {
    return next(req);
  }

  // Добавляем токен
  const token = auth.getAccessToken();
  if (token) {
    req = addToken(req, token);
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401) {
        return throwError(() => error);
      }

      // Если refresh уже идёт — становимся в очередь
      if (isRefreshing) {
        return waitForRefresh(req, next, refreshQueue);
      }

      // Начинаем refresh
      isRefreshing = true;
      refreshQueue.next(null);

      return auth.refresh().pipe(
        switchMap((tokens) => {
          isRefreshing = false;
          if (tokens?.accessToken) {
            // Все ожидающие запросы получают новый токен
            refreshQueue.next(tokens.accessToken);
            return next(addToken(req, tokens.accessToken));
          }
          // Не удалось обновить — выход
          refreshQueue.next(null);
          auth.logout();
          return throwError(() => error);
        }),
        catchError((refreshError) => {
          isRefreshing = false;
          refreshQueue.next(null);
          auth.logout();
          return throwError(() => refreshError);
        }),
      );
    }),
  );
}

/** Добавить Bearer-токен к запросу */
function addToken(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

/** Дождаться завершения refresh-процесса и переотправить запрос */
function waitForRefresh(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  queue: BehaviorSubject<string | null>,
): Observable<HttpEvent<unknown>> {
  return queue.pipe(
    take(1),
    switchMap((newToken) => {
      if (newToken) {
        return next(addToken(req, newToken));
      }
      return throwError(() => new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' }));
    }),
  );
}
