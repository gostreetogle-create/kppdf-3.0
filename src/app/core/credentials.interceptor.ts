import { HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';

/** Отправлять cookies (httpOnly JWT) на API */
export function credentialsInterceptor(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> {
  if (req.url.includes('/api/') && !req.withCredentials) {
    return next(req.clone({ withCredentials: true }));
  }
  return next(req);
}
