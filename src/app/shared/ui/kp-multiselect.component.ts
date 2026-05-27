import { Component, input, model, computed, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MultiSelectModule } from 'primeng/multiselect';

@Component({
  selector: 'app-kp-multiselect',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MultiSelectModule],
  template: `
    <div class="kp-multiselect">
      @if (label(); as lbl) {
        <label class="kp-multiselect__label" [attr.for]="name()">
          {{ lbl }}
          @if (required()) { <span class="kp-multiselect__required">*</span> }
        </label>
      }
      <p-multiselect
        [inputId]="name()"
        [options]="selectOptions()"
        [(ngModel)]="value"
        [placeholder]="placeholder()"
        [disabled]="disabled()"
        [showClear]="!required()"
        [filter]="true"
        [maxSelectedLabels]="maxSelectedLabels()"
        display="chip"
        [styleClass]="controlClass()"
        size="small"
        [attr.aria-label]="inputAriaLabel() || null"
        [attr.aria-invalid]="error() ? true : null"
        [attr.aria-describedby]="error() ? errorId() : null"
      />
      @if (error()) {
        <span [id]="errorId()" class="kp-multiselect__error" role="alert">{{ error() }}</span>
      }
    </div>
  `,
  styleUrl: './kp-multiselect.component.scss',
})
export class KpMultiselectComponent {
  readonly label = input<string>('');
  readonly name = input<string>('');
  readonly value = model<string[]>([]);
  readonly options = input<string[]>([]);
  readonly placeholder = input<string>('Выберите...');
  readonly required = input(false);
  readonly disabled = input(false);
  readonly error = input<string>('');
  readonly maxSelectedLabels = input(3);
  readonly ariaLabel = input<string>('');

  readonly selectOptions = computed(() =>
    this.options().map((o) => ({ label: o, value: o })),
  );

  readonly errorId = computed(() => (this.name() ? `${this.name()}-error` : 'kp-multiselect-error'));
  readonly inputAriaLabel = computed(() => this.ariaLabel() || this.label() || '');

  readonly controlClass = computed(() => {
    const classes = ['kp-multiselect__control', 'w-full'];
    if (this.error()) {
      classes.push('kp-multiselect__control--error');
    }
    return classes.join(' ');
  });
}
