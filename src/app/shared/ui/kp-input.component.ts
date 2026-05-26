import { Component, input, model, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';

@Component({
  selector: 'app-kp-input',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, InputTextModule],
  template: `
    <div class="kp-input">
      @if (label(); as lbl) {
        <label class="kp-input__label" [attr.for]="name()">
          {{ lbl }}
          @if (required()) { <span class="kp-input__required">*</span> }
        </label>
      }
      <input
        [id]="name()"
        pInputText
        [type]="type()"
        [ngModel]="value()"
        (ngModelChange)="value.set($event)"
        [placeholder]="placeholder()"
        [readonly]="readonly()"
        [disabled]="disabled()"
        [attr.required]="required() ? '' : null"
        [class.kp-input--has-error]="!!error()"
        [class.kp-input--small]="size() === 'small'"
        [class.kp-input--large]="size() === 'large'"
        class="kp-input__control w-full"
      />
      @if (error()) {
        <span class="kp-input__error">{{ error() }}</span>
      }
    </div>
  `,
  styleUrl: './kp-input.component.scss',
})
export class KpInputComponent {
  readonly label = input<string>('');
  readonly name = input<string>('');
  readonly value = model<string>('');
  readonly type = input<'text' | 'number' | 'email' | 'tel' | 'url'>('text');
  readonly placeholder = input<string>('');
  readonly required = input(false);
  readonly readonly = input(false);
  readonly disabled = input(false);
  readonly error = input<string>('');
  readonly size = input<'small' | 'large'>('small');
}
