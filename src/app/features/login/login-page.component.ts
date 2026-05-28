import { Component, inject, ChangeDetectionStrategy, ChangeDetectorRef, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { AuthService } from '../../core/auth.service';
import { KpInputComponent, KpPasswordComponent, KpButtonComponent, KpToastComponent } from '../../shared/ui';

@Component({
  selector: 'app-login-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, KpInputComponent, KpPasswordComponent, KpButtonComponent, KpToastComponent],
  template: `
    <div class="auth">
      <div class="auth__brand">
        <div class="auth__brand-bg"></div>
        <div class="auth__brand-content">
          <div class="auth__brand-logo">K</div>
          <h1 class="auth__brand-title">KPPDF 3.0</h1>
          <p class="auth__brand-subtitle">Платформа управления производством</p>
          <p class="auth__brand-desc">
            Контроль процессов, смен, заданий<br class="auth__br-desktop">
            и производственных показателей<br class="auth__br-desktop">
            в едином контуре.
          </p>
          <div class="auth__brand-chips">
            <span class="auth__chip">Техпроцессы</span>
            <span class="auth__chip">BOM-деревья</span>
            <span class="auth__chip">Себестоимость</span>
            <span class="auth__chip">Наряды</span>
          </div>
        </div>
      </div>

      <div class="auth__card-wrap">
        <div class="auth__card">
          <div class="auth__card-header">
            <div class="auth__card-logo">K</div>
            <h2 class="auth__card-title">KPPDF 3.0</h2>
            <p class="auth__card-subtitle">Платформа управления производством</p>
          </div>

          <form class="auth__form" (ngSubmit)="doLogin()" novalidate>
            <app-kp-input
              label="Логин"
              name="username"
              [value]="username"
              (valueChange)="onUsernameChange($event)"
              placeholder="Введите логин"
              [disabled]="loading"
              [autofocus]="true"
              [error]="usernameError()"
            />
            <app-kp-password
              label="Пароль"
              name="password"
              [value]="password"
              (valueChange)="onPasswordChange($event)"
              placeholder="Введите пароль"
              [toggleMask]="true"
              [disabled]="loading"
              [error]="passwordError()"
            />
            <app-kp-button
              type="submit"
              label="Войти"
              size="small"
              [loading]="loading"
              [block]="true"
              styleClass="auth__submit-btn"
              (buttonClick)="doLogin()"
            />
          </form>

          <div class="auth__hint">
            <span class="auth__hint-icon">&#x27F3;</span>
            <span>Демо-доступ: <strong>admin</strong> / <strong>admin123</strong></span>
          </div>
        </div>
      </div>
    </div>
    <app-kp-toast position="top-right" />
  `,
  styleUrl: './login-page.component.scss',
})
export class LoginPageComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  username = 'admin';
  password = 'admin123';
  loading = false;

  readonly usernameError = signal('');
  readonly passwordError = signal('');

  onUsernameChange(value: string): void {
    this.username = value;
    this.usernameError.set('');
  }

  onPasswordChange(value: string): void {
    this.password = value;
    this.passwordError.set('');
  }

  doLogin(): void {
    if (this.loading) return;

    this.usernameError.set('');
    this.passwordError.set('');

    if (!this.username.trim()) {
      this.usernameError.set('Введите логин');
    }
    if (!this.password) {
      this.passwordError.set('Введите пароль');
    }
    if (this.usernameError() || this.passwordError()) {
      this.messageService.add({ severity: 'warn', summary: 'Заполните поля', life: 3000 });
      this.cdr.markForCheck();
      return;
    }

    this.loading = true;
    this.cdr.markForCheck();
    this.auth
      .login({ username: this.username, password: this.password })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: () => {
        void this.router.navigate(['/dashboard']);
      },
      error: (err: { error?: { error?: string } }) => {
        this.loading = false;
        this.usernameError.set('Проверьте логин');
        this.passwordError.set('Проверьте пароль');
        this.cdr.markForCheck();
        const msg = err.error?.error || 'Ошибка входа';
        this.messageService.add({ severity: 'error', summary: msg, life: 4000 });
      },
      complete: () => {
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }
}
