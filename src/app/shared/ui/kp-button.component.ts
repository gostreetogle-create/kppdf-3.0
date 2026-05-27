import {
  Component,
  input,
  output,
  computed,
  ChangeDetectionStrategy,
  HostBinding,
} from '@angular/core';
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
        [iconPos]="iconPos()"
        [badge]="badge()"
        [badgeSeverity]="badgeSeverity()"
        [severity]="severity()"
        [size]="size()"
        [loading]="loading()"
        [disabled]="disabled()"
        [rounded]="rounded()"
        [text]="text()"
        [outlined]="outlined()"
        [raised]="raised()"
        [styleClass]="mergedStyleClass()"
        [autofocus]="autoFocus()"
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
  readonly iconPos = input<'left' | 'right' | 'top' | 'bottom'>('left');
  readonly badge = input<string>('');
  readonly badgeSeverity = input<'danger' | 'info' | 'success' | 'warn'>('danger');
  readonly severity = input<'primary' | 'secondary' | 'danger'>('primary');
  readonly size = input<'small' | 'large'>('small');
  readonly loading = input(false);
  readonly disabled = input(false);
  readonly rounded = input(false);
  readonly text = input(false);
  readonly outlined = input(false);
  readonly raised = input(false);
  readonly block = input(false);
  readonly autoFocus = input(false);
  readonly styleClass = input<string>('');
  /** Подсказка только для icon-only или когда текст ≠ label кнопки */
  readonly tooltip = input<string>('');
  readonly ariaLabel = input<string>('');

  readonly buttonClick = output<MouseEvent>();

  readonly mergedStyleClass = computed(() => {
    const classes = [this.styleClass()];
    if (this.block()) classes.push('kp-button--block');
    return classes.filter(Boolean).join(' ');
  });

  @HostBinding('class.kp-button--block-host')
  get isBlockHost(): boolean {
    return this.block();
  }

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
