import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-kp-toast',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToastModule],
  template: `<p-toast [position]="position()" />`,
})
export class KpToastComponent {
  readonly position = input<'top-right' | 'top-center' | 'top-left' | 'bottom-right' | 'bottom-center' | 'bottom-left'>('top-right');
}
