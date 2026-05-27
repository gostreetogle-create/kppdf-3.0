import { Component, input, model, computed, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';

@Component({
  selector: 'app-kp-checkbox',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, CheckboxModule],
  template: `
    <div class="kp-checkbox">
      <p-checkbox
        [inputId]="name()"
        [(ngModel)]="checked"
        [binary]="true"
        [disabled]="disabled()"
        size="small"
        [attr.aria-label]="inputAriaLabel() || null"
      />
      @if (label(); as lbl) {
        <label class="kp-checkbox__label" [attr.for]="name()">{{ lbl }}</label>
      }
    </div>
  `,
  styleUrl: './kp-checkbox.component.scss',
})
export class KpCheckboxComponent {
  readonly label = input<string>('');
  readonly name = input<string>('');
  readonly checked = model<boolean>(false);
  readonly disabled = input(false);
  readonly ariaLabel = input<string>('');

  readonly inputAriaLabel = computed(() => this.ariaLabel() || this.label() || '');
}
