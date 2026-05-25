import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [NgIf],
  template: `
    <div
      class="empty-state"
      [class.empty-state--compact]="compact()"
      [class.empty-state--muted]="tone() === 'muted'"
    >
      <ng-content select="[empty-icon]"></ng-content>
      <div class="empty-state__title" *ngIf="title() as t">{{ t }}</div>
      <ng-content select="[empty-title]"></ng-content>
      <div class="empty-state__description" *ngIf="description() as d">{{ d }}</div>
      <ng-content select="[empty-description]"></ng-content>
      <ng-content></ng-content>
      <div class="empty-state__actions">
        <ng-content select="[empty-actions]"></ng-content>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--kp-space-16) var(--kp-space-8);
      text-align: center;
      color: var(--kp-text-secondary);
      gap: var(--kp-space-2);
    }
    .empty-state--compact {
      padding: var(--kp-space-8) var(--kp-space-4);
    }
    .empty-state--muted {
      opacity: 0.7;
    }
    .empty-state__title {
      font-size: var(--kp-font-size-body-lg);
      font-weight: var(--kp-font-weight-medium);
      color: var(--kp-text);
    }
    .empty-state__description {
      font-size: var(--kp-font-size-body);
      color: var(--kp-text-soft);
      max-width: 360px;
    }
    .empty-state__actions {
      margin-top: var(--kp-space-3);
      display: flex;
      gap: var(--kp-space-2);
    }
    :host ::ng-deep [empty-icon] {
      font-size: 2rem;
      color: var(--kp-text-muted);
      margin-bottom: var(--kp-space-2);
      display: block;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyStateComponent {
  compact = input(false);
  tone = input<'default' | 'muted'>('default');
  title = input<string>('');
  description = input<string>('');
}
