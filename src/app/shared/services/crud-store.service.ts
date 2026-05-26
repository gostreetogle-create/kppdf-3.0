import { signal, computed, DestroyRef } from '@angular/core';
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
// NOTE: intentionally not @Injectable() — instantiated manually, not via Angular DI
export class CrudStore<T extends object> {
  readonly #api: CrudStoreApi<T>;
  readonly #options: Required<CrudStoreOptions>;
  readonly #destroyRef: DestroyRef | null;

  // ── State signals ──
  readonly #items = signal<T[]>([]);
  readonly #total = signal(0);
  readonly #loading = signal(false);
  readonly #saving = signal(false);
  readonly #page = signal(1);
  readonly #limit = signal(15);
  readonly #search = signal('');
  readonly #sortField = signal('createdAt');
  readonly #sortOrder = signal<-1 | 1>(-1);
  readonly #error = signal<string | null>(null);

  // ── Public readonly signals ──
  readonly items = this.#items.asReadonly();
  readonly total = this.#total.asReadonly();
  readonly loading = this.#loading.asReadonly();
  readonly saving = this.#saving.asReadonly();
  readonly page = this.#page.asReadonly();
  readonly limit = this.#limit.asReadonly();
  readonly search = this.#search.asReadonly();
  readonly sortField = this.#sortField.asReadonly();
  readonly sortOrder = this.#sortOrder.asReadonly();
  readonly error = this.#error.asReadonly();

  // ── Derived ──
  readonly hasData = computed(() => this.#items().length > 0);
  readonly isIdle = computed(() => !this.#loading() && !this.#saving());

  // ── Search debounce ──
  readonly #searchSubject = new Subject<string>();

  constructor(
    api: CrudStoreApi<T>,
    options: CrudStoreOptions,
    destroyRef?: DestroyRef,
  ) {
    this.#api = api;
    this.#destroyRef = destroyRef ?? null;
    this.#options = {
      basePath: options.basePath,
      defaultLimit: options.defaultLimit ?? 15,
      defaultSortField: options.defaultSortField ?? 'createdAt',
      defaultSortOrder: options.defaultSortOrder ?? -1,
      searchDebounceMs: options.searchDebounceMs ?? 300,
      onError: options.onError ?? (() => { /* noop */ }),
      onSuccess: options.onSuccess ?? (() => { /* noop */ }),
    };

    this.#limit.set(this.#options.defaultLimit);
    this.#sortField.set(this.#options.defaultSortField);
    this.#sortOrder.set(this.#options.defaultSortOrder);

    // Auto-search with debounce
    let searchPipe = this.#searchSubject.pipe(
      debounceTime(this.#options.searchDebounceMs),
    );
    if (this.#destroyRef) {
      searchPipe = searchPipe.pipe(takeUntilDestroyed(this.#destroyRef));
    }
    searchPipe.subscribe(() => this.load());
  }

  // ── Public methods ──

  /** Load data with current pagination/sort/search state */
  load(): void {
    this.#loading.set(true);
    this.#error.set(null);

    const filters: Record<string, string> = {};
    if (this.#search()) {
      filters['search'] = this.#search();
    }

    this.#api.list(this.#options.basePath, {
      page: this.#page(),
      limit: this.#limit(),
      search: this.#search() || undefined,
      sort: this.#sortField(),
      order: this.#sortOrder() === 1 ? 'asc' : 'desc',
      filters,
    }).pipe(
      tap({
        next: (res) => {
          this.#items.set((res.data ?? []) as T[]);
          this.#total.set(res.total ?? 0);
        },
        error: (err) => {
          this.#items.set([]);
          this.#total.set(0);
          const msg = err?.error?.error || err?.message || 'Ошибка загрузки данных';
          this.#error.set(msg);
          this.#options.onError(msg);
        },
      }),
      catchError(() => of(null as unknown as PaginatedResponse<T>)),
    ).subscribe(() => this.#loading.set(false));
  }

  /** Go to a specific page */
  goToPage(page: number): void {
    this.#page.set(Math.max(1, page));
    this.load();
  }

  /** Change page size */
  setLimit(limit: number): void {
    this.#limit.set(limit);
    this.#page.set(1);
    this.load();
  }

  /** Trigger search (will be debounced) */
  setSearch(query: string): void {
    this.#search.set(query);
    this.#page.set(1);
    this.#searchSubject.next(query);
  }

  /** Set sort field & order */
  setSort(field: string, order: -1 | 1): void {
    this.#sortField.set(field);
    this.#sortOrder.set(order);
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
    this.#page.set(Math.floor(event.first / event.rows) + 1);
    this.#limit.set(event.rows);
    this.load();
  }

  /** Create a new record */
  create(body: Record<string, unknown>): Promise<T | null> {
    this.#saving.set(true);
    this.#error.set(null);

    return firstValueFrom(
      this.#api.create(this.#options.basePath, body).pipe(
        tap({
          next: () => this.#options.onSuccess('Запись успешно создана'),
          error: (err) => {
            const msg = err?.error?.error || err?.message || 'Ошибка создания';
            this.#error.set(msg);
            this.#options.onError(msg);
          },
        }),
        catchError(() => of(null as unknown as T)),
      ),
    ).then((result) => {
      this.#saving.set(false);
      if (result !== null) {
        this.goToPage(1);
      }
      return result;
    });
  }

  /** Update an existing record */
  update(id: string, body: Record<string, unknown>): Promise<T | null> {
    this.#saving.set(true);
    this.#error.set(null);

    return firstValueFrom(
      this.#api.update(this.#options.basePath, id, body).pipe(
        tap({
          next: () => this.#options.onSuccess('Запись успешно обновлена'),
          error: (err) => {
            const msg = err?.error?.error || err?.message || 'Ошибка обновления';
            this.#error.set(msg);
            this.#options.onError(msg);
          },
        }),
        catchError(() => of(null as unknown as T)),
      ),
    ).then((result) => {
      this.#saving.set(false);
      if (result !== null) {
        this.load();
      }
      return result;
    });
  }

  /** Delete a record */
  delete(id: string): Promise<boolean> {
    this.#saving.set(true);
    this.#error.set(null);

    return firstValueFrom(
      this.#api.delete(this.#options.basePath, id).pipe(
        tap({
          next: () => this.#options.onSuccess('Запись успешно удалена'),
          error: (err) => {
            const msg = err?.error?.error || err?.message || 'Ошибка удаления';
            this.#error.set(msg);
            this.#options.onError(msg);
          },
        }),
        catchError(() => of(null)),
      ),
    ).then((result) => {
      this.#saving.set(false);
      if (result !== null) {
        this.load();
        return true;
      }
      return false;
    });
  }

  /** Reset all state */
  reset(): void {
    this.#page.set(1);
    this.#limit.set(this.#options.defaultLimit);
    this.#search.set('');
    this.#sortField.set(this.#options.defaultSortField);
    this.#sortOrder.set(this.#options.defaultSortOrder);
    this.#items.set([]);
    this.#total.set(0);
    this.#loading.set(false);
    this.#saving.set(false);
    this.#error.set(null);
  }
}
