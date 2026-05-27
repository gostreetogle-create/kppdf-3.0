import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  HostListener,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';

import type { IProduct } from '../../../../../shared/types/product.interface';
import { KpDialogComponent } from '../kp-dialog.component';
import { KpInputComponent } from '../kp-input.component';
import { KpSelectComponent } from '../kp-select.component';
import { KpCheckboxComponent } from '../kp-checkbox.component';
import { KpButtonComponent } from '../kp-button.component';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { KpProductPickerService } from './kp-product-picker.service';
import {
  PRODUCT_KIND_OPTIONS,
  PRODUCT_KIND_LABELS,
  PRODUCT_PICKER_PAGE_SIZE,
  type ProductPickerFilters,
} from './kp-product-picker.types';

@Component({
  selector: 'app-kp-product-picker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [KpProductPickerService],
  imports: [
    DecimalPipe,
    KpDialogComponent,
    KpInputComponent,
    KpSelectComponent,
    KpCheckboxComponent,
    KpButtonComponent,
    EmptyStateComponent,
  ],
  template: `
    <app-kp-dialog
      class="kp-product-picker__dialog"
      [(visible)]="visible"
      [header]="pickerTitle()"
      [width]="dialogWidth()"
      (hide)="onDialogHide()"
    >
      @if (multiple()) {
        <p class="kp-product-picker__header-meta">Выбрано: {{ cartCount() }}</p>
      }

      <div class="kp-product-picker">
        <div class="kp-product-picker__filters">
          <div class="kp-product-picker__filters-search">
            <app-kp-input
              name="product-picker-search"
              placeholder="Поиск по названию или артикулу..."
              [(value)]="searchQuery"
            />
          </div>
          <div class="kp-product-picker__filters-field">
            <app-kp-select
              name="product-picker-category"
              label="Категория"
              placeholder="Все категории"
              [options]="categoryFilterOptions()"
              [(value)]="categoryId"
            />
          </div>
          <div class="kp-product-picker__filters-field">
            <app-kp-select
              name="product-picker-kind"
              label="Тип"
              placeholder="Все типы"
              [options]="kindFilterOptions()"
              [(value)]="kindFilter"
            />
          </div>
          <div class="kp-product-picker__filters-active">
            <app-kp-checkbox
              name="product-picker-active"
              label="Только активные"
              [(checked)]="activeOnly"
            />
          </div>
          <app-kp-button
            label="Сбросить"
            severity="secondary"
            size="small"
            [outlined]="true"
            (buttonClick)="resetFilters()"
          />
        </div>

        <div class="kp-product-picker__table-wrap">
          @if (picker.loading()) {
            <table class="kp-product-picker__table">
              <tbody>
                @for (i of skeletonRows; track i) {
                  <tr class="kp-product-picker__skeleton-row">
                    <td colspan="8"><div class="kp-product-picker__skeleton"></div></td>
                  </tr>
                }
              </tbody>
            </table>
          } @else if (picker.error()) {
            <app-empty-state
              icon="pi-exclamation-triangle"
              title="Не удалось загрузить товары"
              [description]="picker.error() || ''"
            />
          } @else if (picker.products().length === 0) {
            <app-empty-state
              icon="pi-inbox"
              title="Ничего не найдено"
              description="Попробуйте сменить фильтр или сбросить поиск."
            >
              <div empty-actions>
                <app-kp-button
                  label="Сбросить фильтры"
                  severity="secondary"
                  size="small"
                  (buttonClick)="resetFilters()"
                />
              </div>
            </app-empty-state>
          } @else {
            <table class="kp-product-picker__table">
              <thead>
                <tr>
                  <th class="kp-product-picker__col-check">
                    @if (multiple()) {
                      <input
                        type="checkbox"
                        [checked]="allPageSelected()"
                        [indeterminate]="somePageSelected() && !allPageSelected()"
                        (change)="toggleSelectAllPage($event)"
                        aria-label="Выбрать все на странице"
                      />
                    }
                  </th>
                  <th class="kp-product-picker__col-photo"></th>
                  <th>Артикул</th>
                  <th>Наименование</th>
                  <th>Категория</th>
                  <th class="kp-product-picker__col-price">Цена</th>
                  <th class="kp-product-picker__col-stock">Остаток</th>
                  <th class="kp-product-picker__col-kind">Тип</th>
                </tr>
              </thead>
              <tbody>
                @for (product of picker.products(); track product._id) {
                  <tr
                    class="kp-product-picker__row"
                    tabindex="0"
                    [class.kp-product-picker__row--selected]="isInCart(product._id)"
                    [class.kp-product-picker__row--in-doc]="isAlreadyInDoc(product._id)"
                    [attr.title]="rowTooltip(product)"
                    (dblclick)="onRowDblClick(product)"
                    (keydown.enter)="onRowActivate(product)"
                  >
                    <td class="kp-product-picker__col-check" (click)="$event.stopPropagation()">
                      @if (multiple()) {
                        <input
                          type="checkbox"
                          [checked]="isInCart(product._id)"
                          [disabled]="isRowDisabled(product)"
                          (change)="toggleCart(product)"
                          [attr.aria-label]="'Выбрать ' + product.name"
                        />
                      } @else {
                        <input
                          type="radio"
                          name="product-picker-single"
                          [checked]="singleSelectedId() === product._id"
                          (change)="selectSingle(product)"
                          [attr.aria-label]="'Выбрать ' + product.name"
                        />
                      }
                    </td>
                    <td class="kp-product-picker__col-photo">
                      <div class="kp-product-picker__photo" aria-hidden="true">
                        <i class="pi pi-image"></i>
                      </div>
                    </td>
                    <td>{{ product.sku }}</td>
                    <td class="kp-product-picker__col-name">
                      <div class="kp-product-picker__name-cell">
                        <span class="kp-product-picker__name">{{ product.name }}</span>
                        @if (productDescription(product); as desc) {
                          <span class="kp-product-picker__description">{{ desc }}</span>
                        }
                      </div>
                    </td>
                    <td>{{ categoryLabel(product.categoryId) }}</td>
                    <td class="kp-product-picker__col-price">
                      {{ product.listPrice ?? 0 | number:'1.0-0' }} ₽
                    </td>
                    <td class="kp-product-picker__col-stock">{{ product.stockQty ?? 0 }}</td>
                    <td class="kp-product-picker__col-kind">
                      <span class="kp-product-picker__tag">{{ kindLabel(product.kind) }}</span>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </div>

        @if (!picker.loading() && picker.products().length > 0) {
          <div class="kp-product-picker__pagination">
            <span class="kp-product-picker__pagination-info">{{ pageRangeLabel() }}</span>
            <div class="kp-product-picker__pagination-actions">
              <app-kp-button
                label="Назад"
                severity="secondary"
                size="small"
                [outlined]="true"
                [disabled]="picker.page() <= 1"
                (buttonClick)="goPrev()"
              />
              <app-kp-button
                label="Вперёд"
                severity="secondary"
                size="small"
                [outlined]="true"
                [disabled]="picker.page() >= totalPages()"
                (buttonClick)="goNext()"
              />
            </div>
          </div>
        }

        @if (multiple() && cartCount() > 0) {
          <div class="kp-product-picker__cart">
            <div class="kp-product-picker__cart-title">Корзина ({{ cartCount() }})</div>
            <div class="kp-product-picker__cart-list">
              @for (item of cartList(); track item._id) {
                <span class="kp-product-picker__cart-chip">
                  {{ item.name }}
                  <button
                    type="button"
                    class="kp-product-picker__cart-remove"
                    (click)="removeFromCart(item._id!)"
                    aria-label="Убрать из корзины"
                  >×</button>
                </span>
              }
            </div>
            <div class="kp-product-picker__cart-footer">
              <span class="kp-product-picker__cart-total">
                Итого (ориентир): {{ cartTotal() | number:'1.0-0' }} ₽
              </span>
            </div>
          </div>
        }
      </div>

      <div kpDialogFooter class="kp-product-picker__footer">
        <app-kp-button
          label="Отмена"
          severity="secondary"
          size="small"
          [outlined]="true"
          (buttonClick)="cancel()"
        />
        @if (multiple()) {
          <app-kp-button
            [label]="confirmButtonLabel()"
            icon="pi pi-check"
            size="small"
            [disabled]="cartCount() === 0"
            (buttonClick)="confirmMulti()"
          />
        }
      </div>
    </app-kp-dialog>
  `,
  styleUrl: './kp-product-picker.component.scss',
})
export class KpProductPickerComponent {
  readonly picker = inject(KpProductPickerService);

