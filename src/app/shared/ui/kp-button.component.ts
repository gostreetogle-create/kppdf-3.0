import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-kp-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonModule, TooltipModule],
  template: `
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
      [pTooltip]="tooltip()"
      [attr.aria-label]="ariaLabel() || label() || tooltip() || null"
      tooltipPosition="top"
      (onClick)="buttonClick.emit($event)"
    />
  `,
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
  readonly tooltip = input<string>('');
  readonly ariaLabel = input<string>('');

  readonly buttonClick = output<MouseEvent>();
}
