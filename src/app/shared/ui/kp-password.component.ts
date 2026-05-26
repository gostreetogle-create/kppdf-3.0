import { Component, input, model, ChangeDetectionStrategy } from '@angular/core';
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
        class="kp-password__control w-full"
        size="small"
      />
      @if (error()) {
        <span class="kp-password__error">{{ error() }}</span>
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
}