  readonly multiple = input(true);
  readonly visible = model(false);
  readonly selectedIds = input<string[]>([]);
  readonly defaultFilters = input<ProductPickerFilters>({});
  readonly pickerTitle = input('Выберите товары');
  readonly confirmLabel = input('Добавить');
  readonly maxSelection = input(0);
  /** Ширина модалки (крупная витрина по умолчанию) */
  readonly dialogWidth = input('min(1400px, 96vw)');

  readonly productsSelected = output<IProduct[]>();
  readonly productSelected = output<IProduct>();
  readonly dialogHide = output<void>();

  readonly searchQuery = signal('');
  readonly categoryId = signal<string | number | boolean>('');
  readonly kindFilter = signal<string | number | boolean>('');
  readonly activeOnly = signal(true);
  readonly singleSelectedId = signal<string | null>(null);

  readonly cartIds = signal<Set<string>>(new Set());
  readonly cartProducts = signal<Map<string, IProduct>>(new Map());

  readonly skeletonRows = [0, 1, 2, 3, 4, 5];

  readonly kindFilterOptions = computed(() => [
    { label: 'Все типы', value: '' },
    ...PRODUCT_KIND_OPTIONS,
  ]);

  readonly categoryFilterOptions = computed(() => [
    { label: 'Все категории', value: '' },
    ...this.picker.categories(),
  ]);

