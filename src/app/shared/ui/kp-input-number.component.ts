import { Component, input, model, computed, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputNumberModule } from 'primeng/inputnumber';

@Component({
  selector: 'app-kp-input-number',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, InputNumberModule],
  template: `
    <div class="kp-input-number">
      @if (label(); as lbl) {
        <label class="kp-input-number__label" [attr.for]="name()">
          {{ lbl }}
          @if (required()) { <span class="kp-input-number__required">*</span> }
        </label>
      }
      <p-inputNumber
        [inputId]="name()"
        [ngModel]="value()"
        (ngModelChange)="value.set($event)"
        [placeholder]="placeholder()"
        [disabled]="disabled()"
        [readonly]="readonly()"
        [min]="min()"
        [max]="max()"
        [step]="step()"
        [mode]="mode()"
        [useGrouping]="useGrouping()"
        class="kp-input-number__control w-full"
        [inputStyleClass]="error() ? 'kp-input-number--error' : ''"
        size="small"
        [attr.aria-label]="inputAriaLabel() || null"
        [attr.aria-invalid]="error() ? true : null"
        [attr.aria-describedby]="error() ? errorId() : null"
      />
      @if (error()) {
        <span [id]="errorId()" class="kp-input-number__error" role="alert">{{ error() }}</span>
      }
    </div>
  `,
  styleUrl: './kp-input-number.component.scss',
})
export class KpInputNumberComponent {
  readonly label = input<string>('');
  readonly name = input<string>('');
  readonly value = model<number | null>(null);
  readonly placeholder = input<string>('');
  readonly required = input(false);
  readonly readonly = input(false);
  readonly disabled = input(false);
  readonly error = input<string>('');
  readonly min = input<number | undefined>(undefined);
  readonly max = input<number | undefined>(undefined);
  readonly step = input<number>(1);
  readonly mode = input<'decimal' | 'currency'>('decimal');
  readonly useGrouping = input(true);
  readonly ariaLabel = input<string>('');

  readonly errorId = computed(() => (this.name() ? `${this.name()}-error` : 'kp-input-number-error'));
  readonly inputAriaLabel = computed(() => this.ariaLabel() || this.label() || '');
}
