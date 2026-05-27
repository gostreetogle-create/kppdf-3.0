import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  template: `
    <div
      class="empty-state"
      role="status"
      [attr.aria-label]="ariaLabel()"
      [class.empty-state--compact]="compact()"
      [class.empty-state--muted]="tone() === 'muted'"
    >
      <ng-content select="[empty-icon]"></ng-content>
      @if (icon()) {
        <i class="empty-state__icon pi" [class]="icon()" aria-hidden="true"></i>
      }
      @if (title(); as t) {
        <div class="empty-state__title">{{ t }}</div>
      }
      <ng-content select="[empty-title]"></ng-content>
      @if (description(); as d) {
        <div class="empty-state__description">{{ d }}</div>
      }
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
  /** PrimeIcons class без префикса `pi`, напр. `pi-inbox`; пусто — только слот empty-icon */
  icon = input<string>('');

  ariaLabel(): string {
    const t = this.title().trim();
    const d = this.description().trim();
    if (t && d) return `${t}. ${d}`;
    return t || d || 'Нет данных';
  }
}
