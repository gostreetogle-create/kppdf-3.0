import { Injectable, signal, computed, DestroyRef } from '@angular/core';
import { Subject, Observable, of, debounceTime, tap, catchError, firstValueFrom } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { PaginatedResponse, CrudQuery } from './crud-api.service';

// ── API interface that any CRUD service must implement ─────
export interface CrudStoreApi<T> {
  list(basePath: string, query: CrudQuery): Observable<PaginatedResponse<T>>;
  create(basePath: string, body: Record<string, unknown>): Observable<T>;
  update(basePath: string, id: string, body: Record<string, unknown>): Observable<T>;
  delete(basePath: string, id: string): Observable<T>;
}

// ── Store options ──────────────────────────────────────────
export interface CrudStoreOptions {
  /** Base path for API calls (e.g. '/directories/products' or 'products') */
  basePath: string;
  /** Default page size. Default: 15 */
  defaultLimit?: number;
  /** Default sort field. Default: 'createdAt' */
  defaultSortField?: string;
  /** Default sort order (-1 = desc, 1 = asc). Default: -1 */
  defaultSortOrder?: -1 | 1;
  /** Search debounce time in ms. Default: 300 */
  searchDebounceMs?: number;
  /** Error callback (e.g. for toast notification) */
  onError?: (message: string) => void;
  /** Success callback (e.g. for toast notification) */
  onSuccess?: (message: string) => void;
}

// ── Store ──────────────────────────────────────────────────
@Injectable()
export class CrudStore<T extends Record<string, unknown>> {
  private readonly api: CrudStoreApi<T>;
  private readonly options: Required<CrudStoreOptions>;
  private readonly destroyRef: DestroyRef | null;

  // ── State signals ──
  private readonly _items = signal<T[]>([]);
  private readonly _total = signal(0);
  private readonly _loading = signal(false);
  private readonly _saving = signal(false);
  private readonly _page = signal(1);
  private readonly _limit = signal(15);
  private readonly _search = signal('');
  private readonly _sortField = signal('createdAt');
  private readonly _sortOrder = signal<-1 | 1>(-1);
  private readonly _error = signal<string | null>(null);

  // ── Public readonly signals ──
  readonly items = this._items.asReadonly();
  readonly total = this._total.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly saving = this._saving.asReadonly();
  readonly page = this._page.asReadonly();
  readonly limit = this._limit.asReadonly();
  readonly search = this._search.asReadonly();
  readonly sortField = this._sortField.asReadonly();
  readonly sortOrder = this._sortOrder.asReadonly();
  readonly error = this._error.asReadonly();

  // ── Derived ──
  readonly hasData = computed(() => this._items().length > 0);
  readonly isIdle = computed(() => !this._loading() && !this._saving());

  // ── Search debounce ──
  private readonly searchSubject = new Subject<string>();

  constructor(
    api: CrudStoreApi<T>,
    options: CrudStoreOptions,
    destroyRef?: DestroyRef,
  ) {
    this.api = api;
    this.destroyRef = destroyRef ?? null;
    this.options = {
      basePath: options.basePath,
      defaultLimit: options.defaultLimit ?? 15,
      defaultSortField: options.defaultSortField ?? 'createdAt',
      defaultSortOrder: options.defaultSortOrder ?? -1,
      searchDebounceMs: options.searchDebounceMs ?? 300,
      onError: options.onError ?? (() => {}),
      onSuccess: options.onSuccess ?? (() => {}),
    };

    this._limit.set(this.options.defaultLimit);
    this._sortField.set(this.options.defaultSortField);
    this._sortOrder.set(this.options.defaultSortOrder);

    // Auto-search with debounce
    let searchPipe = this.searchSubject.pipe(
      debounceTime(this.options.searchDebounceMs),
    );
    if (this.destroyRef) {
      searchPipe = searchPipe.pipe(takeUntilDestroyed(this.destroyRef));
    }
    searchPipe.subscribe(() => this.load());
  }

  // ── Public methods ──

