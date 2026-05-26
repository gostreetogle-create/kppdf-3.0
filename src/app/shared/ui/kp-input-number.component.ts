import { Component, input, model, ChangeDetectionStrategy } from '@angular/core';
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
        [mode]="mode()"
        [useGrouping]="useGrouping()"
        class="kp-input-number__control w-full"
        [inputStyleClass]="error() ? 'kp-input-number--error' : ''"
        size="small"
      />
      @if (error()) {
        <span class="kp-input-number__error">{{ error() }}</span>
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
  readonly mode = input<'decimal' | 'currency'>('decimal');
  readonly useGrouping = input(true);
}
