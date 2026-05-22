import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, of, map } from 'rxjs';
import { environment } from '@env/environment';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface TokensPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  userId: string;
  username: string;
  role: string;
}

const ACCESS_KEY = 'kppdf_access_token';
const REFRESH_KEY = 'kppdf_refresh_token';
const USER_KEY = 'kppdf_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly baseUrl = `${environment.apiUrl}/auth`;

  /** Login — получает токены и сохраняет */
  login(credentials: LoginRequest): Observable<TokensPair> {
    return this.http
      .post<{ success: boolean; data: TokensPair }>(`${this.baseUrl}/login`, credentials)
      .pipe(
        map((res) => res.data),
        tap((tokens) => this.saveTokens(tokens)),
      );
  }

  /** Refresh — обновляет access-токен */
  refresh(): Observable<TokensPair | null> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return of(null);

    return this.http
      .post<{ success: boolean; data: TokensPair }>(`${this.baseUrl}/refresh`, { refreshToken })
      .pipe(
        map((res) => res.data),
        tap({
          next: (tokens) => this.saveTokens(tokens),
          error: () => this.logout(),
        }),
      );
  }

  /** Выход */
  logout(): void {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    this.router.navigate(['/login']);
  }

  /** Сохранить токены в localStorage */
  saveTokens(tokens: TokensPair): void {
    localStorage.setItem(ACCESS_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_KEY, tokens.refreshToken);

    // Декодируем payload из access-токена
    const payload = this.decodeToken(tokens.accessToken);
    if (payload) {
      localStorage.setItem(
        USER_KEY,
        JSON.stringify({
          userId: payload.userId,
          username: payload.username,
          role: payload.role,
        }),
      );
    }
  }

  /** Получить access-токен */
  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_KEY);
  }

  /** Получить refresh-токен */
  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  }

  /** Получить информацию о пользователе */
  getUser(): AuthUser | null {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  }

  /** Проверить, авторизован ли пользователь */
  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  /** Декодировать JWT payload (без проверки подписи) */
  private decodeToken(token: string): { userId: string; username: string; role: string } | null {
    try {
      const payload = token.split('.')[1];
      return JSON.parse(atob(payload));
    } catch {
      return null;
    }
  }
}