  /** Load data with current pagination/sort/search state */
  load(): void {
    this._loading.set(true);
    this._error.set(null);

    const filters: Record<string, string> = {};
    if (this._search()) {
      filters['search'] = this._search();
    }

    this.api.list(this.options.basePath, {
      page: this._page(),
      limit: this._limit(),
      search: this._search() || undefined,
      sort: this._sortField(),
      order: this._sortOrder() === 1 ? 'asc' : 'desc',
      filters,
    }).pipe(
      tap({
        next: (res) => {
          this._items.set((res.data ?? []) as T[]);
          this._total.set(res.total ?? 0);
        },
        error: (err) => {
          this._items.set([]);
          this._total.set(0);
          const msg = err?.error?.error || err?.message || 'Ошибка загрузки данных';
          this._error.set(msg);
          this.options.onError(msg);
        },
      }),
      catchError(() => of(null as unknown as PaginatedResponse<T>)),
    ).subscribe(() => this._loading.set(false));
  }

  /** Go to a specific page */
  goToPage(page: number): void {
    this._page.set(Math.max(1, page));
    this.load();
  }

  /** Change page size */
  setLimit(limit: number): void {
    this._limit.set(limit);
    this._page.set(1);
    this.load();
  }

  /** Trigger search (will be debounced) */
  setSearch(query: string): void {
    this._search.set(query);
    this._page.set(1);
    this.searchSubject.next(query);
  }

  /** Set sort field & order */
  setSort(field: string, order: -1 | 1): void {
    this._sortField.set(field);
    this._sortOrder.set(order);
    this.load();
  }

  /** Handle PrimeNG sort event */
  handleSort(event: { field?: string; order?: number }): void {
    this.setSort(
      event.field || 'createdAt',
      (event.order === 1 ? 1 : -1) as -1 | 1,
    );
  }

  /** Handle PrimeNG page event */
  handlePageChange(event: { first: number; rows: number }): void {
    this._page.set(Math.floor(event.first / event.rows) + 1);
    this._limit.set(event.rows);
    this.load();
  }

  /** Create a new record */
  create(body: Record<string, unknown>): Promise<T | null> {
    this._saving.set(true);
    this._error.set(null);

    return firstValueFrom(
      this.api.create(this.options.basePath, body).pipe(
        tap({
          next: () => {
            this.options.onSuccess('Запись успешно создана');
          },
          error: (err) => {
            const msg = err?.error?.error || err?.message || 'Ошибка создания';
            this._error.set(msg);
            this.options.onError(msg);
          },
        }),
        catchError(() => of(null as unknown as T)),
      ),
    ).then((result) => {
      this._saving.set(false);
      if (result !== null) {
        this.goToPage(1);
      }
      return result;
    });
  }

  /** Update an existing record */
  update(id: string, body: Record<string, unknown>): Promise<T | null> {
    this._saving.set(true);
    this._error.set(null);

    return firstValueFrom(
      this.api.update(this.options.basePath, id, body).pipe(
        tap({
          next: () => {
            this.options.onSuccess('Запись успешно обновлена');
          },
          error: (err) => {
            const msg = err?.error?.error || err?.message || 'Ошибка обновления';
            this._error.set(msg);
            this.options.onError(msg);
          },
        }),
        catchError(() => of(null as unknown as T)),
      ),
    ).then((result) => {
      this._saving.set(false);
      if (result !== null) {
        this.load();
      }
      return result;
    });
  }

  /** Delete a record */
  delete(id: string): Promise<boolean> {
    this._saving.set(true);
    this._error.set(null);

    return firstValueFrom(
      this.api.delete(this.options.basePath, id).pipe(
        tap({
          next: () => {
            this.options.onSuccess('Запись успешно удалена');
          },
          error: (err) => {
            const msg = err?.error?.error || err?.message || 'Ошибка удаления';
            this._error.set(msg);
            this.options.onError(msg);
          },
        }),
        catchError(() => of(null)),
      ),
    ).then((result) => {
      this._saving.set(false);
      if (result !== null) {
        this.load();
        return true;
      }
      return false;
    });
  }

  /** Reset all state */
  reset(): void {
    this._page.set(1);
    this._limit.set(this.options.defaultLimit);
    this._search.set('');
    this._sortField.set(this.options.defaultSortField);
    this._sortOrder.set(this.options.defaultSortOrder);
    this._items.set([]);
    this._total.set(0);
    this._loading.set(false);
    this._saving.set(false);
    this._error.set(null);
  }
}
