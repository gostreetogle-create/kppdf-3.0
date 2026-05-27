import { Injectable, inject, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, Subscription, debounceTime } from 'rxjs';
import { CrudApiService } from '../../services/crud-api.service';
import { CategoryOptionsService } from '../../services/category-options.service';
import type { KpSelectOption } from '../kp-select.component';
import type { IProduct } from '../../../../../shared/types/product.interface';
import { PRODUCT_PICKER_PAGE_SIZE, type ProductPickerFilters } from './kp-product-picker.types';

@Injectable()
export class KpProductPickerService {
  private readonly api = inject(CrudApiService);
  private readonly categoryOptions = inject(CategoryOptionsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly products = signal<IProduct[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly categories = signal<KpSelectOption[]>([]);

  private readonly filterSubject = new Subject<ProductPickerFilters>();
  private listSub: Subscription | null = null;
  private readonly limit = PRODUCT_PICKER_PAGE_SIZE;

  private readonly filterPipeline = this.filterSubject
    .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
    .subscribe((filters) => this.loadProductsImmediate(filters));

  loadProducts(filters: ProductPickerFilters): void {
    this.filterSubject.next(filters);
  }

  loadProductsImmediate(filters: ProductPickerFilters): void {
    const page = filters.page ?? this.page();
    const activeOnly = filters.activeOnly !== false;

    this.page.set(page);
    this.loading.set(true);
    this.error.set(null);
    this.listSub?.unsubscribe();

    this.listSub = this.api
      .list<IProduct>('/directories/products', {
        page,
        limit: filters.limit ?? this.limit,
        search: filters.search || undefined,
        all: activeOnly ? undefined : true,
        filters: {
          ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
          ...(filters.kind ? { kind: filters.kind } : {}),
          ...(activeOnly ? { status: 'active' } : {}),
        },
      })
      .subscribe({
        next: (res) => {
          this.products.set(res.data ?? []);
          this.total.set(res.total ?? 0);
          this.loading.set(false);
        },
        error: (err: { error?: { error?: string }; message?: string }) => {
          this.products.set([]);
          this.total.set(0);
          this.loading.set(false);
          this.error.set(err?.error?.error || err?.message || 'Ошибка загрузки товаров');
        },
      });
  }

  loadCategories(): void {
    this.categoryOptions.load().subscribe({
      next: (opts) => this.categories.set(opts),
      error: () => this.categories.set([]),
    });
  }

  reset(): void {
    this.listSub?.unsubscribe();
    this.listSub = null;
    this.products.set([]);
    this.total.set(0);
    this.page.set(1);
    this.loading.set(false);
    this.error.set(null);
  }
}