  readonly categoryLabelMap = computed(() => {
    const map = new Map<string, string>();
    for (const opt of this.picker.categories()) {
      map.set(String(opt.value), opt.label);
    }
    return map;
  });

  readonly cartCount = computed(() => this.cartIds().size);

  readonly cartList = computed(() => Array.from(this.cartProducts().values()));

  readonly cartTotal = computed(() =>
    this.cartList().reduce((sum, p) => sum + (p.listPrice ?? 0), 0),
  );

  readonly totalPages = computed(() => {
    const total = this.picker.total();
    return Math.max(1, Math.ceil(total / PRODUCT_PICKER_PAGE_SIZE));
  });

  readonly confirmButtonLabel = computed(() => {
    const n = this.cartCount();
    const base = this.confirmLabel();
    return n > 0 ? `${base} ${n}` : base;
  });

  constructor() {
    effect(() => {
      if (this.visible()) {
        this.onOpen();
      } else {
        this.picker.reset();
        this.clearCart();
      }
    });

    effect(() => {
      if (!this.visible()) return;
      this.searchQuery();
      this.categoryId();
      this.kindFilter();
      this.activeOnly();
      this.picker.loadProducts(this.buildFilters(1));
    });
  }

  pageRangeLabel(): string {
    const total = this.picker.total();
    if (total === 0) return 'Показано 0 из 0';
    const page = this.picker.page();
    const start = (page - 1) * PRODUCT_PICKER_PAGE_SIZE + 1;
    const end = Math.min(page * PRODUCT_PICKER_PAGE_SIZE, total);
    return `Показано ${start}–${end} из ${total}`;
  }

  kindLabel(kind: string): string {
    return PRODUCT_KIND_LABELS[kind] ?? kind;
  }

  /** Описание товара — только если заполнено (для подписи под названием). */
  productDescription(product: IProduct): string | null {
    const desc = product.description?.trim();
    return desc ? desc : null;
  }

  categoryLabel(categoryId?: string): string {
    if (!categoryId) return '—';
    return this.categoryLabelMap().get(categoryId) ?? '—';
  }

  isInCart(id?: string): boolean {
    return !!id && this.cartIds().has(id);
  }

  isAlreadyInDoc(id?: string): boolean {
    return !!id && this.selectedIds().includes(id);
  }

  isRowDisabled(product: IProduct): boolean {
    const id = product._id;
    if (!id) return true;
    if (this.isAlreadyInDoc(id)) return true;
    const max = this.maxSelection();
    if (max > 0 && !this.isInCart(id) && this.cartCount() >= max) return true;
    return false;
  }

  allPageSelected(): boolean {
    const pageProducts = this.picker.products().filter((p) => p._id && !this.isAlreadyInDoc(p._id));
    return pageProducts.length > 0 && pageProducts.every((p) => this.isInCart(p._id));
  }

