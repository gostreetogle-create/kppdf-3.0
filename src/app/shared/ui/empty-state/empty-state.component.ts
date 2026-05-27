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
  styleUrl: './empty-state.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyStateComponent {
  compact = input(false);
  tone = input<'default' | 'muted'>('default');
  title = input<string>('');
  description = input<string>('');
}
