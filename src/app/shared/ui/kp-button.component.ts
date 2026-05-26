import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'kp-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonModule, TooltipModule],
  template: `
    <p-button
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
      tooltipPosition="top"
      (onClick)="onClick.emit($event)"
    />
  `,
})
export class KpButtonComponent {
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

  readonly onClick = output<MouseEvent>();
}
