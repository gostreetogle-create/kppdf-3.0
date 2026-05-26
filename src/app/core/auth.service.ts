import { Injectable, inject, signal } from '@angular/core';
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
  permissions: string[];
}

const ACCESS_KEY = 'kppdf_access_token';
const REFRESH_KEY = 'kppdf_refresh_token';
const USER_KEY = 'kppdf_user';
const PERMISSIONS_KEY = 'kppdf_permissions';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly baseUrl = `${environment.apiUrl}/auth`;

  /** Реактивный сигнал с правами текущего пользователя */
  readonly permissions = signal<string[]>(this.loadPermissions());

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
    localStorage.removeItem(PERMISSIONS_KEY);
    this.permissions.set([]);
    this.router.navigate(['/login']);
  }

  /** Сохранить токены в localStorage */
  saveTokens(tokens: TokensPair): void {
    localStorage.setItem(ACCESS_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_KEY, tokens.refreshToken);

    // Декодируем payload из access-токена
    const payload = this.decodeToken(tokens.accessToken);
    if (payload && typeof payload === 'object') {
      const userId = String(payload['userId'] ?? '');
      const username = String(payload['username'] ?? '');
      const role = String(payload['role'] ?? '');
      localStorage.setItem(
        USER_KEY,
        JSON.stringify({ userId, username, role }),
      );
      // Сохраняем permissions отдельно + обновляем сигнал
      const perms = Array.isArray(payload['permissions']) ? (payload['permissions'] as string[]) : [];
      localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(perms));
      this.permissions.set(perms);
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
    if (!raw) return null;
    const user = JSON.parse(raw) as AuthUser;
    user.permissions = this.loadPermissions();
    return user;
  }

  /** Получить массив permissions */
  getPermissions(): string[] {
    return this.permissions();
  }

  /** Проверить, есть ли у пользователя конкретное разрешение */
  hasPermission(required: string): boolean {
    const perms = this.permissions();
    if (perms.length === 0) return false;

    for (const perm of perms) {
      // * = полный доступ
      if (perm === '*') return true;
      // Прямое совпадение
      if (perm === required) return true;
      // wildcard: office.* → office.tenders.view
      if (perm.endsWith('.*')) {
        const prefix = perm.slice(0, -2); // 'office'
        if (required.startsWith(prefix + '.')) return true;
      }
      // wildcard: *.view → office.tenders.view, production.boms.view
      if (perm.startsWith('*.')) {
        const action = perm.slice(1); // '.view'
        if (required.endsWith(action)) return true;
      }
    }
    return false;
  }

  /** Проверить, авторизован ли пользователь */
  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  /** Загрузить permissions из localStorage */
  private loadPermissions(): string[] {
    try {
      const raw = localStorage.getItem(PERMISSIONS_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  }

  /** Декодировать JWT payload (без проверки подписи) */
  private decodeToken(token: string): Record<string, unknown> | null {
    try {
      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload));
      return decoded && typeof decoded === 'object' ? (decoded as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }
}
