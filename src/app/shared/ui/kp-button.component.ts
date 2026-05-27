import { Component, input, output, computed, ChangeDetectionStrategy } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-kp-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonModule, TooltipModule],
  template: `
    <span
      class="kp-button-host"
      [pTooltip]="tooltipText()"
      [tooltipDisabled]="!showTooltip()"
      tooltipPosition="top"
    >
      <p-button
        [type]="type()"
        [label]="label()"
        [icon]="icon()"
        [severity]="severity()"
        [size]="size()"
        [loading]="loading()"
        [disabled]="disabled()"
        [rounded]="rounded()"
        [text]="text()"
        [outlined]="outlined()"
        [raised]="raised()"
        [styleClass]="styleClass()"
        [attr.aria-label]="ariaLabel() || label() || tooltip() || null"
        (onClick)="buttonClick.emit($event)"
      />
    </span>
  `,
  styleUrl: './kp-button.component.scss',
})
export class KpButtonComponent {
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  readonly label = input<string>('');
  readonly icon = input<string>('');
  readonly severity = input<'success' | 'info' | 'warn' | 'danger' | 'help' | 'primary' | 'secondary' | 'contrast'>('primary');
  readonly size = input<'small' | 'large'>('small');
  readonly loading = input(false);
  readonly disabled = input(false);
  readonly rounded = input(false);
  readonly text = input(false);
  readonly outlined = input(false);
  readonly raised = input(false);
  readonly styleClass = input<string>('');
  /** Подсказка только для icon-only или когда текст ≠ label кнопки */
  readonly tooltip = input<string>('');
  readonly ariaLabel = input<string>('');

  readonly buttonClick = output<MouseEvent>();

  /** Текст подсказки; пусто, если дублирует видимый label */
  readonly tooltipText = computed(() => {
    const tip = this.tooltip().trim();
    if (!tip) return '';
    const visibleLabel = this.label().trim();
    if (visibleLabel && tip === visibleLabel) return '';
    return tip;
  });

  readonly showTooltip = computed(() => this.tooltipText().length > 0);
}
