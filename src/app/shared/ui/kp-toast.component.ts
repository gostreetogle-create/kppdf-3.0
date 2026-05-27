import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-kp-toast',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToastModule],
  template: `
    <p-toast
      [position]="position()"
      [breakpoints]="breakpoints"
    />
  `,
})
export class KpToastComponent {
  readonly position = input<'top-right' | 'top-center' | 'top-left' | 'bottom-right' | 'bottom-center' | 'bottom-left'>('top-right');

  readonly breakpoints = {
    '920px': { width: '100%', right: '0', left: '0' },
    '640px': { width: 'calc(100% - 1rem)', right: '0.5rem', left: '0.5rem' },
  };
}
