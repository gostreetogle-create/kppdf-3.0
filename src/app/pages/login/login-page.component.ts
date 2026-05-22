import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [RouterLink, InputTextModule, PasswordModule, ButtonModule, CardModule, FormsModule, ToastModule],
  providers: [MessageService],
  template: `
    <div class="login">
      <p-card header="KPPDF 3.0" subheader="Платформа управления производством">
        <div class="login__form">
          <div class="login__field">
            <label for="username">Логин</label>
            <input
              pInputText
              id="username"
              [(ngModel)]="username"
              placeholder="admin"
              (keyup.enter)="doLogin()"
              [disabled]="loading"
            />
          </div>
          <div class="login__field">
            <label for="password">Пароль</label>
            <p-password
              id="password"
              [(ngModel)]="password"
              [feedback]="false"
              [disabled]="loading"
              (keyup.enter)="doLogin()"
            />
          </div>
          <p-button
            label="Войти"
            icon="pi pi-sign-in"
            styleClass="w-full"
            (click)="doLogin()"
            [loading]="loading"
          />
        </div>
        <div class="login__hint">
          <p>Демо: <strong>admin</strong> / <strong>admin123</strong></p>
        </div>
      </p-card>
    </div>
    <p-toast position="top-center" />
  `,
  styles: [`
    .login {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: var(--color-bg);

      &__form {
        display: flex;
        flex-direction: column;
        gap: var(--space-md);
      }

      &__field {
        display: flex;
        flex-direction: column;
        gap: var(--space-xs);
        label { font-size: 13px; font-weight: 500; color: var(--color-text-secondary); }
      }

      &__hint {
        margin-top: var(--space-md);
        text-align: center;
        font-size: 12px;
        color: var(--color-text-secondary);
        p { margin: 0; }
      }
    }
  `]
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
