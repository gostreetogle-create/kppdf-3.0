import { Injectable, inject } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, switchMap, catchError } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private readonly auth = inject(AuthService);
  private isRefreshing = false;

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Не добавляем токен для auth-запросов (login, refresh)
    if (req.url.includes('/auth/')) {
      return next.handle(req);
    }

    const token = this.auth.getAccessToken();
    if (token) {
      req = this.addToken(req, token);
    }

    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401 && !this.isRefreshing) {
          this.isRefreshing = true;
          return this.auth.refresh().pipe(
            switchMap((tokens) => {
              this.isRefreshing = false;
              if (tokens) {
                return next.handle(this.addToken(req, tokens.accessToken));
              }
              this.auth.logout();
              return throwError(() => error);
            }),
            catchError(() => {
              this.isRefreshing = false;
              this.auth.logout();
              return throwError(() => error);
            }),
          );
        }
        return throwError(() => error);
      }),
    );
  }

  private addToken(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
    return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }
}
