import {
  Component,
  input,
  ChangeDetectionStrategy,
} from '@angular/core';
import { TagModule } from 'primeng/tag';

/**
 * Стандартные severity-значения PrimeNG Tag:
 * 'info' | 'success' | 'warn' | 'danger' | 'secondary' | 'contrast'
 */
export type KpTagSeverity = 'info' | 'success' | 'warn' | 'danger' | 'secondary' | 'contrast';

@Component({
  selector: 'app-kp-tag',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TagModule],
  template: `
    <p-tag
      [value]="value()"
      [severity]="severity()"
      [rounded]="rounded()"
    />
  `,
})
export class KpTagComponent {
  /** Текстовое значение тега */
  readonly value = input.required<string>();
  /** Severity тега (PrimeNG Tag severity) */
  readonly severity = input<KpTagSeverity>('info');
  /** Pill-форма (закруглённые края) */
  readonly rounded = input(true);
}
