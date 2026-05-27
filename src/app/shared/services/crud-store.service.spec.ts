import { DestroyRef } from '@angular/core';
import { fakeAsync, tick } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';
import { CrudStore, CrudStoreApi } from './crud-store.service';
import type { PaginatedResponse, CrudQuery } from './crud-api.service';

// ===== Mock API =====
class MockCrudApi implements CrudStoreApi<{ _id: string; name: string }> {
  private items: { _id: string; name: string }[] = [
    { _id: '1', name: 'Item A' },
    { _id: '2', name: 'Item B' },
    { _id: '3', name: 'Item C' },
  ];

  list(_basePath: string, _query: CrudQuery): Observable<PaginatedResponse<{ _id: string; name: string }>> {
    return of({
      data: this.items,
      total: this.items.length,
      page: 1,
      limit: 15,
      totalPages: 1,
    });
  }

  create(_basePath: string, body: Record<string, unknown>): Observable<{ _id: string; name: string }> {
    const item = { _id: String(Date.now()), name: body['name'] as string };
    this.items = [...this.items, item];
    return of(item);
  }

  update(_basePath: string, id: string, body: Record<string, unknown>): Observable<{ _id: string; name: string }> {
    const item = { _id: id, name: body['name'] as string };
    this.items = this.items.map((i) => (i._id === id ? item : i));
    return of(item);
  }

  delete(_basePath: string, id: string): Observable<{ _id: string; name: string }> {
    this.items = this.items.filter((i) => i._id !== id);
    return of({ _id: id, name: '' });
  }
}

// ===== Helpers =====
const noopDestroyRef = { onDestroy: () => { /**/ } } as unknown as DestroyRef;

