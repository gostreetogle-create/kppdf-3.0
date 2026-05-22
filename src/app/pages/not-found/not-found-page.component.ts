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
  styleUrl: './not-found-page.component.scss',
})
export class NotFoundPageComponent {}
