import {
  Component,
  input,
  model,
  output,
  ChangeDetectionStrategy,
  DestroyRef,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';

@Component({
  selector: 'app-kp-search',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.kp-search--large]': 'size() === "large"',
  },
  imports: [FormsModule, InputTextModule],
  template: `
    <span class="kp-search" [class.kp-search--has-label]="!!label()">
      @if (label()) {
        <label class="kp-search__label" [attr.for]="inputId">{{ label() }}</label>
      }
      <span class="kp-search__input-wrap">
        <i class="pi pi-search kp-search__icon" aria-hidden="true"></i>
        <input
          [id]="inputId"
          pInputText
          type="search"
          [ngModel]="query()"
          (ngModelChange)="onInput($event)"
          [placeholder]="placeholder()"
          [disabled]="disabled()"
          class="kp-search__control"
          [attr.aria-label]="ariaLabel() || placeholder() || 'Поиск'"
        />
      </span>
    </span>
  `,
  styleUrl: './kp-search.component.scss',
})
export class KpSearchComponent {
  private readonly destroyRef = inject(DestroyRef);
  readonly inputId = `kp-search-${Math.random().toString(36).slice(2, 9)}`;

  readonly query = model<string>('');
  readonly placeholder = input('Поиск...');
  readonly label = input('');
  readonly disabled = input(false);
  readonly ariaLabel = input('');
  readonly debounceMs = input(300);
  readonly size = input<'small' | 'large'>('small');

  readonly searchChange = output<string>();

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.debounceTimer) clearTimeout(this.debounceTimer);
    });
  }

  onInput(value: string): void {
    this.query.set(value);

    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    const ms = this.debounceMs();
    if (ms <= 0) {
      this.searchChange.emit(value);
      return;
    }
    this.debounceTimer = setTimeout(() => {
      this.searchChange.emit(value);
      this.debounceTimer = null;
    }, ms);
  }
}
