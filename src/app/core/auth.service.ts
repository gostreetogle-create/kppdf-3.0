import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, of, map, catchError, firstValueFrom } from 'rxjs';
import { environment } from '@env/environment';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthUser {
  userId: string;
  username: string;
  role: string;
  permissions: string[];
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly baseUrl = `${environment.apiUrl}/auth`;

  /** Текущий пользователь (токены — только в httpOnly cookies) */
  private readonly currentUser = signal<AuthUser | null>(null);

  /** Реактивный сигнал с правами текущего пользователя */
  readonly permissions = signal<string[]>([]);

  /** Login — cookies устанавливает сервер */
  login(credentials: LoginRequest): Observable<AuthUser> {
    return this.http
      .post<{ success: boolean; data: AuthUser }>(`${this.baseUrl}/login`, credentials)
      .pipe(
        map((res) => res.data),
        tap((user) => this.setUser(user)),
      );
  }

  /** Refresh — refresh cookie отправляется автоматически */
  refresh(): Observable<AuthUser | null> {
    return this.http
      .post<{ success: boolean; data: AuthUser }>(`${this.baseUrl}/refresh`, {})
      .pipe(
        map((res) => res.data),
        tap((user) => this.setUser(user)),
        catchError(() => {
          this.clearSession();
          return of(null);
        }),
      );
  }

  /** Выход — сервер очищает cookies */
  logout(): void {
    this.clearSession();
    this.router.navigate(['/login']);
    this.http.post(`${this.baseUrl}/logout`, {}).subscribe({ error: () => { /* noop */ } });
  }

  /** Загрузить профиль текущего пользователя */
  fetchMe(): Observable<AuthUser> {
    return this.http
      .get<{ success: boolean; data: AuthUser }>(`${this.baseUrl}/me`)
      .pipe(
        map((res) => res.data),
        tap((user) => this.setUser(user)),
      );
  }

  /** Получить информацию о пользователе */
  getUser(): AuthUser | null {
    return this.currentUser();
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
      if (perm === '*') return true;
      if (perm === required) return true;
      if (perm.endsWith('.*')) {
        const prefix = perm.slice(0, -2);
        if (required.startsWith(prefix + '.')) return true;
      }
      if (perm.startsWith('*.')) {
        const action = perm.slice(1);
        if (required.endsWith(action)) return true;
      }
    }
    return false;
  }

  /**
   * Инициализация сессии при старте приложения.
   * Вызывается через APP_INITIALIZER до монтирования роутера.
   */
  async initializeAuth(): Promise<void> {
    try {
      await firstValueFrom(this.fetchMe());
    } catch {
      const user = await firstValueFrom(this.refresh());
      if (!user) {
        this.clearSession();
      }
    }
  }

  /** Проверить, авторизован ли пользователь */
  isAuthenticated(): boolean {
    return this.currentUser() !== null;
  }

  private setUser(user: AuthUser): void {
    this.currentUser.set(user);
    this.permissions.set(user.permissions ?? []);
  }

  private clearSession(): void {
    this.currentUser.set(null);
    this.permissions.set([]);
  }
}
