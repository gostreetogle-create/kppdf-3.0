import { Component, input, model, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TextareaModule } from 'primeng/textarea';

@Component({
  selector: 'app-kp-textarea',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, TextareaModule],
  template: `
    <div class="kp-textarea">
      @if (label(); as lbl) {
        <label class="kp-textarea__label" [attr.for]="name()">
          {{ lbl }}
          @if (required()) { <span class="kp-textarea__required">*</span> }
        </label>
      }
      <textarea
        [id]="name()"
        pTextarea
        class="kp-textarea__control w-full"
        [class.kp-textarea__control--error]="!!error()"
        [ngModel]="value()"
        (ngModelChange)="value.set($event)"
        [placeholder]="placeholder()"
        [rows]="rows()"
        [readonly]="readonly()"
        [disabled]="disabled()"
        [attr.required]="required() ? '' : null"
      ></textarea>
      @if (error()) {
        <span class="kp-textarea__error">{{ error() }}</span>
      }
    </div>
  `,
  styleUrl: './kp-textarea.component.scss',
})
export class KpTextareaComponent {
  readonly label = input<string>('');
  readonly name = input<string>('');
  readonly value = model<string>('');
  readonly placeholder = input<string>('');
  readonly rows = input(3);
  readonly required = input(false);
  readonly readonly = input(false);
  readonly disabled = input(false);
  readonly error = input<string>('');
}
