import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [InputTextModule, PasswordModule, ButtonModule, FormsModule, ToastModule],
  template: `
    <div class="auth">
      <!-- ═══════ Brand Zone ═══════ -->
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

      <!-- ═══════ Auth Card Zone ═══════ -->
      <div class="auth__card-wrap">
        <div class="auth__card">
          <div class="auth__card-header">
            <div class="auth__card-logo">K</div>
            <h2 class="auth__card-title">KPPDF 3.0</h2>
            <p class="auth__card-subtitle">Платформа управления производством</p>
          </div>

          <form class="auth__form" (ngSubmit)="doLogin()" novalidate>
            <div class="auth__field">
              <label for="username" class="auth__label">Логин</label>
              <input
                pInputText
                id="username"
                name="username"
                [(ngModel)]="username"
                placeholder="admin"
                (keyup.enter)="doLogin()"
                [disabled]="loading"
                autocomplete="username"
              />
            </div>
            <div class="auth__field">
              <label class="auth__label">Пароль</label>
              <p-password
                name="password"
                [(ngModel)]="password"
                [feedback]="false"
                [disabled]="loading"
                (keyup.enter)="doLogin()"
                autocomplete="current-password"
              />
            </div>
            <p-button
              type="submit"
              label="Войти в систему"
              [loading]="loading"
              styleClass="auth__submit-btn"
            />
          </form>

          <div class="auth__hint">
            <span class="auth__hint-icon">&#x27F3;</span>
            <span>Демо-доступ: <strong>admin</strong> / <strong>admin123</strong></span>
          </div>
        </div>
      </div>
    </div>
    <p-toast position="top-center" />
  `,
  styleUrl: './login-page.component.scss',
})
export class LoginPageComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);

  username = 'admin';
  password = 'admin123';
  loading = false;

  doLogin(): void {
    if (!this.username || !this.password) {
      this.messageService.add({ severity: 'warn', summary: 'Заполните поля', life: 3000 });
      return;
    }

    this.loading = true;
    this.auth.login({ username: this.username, password: this.password }).subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        const msg = err.error?.error || 'Ошибка входа';
        this.messageService.add({ severity: 'error', summary: msg, life: 4000 });
      },
      complete: () => {
        this.loading = false;
      },
    });
  }
}
