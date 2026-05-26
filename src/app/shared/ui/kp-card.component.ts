import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-kp-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="kp-card">
      <ng-content />
    </div>
  `,
  styleUrl: './kp-card.component.scss',
})
export class KpCardComponent {}