describe('CrudStore', () => {
  let api: MockCrudApi;
  let store: CrudStore<{ _id: string; name: string }>;

  beforeEach(() => {
    api = new MockCrudApi();
    store = new CrudStore<{ _id: string; name: string }>(api, {
      basePath: '/test',
      defaultLimit: 15,
      defaultSortField: 'createdAt',
      defaultSortOrder: -1,
      searchDebounceMs: 300,
    }, noopDestroyRef);
  });

  // ================================================================
  //  Initial state
  // ================================================================
  it('should start with empty items and loading=false', () => {
    expect(store.items()).toEqual([]);
    expect(store.total()).toBe(0);
    expect(store.loading()).toBeFalse();
    expect(store.saving()).toBeFalse();
    expect(store.page()).toBe(1);
    expect(store.limit()).toBe(15);
    expect(store.sortField()).toBe('createdAt');
    expect(store.sortOrder()).toBe(-1);
    expect(store.search()).toBe('');
    expect(store.error()).toBeNull();
  });

  // ================================================================
  //  load()
  // ================================================================
  describe('load', () => {
    it('should load items and update signals', () => {
      store.load();
      expect(store.loading()).toBeFalse();
      expect(store.items().length).toBe(3);
      expect(store.total()).toBe(3);
      expect(store.hasData()).toBeTrue();
      expect(store.isIdle()).toBeTrue();
    });

    it('should set loading=true during load', () => {
      // Override list to be slow
      api.list = () => new Observable((sub) => {
        setTimeout(() => {
          sub.next({ data: [], total: 0, page: 1, limit: 15, totalPages: 1 });
          sub.complete();
        }, 100);
      });

      store.load();
      expect(store.loading()).toBeTrue();
    });

    it('should handle error gracefully', () => {
      const onError = jasmine.createSpy('onError');
      store = new CrudStore<{ _id: string; name: string }>(api, {
        basePath: '/test',
        onError,
      }, noopDestroyRef);

      api.list = () => throwError(() => new Error('Network error'));

      store.load();
      expect(store.loading()).toBeFalse();
      expect(store.items()).toEqual([]);
      expect(store.total()).toBe(0);
      expect(store.error()).toBe('Network error');
      expect(onError).toHaveBeenCalledWith('Network error');
    });
  });

  // ================================================================
  //  create()
  // ================================================================
  describe('create', () => {
    it('should create item and reload list', async () => {
      await store.create({ name: 'Item D' });
      expect(store.items().length).toBe(4);
      expect(store.items().some((i) => i.name === 'Item D')).toBeTrue();
      expect(store.saving()).toBeFalse();
    });

    it('should set saving=true during create', () => {
      void store.create({ name: 'Item D' });
      expect(store.saving()).toBeTrue();
    });

    it('should call onSuccess callback', async () => {
      const onSuccess = jasmine.createSpy('onSuccess');
      store = new CrudStore<{ _id: string; name: string }>(api, {
        basePath: '/test',
        onSuccess,
      }, noopDestroyRef);

      await store.create({ name: 'X' });
      expect(onSuccess).toHaveBeenCalled();
    });

    it('should handle create error', async () => {
      const onError = jasmine.createSpy('onError');
      store = new CrudStore<{ _id: string; name: string }>(api, {
        basePath: '/test',
        onError,
      }, noopDestroyRef);

      api.create = () => throwError(() => new Error('Create failed'));

      const result = await store.create({ name: 'X' });
      expect(result).toBeNull();
      expect(onError).toHaveBeenCalled();
    });
  });

  // ================================================================
  //  update()
  // ================================================================
  describe('update', () => {
    it('should update item and reload list', async () => {
      store.load();
      expect(store.items()[0].name).toBe('Item A');

      await store.update('1', { name: 'Item A Updated' });
      expect(store.saving()).toBeFalse();
      // After update, store reloads — items should be fresh
      const updated = store.items().find((i) => i._id === '1');
      expect(updated?.name).toBe('Item A Updated');
    });

    it('should handle update error', async () => {
      const onError = jasmine.createSpy('onError');
      store = new CrudStore<{ _id: string; name: string }>(api, {
        basePath: '/test',
        onError,
      }, noopDestroyRef);

      api.update = () => throwError(() => new Error('Update failed'));

      const result = await store.update('1', { name: 'X' });
      expect(result).toBeNull();
      expect(onError).toHaveBeenCalled();
    });
  });

  // ================================================================
  //  delete()
  // ================================================================
  describe('delete', () => {
    it('should delete item and reload list', async () => {
      store.load();
      expect(store.items().length).toBe(3);

      const success = await store.delete('1');
      expect(success).toBeTrue();
      expect(store.saving()).toBeFalse();
      expect(store.items().length).toBe(2);
    });

    it('should handle delete error', async () => {
      api.delete = () => throwError(() => new Error('Delete failed'));

      const success = await store.delete('1');
      expect(success).toBeFalse();
    });
  });

  // ================================================================
  //  Pagination
  // ================================================================
  describe('pagination', () => {
    it('goToPage should update page and reload', () => {
      store.goToPage(3);
      expect(store.page()).toBe(3);
    });

    it('goToPage should not go below 1', () => {
      store.goToPage(0);
      expect(store.page()).toBe(1);
    });

    it('setLimit should update limit and reset to page 1', () => {
      store.goToPage(3);
      store.setLimit(25);
      expect(store.limit()).toBe(25);
      expect(store.page()).toBe(1);
    });

    it('handlePageChange should compute page from first/rows', () => {
      store.handlePageChange({ first: 20, rows: 10 });
      expect(store.page()).toBe(3);
      expect(store.limit()).toBe(10);
    });
  });

  // ================================================================
  //  Sort
  // ================================================================
  describe('sort', () => {
    it('setSort should update sort fields and reload', () => {
      store.setSort('name', 1);
      expect(store.sortField()).toBe('name');
      expect(store.sortOrder()).toBe(1);
    });

    it('handleSort should accept PrimeNG event format', () => {
      store.handleSort({ field: 'name', order: 1 });
      expect(store.sortField()).toBe('name');
      expect(store.sortOrder()).toBe(1);

      store.handleSort({ field: 'createdAt', order: -1 });
      expect(store.sortField()).toBe('createdAt');
      expect(store.sortOrder()).toBe(-1);
    });
  });

  // ================================================================
  //  Search
  // ================================================================
  describe('search', () => {
    it('setSearch should update query and reset to page 1', fakeAsync(() => {
      store.goToPage(3);
      store.setSearch('test');
      expect(store.page()).toBe(1);
      expect(store.search()).toBe('test');

      tick(300);
      expect(store.loading()).toBeFalse();
    }));

    it('setSearch should debounce before triggering load', fakeAsync(() => {
      const loadSpy = spyOn(store, 'load').and.callThrough();

      store.setSearch('a');
      store.setSearch('ab');
      store.setSearch('abc');
      expect(loadSpy).not.toHaveBeenCalled();

      tick(300);
      expect(loadSpy).toHaveBeenCalledTimes(1);
    }));
  });

  // ================================================================
  //  reset()
  // ================================================================
  describe('reset', () => {
    it('should reset all state to defaults', () => {
      // Mutate state
      store.goToPage(5);
      store.setSearch('test');
      store.setSort('name', 1);
      store.load();

      store.reset();

      expect(store.page()).toBe(1);
      expect(store.limit()).toBe(15);
      expect(store.search()).toBe('');
      expect(store.sortField()).toBe('createdAt');
      expect(store.sortOrder()).toBe(-1);
      expect(store.items()).toEqual([]);
      expect(store.total()).toBe(0);
      expect(store.loading()).toBeFalse();
      expect(store.saving()).toBeFalse();
      expect(store.error()).toBeNull();
    });
  });

  // ================================================================
  //  Derived signals
  // ================================================================
  describe('derived signals', () => {
    it('hasData should be true when items exist', () => {
      store.load();
      expect(store.hasData()).toBeTrue();
    });

    it('hasData should be false when items empty', () => {
      expect(store.hasData()).toBeFalse();
    });

    it('isIdle should be true when not loading and not saving', () => {
      expect(store.isIdle()).toBeTrue();
    });
  });

  // ================================================================
  //  Default option values
  // ================================================================
  it('should use sensible defaults when options are omitted', () => {
    const minimalStore = new CrudStore<{ _id: string; name: string }>(api, {
      basePath: '/minimal',
    }, noopDestroyRef);

    expect(minimalStore.limit()).toBe(15);
    expect(minimalStore.sortField()).toBe('createdAt');
    expect(minimalStore.sortOrder()).toBe(-1);
  });
});
