import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-not-found-page',
  standalone: true,
  imports: [RouterLink, ButtonModule],
  template: `
    <div class="not-found">
      <div class="not-found__content">
        <h1 class="not-found__code">404</h1>
        <h2 class="not-found__title">Страница не найдена</h2>
        <p class="not-found__desc">
          Запрашиваемая страница не существует или была перемещена.
        </p>
        <p-button label="На главную" icon="pi pi-home" routerLink="/" />
      </div>
    </div>
  `,
  styles: [`
    .not-found {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: var(--color-bg);

      &__content {
        text-align: center;
      }

      &__code {
        font-size: 6rem;
        font-weight: 800;
        color: var(--color-primary);
        line-height: 1;
        margin-bottom: var(--space-md);
      }

      &__title {
        font-size: 1.5rem;
        font-weight: 600;
        margin-bottom: var(--space-sm);
        color: var(--color-text);
      }

      &__desc {
        color: var(--color-text-secondary);
        margin-bottom: var(--space-lg);
        font-size: 1rem;
      }
    }
  `]
})
export class NotFoundPageComponent {}
