import { Component, input, ChangeDetectionStrategy } from '@angular/core';

/**
 * Обёртка label + control + error/hint для кастомных полей.
 * Слот control — основной контрол; label и error задаются через inputs.
 */
@Component({
  selector: 'app-kp-form-field',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="kp-form-field">
      @if (label()) {
        <label class="kp-form-field__label" [attr.for]="forId()">
          {{ label() }}
          @if (required()) { <span class="kp-form-field__required">*</span> }
        </label>
      }
      <div class="kp-form-field__control">
        <ng-content />
      </div>
      @if (hint() && !error()) {
        <span class="kp-form-field__hint">{{ hint() }}</span>
      }
      @if (error()) {
        <span class="kp-form-field__error">{{ error() }}</span>
      }
    </div>
  `,
  styleUrl: './kp-form-field.component.scss',
})
export class KpFormFieldComponent {
  readonly label = input<string>('');
  readonly forId = input<string>('');
  readonly required = input(false);
  readonly error = input<string>('');
  readonly hint = input<string>('');
}
