import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { KpDialogComponent } from '../kp-dialog.component';
import { KpSearchComponent } from '../kp-search.component';
import { KpButtonComponent } from '../kp-button.component';
import {
  PLACEHOLDER_CATEGORIES,
  PLACEHOLDER_REGISTRY,
  type PlaceholderCategory,
  type PlaceholderToken,
} from '../../placeholder/placeholder.registry';

@Component({
  selector: 'app-kp-placeholder-picker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [KpDialogComponent, KpSearchComponent, KpButtonComponent],
  template: `
    <app-kp-dialog
      class="kp-placeholder-picker__dialog"
      [(visible)]="visible"
      header="Вставить плейсхолдер"
      width="520px"
      (hide)="onDialogHide()"
    >
      <div class="kp-placeholder-picker">
        <!-- Поиск -->
        <div class="kp-placeholder-picker__search">
          <app-kp-search
            [(query)]="searchQuery"
            placeholder="Поиск по названию или токену..."
            [debounceMs]="150"
          />
        </div>

        <!-- Список по категориям -->
        <div class="kp-placeholder-picker__list">
          @for (group of filteredGroups(); track group.category) {
            @if (group.tokens.length > 0) {
              <div class="kp-placeholder-picker__group">
                <div class="kp-placeholder-picker__group-header">
                  <i [class]="group.icon" aria-hidden="true"></i>
                  <span>{{ group.label }}</span>
                </div>
                <div class="kp-placeholder-picker__tokens">
                  @for (token of group.tokens; track token.token) {
                    <button
                      type="button"
                      class="kp-placeholder-picker__token"
                      [title]="token.description"
                      [attr.aria-label]="'Вставить ' + token.label"
                      (click)="onSelect(token)"
                      (keydown.enter)="onSelect(token)"
                    >
                      <code class="kp-placeholder-picker__token-key">{{
                        '{{' + token.token + '}}'
                      }}</code>
                      <span class="kp-placeholder-picker__token-label">{{ token.label }}</span>
                    </button>
                  }
                </div>
              </div>
            }
          } @empty {
            <div class="kp-placeholder-picker__empty">
              <i class="pi pi-search kp-placeholder-picker__empty-icon" aria-hidden="true"></i>
              <span>Ничего не найдено по запросу «{{ searchQuery() }}»</span>
            </div>
          }
        </div>
      </div>

      <div kpDialogFooter class="kp-placeholder-picker__footer">
        <app-kp-button
          label="Закрыть"
          severity="secondary"
          size="small"
          [outlined]="true"
          (buttonClick)="close()"
        />
      </div>
    </app-kp-dialog>
  `,
  styleUrl: './kp-placeholder-picker.component.scss',
})
export class KpPlaceholderPickerComponent {
  // ── Inputs / Outputs ──

  readonly visible = model(false);
  /** Фильтр по категориям: показать только указанные. Пустой массив = все. */
  readonly allowedCategories = input<PlaceholderCategory[]>([]);

  readonly placeholderSelected = output<string>();

  // ── State ──

  readonly searchQuery = signal('');

  // ── Derived ──

  readonly filteredGroups = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const allowed = this.allowedCategories();

    return PLACEHOLDER_CATEGORIES.filter((cat) => {
      // Фильтр по разрешённым категориям
      if (allowed.length > 0 && !allowed.includes(cat.key)) return false;
      // Всегда включаем категорию в структуру; токены фильтруются ниже
      return true;
    }).map((cat) => {
      let tokens = PLACEHOLDER_REGISTRY.filter((t) => t.category === cat.key);

      if (query) {
        tokens = tokens.filter(
          (t) =>
            t.label.toLowerCase().includes(query) ||
            t.token.toLowerCase().includes(query) ||
            t.description.toLowerCase().includes(query),
        );
      }

      return {
        category: cat.key,
        label: cat.label,
        icon: cat.icon,
        tokens,
      };
    });
  });

  // ── Actions ──

  onSelect(token: PlaceholderToken): void {
    this.placeholderSelected.emit(`{{${token.token}}}`);
    this.visible.set(false);
    this.searchQuery.set('');
  }

  close(): void {
    this.visible.set(false);
    this.searchQuery.set('');
  }

  onDialogHide(): void {
    this.searchQuery.set('');
  }
}
