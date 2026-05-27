import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-kp-readiness-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="kp-readiness-bar"
      [class.kp-readiness-bar--compact]="compact()"
      [class.kp-readiness-bar--edge]="edge()"
    >
      <div
        class="kp-readiness-bar__track"
        role="progressbar"
        [attr.aria-valuenow]="clampedPercent()"
        aria-valuemin="0"
        aria-valuemax="100"
        [attr.aria-label]="ariaLabel()"
      >
        <div
          class="kp-readiness-bar__fill"
          [class]="'kp-readiness-bar__fill--' + level()"
          [style.width.%]="clampedPercent()"
        ></div>
      </div>
      @if (showLabel()) {
        <span class="kp-readiness-bar__label">{{ clampedPercent() }}%</span>
      }
    </div>
  `,
  styleUrl: './kp-readiness-bar.component.scss',
})
export class KpReadinessBarComponent {
  readonly percent = input(0);
  readonly compact = input(false);
  readonly edge = input(false);
  readonly showLabel = input(true);
  readonly label = input('');

  readonly clampedPercent = computed(() => {
    const value = this.percent();
    if (Number.isNaN(value)) return 0;
    return Math.min(100, Math.max(0, Math.round(value)));
  });

  readonly level = computed(() => {
    const p = this.clampedPercent();
    if (p >= 80) return 'high';
    if (p >= 40) return 'mid';
    return 'low';
  });

  ariaLabel(): string {
    const custom = this.label().trim();
    if (custom) return `${custom}: ${this.clampedPercent()}%`;
    return `Готовность ${this.clampedPercent()}%`;
  }
}
