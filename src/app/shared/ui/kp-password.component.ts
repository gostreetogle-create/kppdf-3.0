import { Component, input, model, computed, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PasswordModule } from 'primeng/password';

@Component({
  selector: 'app-kp-password',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, PasswordModule],
  template: `
    <div class="kp-password">
      @if (label(); as lbl) {
        <label class="kp-password__label" [attr.for]="name()">
          {{ lbl }}
          @if (required()) { <span class="kp-password__required">*</span> }
        </label>
      }
      <p-password
        [inputId]="name()"
        [ngModel]="value()"
        (ngModelChange)="value.set($event)"
        [placeholder]="placeholder()"
        [disabled]="disabled()"
        [toggleMask]="toggleMask()"
        [feedback]="feedback()"
        weakLabel="Слабый"
        mediumLabel="Средний"
        strongLabel="Надёжный"
        promptLabel="Введите пароль"
        class="kp-password__control w-full"
        [inputStyleClass]="error() ? 'kp-password__control--error' : ''"
        size="small"
        [attr.aria-label]="inputAriaLabel() || null"
        [attr.aria-invalid]="error() ? true : null"
        [attr.aria-describedby]="error() ? errorId() : null"
      />
      @if (error()) {
        <span [id]="errorId()" class="kp-password__error" role="alert">{{ error() }}</span>
      }
    </div>
  `,
  styleUrl: './kp-password.component.scss',
})
export class KpPasswordComponent {
  readonly label = input<string>('');
  readonly name = input<string>('');
  readonly value = model<string>('');
  readonly placeholder = input<string>('');
  readonly required = input(false);
  readonly disabled = input(false);
  readonly error = input<string>('');
  readonly toggleMask = input(true);
  readonly feedback = input(false);
  readonly ariaLabel = input<string>('');

  readonly errorId = computed(() => (this.name() ? `${this.name()}-error` : 'kp-password-error'));
  readonly inputAriaLabel = computed(() => this.ariaLabel() || this.label() || '');
}
