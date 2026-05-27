import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { KpButtonComponent } from '../../shared/ui';

@Component({
  selector: 'app-not-found-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [KpButtonComponent],
  template: `
    <div class="not-found">
      <h1 class="not-found__code" aria-hidden="true">404</h1>
      <h2 class="not-found__title">Страница не найдена</h2>
      <p class="not-found__desc">
        Запрашиваемая страница не существует или была перемещена.
      </p>
      <app-kp-button
        label="На главную"
        icon="pi pi-home"
        size="small"
        (buttonClick)="goHome()"
      />
    </div>
  `,
  styleUrl: './not-found-page.component.scss',
})
export class NotFoundPageComponent {
  private readonly router = inject(Router);

  goHome(): void {
    void this.router.navigate(['/']);
  }
}
