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
        display="chip"
        styleClass="kp-multiselect__control w-full"
        size="small"
      />
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

  readonly selectOptions = computed(() =>
    this.options().map((o) => ({ label: o, value: o })),
  );
}