  somePageSelected(): boolean {
    return this.picker.products().some((p) => p._id && this.isInCart(p._id));
  }

  onOpen(): void {
    const defaults = this.defaultFilters();
    this.searchQuery.set(defaults.search ?? '');
    this.categoryId.set(defaults.categoryId ?? '');
    this.kindFilter.set(defaults.kind ?? '');
    this.activeOnly.set(defaults.activeOnly !== false);
    this.singleSelectedId.set(null);
    this.clearCart();
    this.picker.loadCategories();
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.categoryId.set('');
    this.kindFilter.set('');
    this.activeOnly.set(true);
  }

  buildFilters(page: number): ProductPickerFilters {
    const cat = String(this.categoryId() || '');
    const kind = String(this.kindFilter() || '');
    return {
      search: this.searchQuery().trim() || undefined,
      categoryId: cat || undefined,
      kind: kind || undefined,
      activeOnly: this.activeOnly(),
      page,
      limit: PRODUCT_PICKER_PAGE_SIZE,
    };
  }

  goPrev(): void {
    const p = this.picker.page();
    if (p > 1) this.picker.loadProductsImmediate(this.buildFilters(p - 1));
  }

  goNext(): void {
    const p = this.picker.page();
    if (p < this.totalPages()) this.picker.loadProductsImmediate(this.buildFilters(p + 1));
  }

  toggleCart(product: IProduct): void {
    const id = product._id;
    if (!id || this.isRowDisabled(product)) return;
    this.cartIds.update((set) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    this.cartProducts.update((map) => {
      const next = new Map(map);
      if (next.has(id)) next.delete(id);
      else next.set(id, product);
      return next;
    });
  }

  removeFromCart(id: string): void {
    this.cartIds.update((set) => {
      const next = new Set(set);
      next.delete(id);
      return next;
    });
    this.cartProducts.update((map) => {
      const next = new Map(map);
      next.delete(id);
      return next;
    });
  }

  toggleSelectAllPage(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    for (const product of this.picker.products()) {
      if (!product._id || this.isAlreadyInDoc(product._id)) continue;
      if (checked && this.isRowDisabled(product) && !this.isInCart(product._id)) continue;
      if (checked && !this.isInCart(product._id)) {
        this.addToCart(product);
      } else if (!checked && this.isInCart(product._id)) {
        this.removeFromCart(product._id);
      }
    }
  }

  addToCart(product: IProduct): void {
    const id = product._id;
    if (!id) return;
    const max = this.maxSelection();
    if (max > 0 && this.cartCount() >= max && !this.isInCart(id)) return;
    this.cartIds.update((set) => new Set(set).add(id));
    this.cartProducts.update((map) => new Map(map).set(id, product));
  }

  selectSingle(product: IProduct): void {
    if (product._id) this.singleSelectedId.set(product._id);
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.visible()) {
      this.cancel();
    }
  }

  rowTooltip(product: IProduct): string | null {
    const max = this.maxSelection();
    if (max > 0 && !this.isInCart(product._id) && this.cartCount() >= max) {
      return `Максимум ${max} товаров`;
    }
    if (this.isAlreadyInDoc(product._id)) {
      return 'Уже добавлен в документ';
    }
    const desc = this.productDescription(product);
    if (desc) {
      return `${product.name}. ${desc}`;
    }
    return null;
  }

  onRowActivate(product: IProduct): void {
    this.onRowDblClick(product);
  }

  onRowDblClick(product: IProduct): void {
    if (this.multiple()) {
      if (this.isInCart(product._id)) {
        if (product._id) this.removeFromCart(product._id);
      } else {
        this.addToCart(product);
      }
    } else if (product._id) {
      this.productSelected.emit(product);
      this.visible.set(false);
    }
  }

  confirmMulti(): void {
    const items = this.cartList();
    if (items.length === 0) return;
    this.productsSelected.emit(items);
    this.visible.set(false);
  }

  cancel(): void {
    this.visible.set(false);
  }

  onDialogHide(): void {
    this.dialogHide.emit();
  }

  clearCart(): void {
    this.cartIds.set(new Set());
    this.cartProducts.set(new Map());
    this.singleSelectedId.set(null);
  }
}
