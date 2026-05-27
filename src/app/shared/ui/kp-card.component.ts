import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-kp-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="kp-card">
      <div class="kp-card__header">
        <ng-content select="[kpCardHeader]" />
      </div>
      <div class="kp-card__body">
        <ng-content />
      </div>
      <div class="kp-card__footer">
        <ng-content select="[kpCardFooter]" />
      </div>
    </div>
  `,
  styleUrl: './kp-card.component.scss',
})
export class KpCardComponent {}
