import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DestroyRef } from '@angular/core';
import { KpProductPickerService } from './kp-product-picker.service';
import { CategoryOptionsService } from '../../services/category-options.service';
import { of } from 'rxjs';
import { environment } from '@env/environment';

describe('KpProductPickerService', () => {
  let service: KpProductPickerService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        KpProductPickerService,
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: CategoryOptionsService,
          useValue: { load: () => of([{ label: '/Металл', value: 'cat1' }]) },
        },
      ],
    });
    service = TestBed.inject(KpProductPickerService);
    http = TestBed.inject(HttpTestingController);
    TestBed.inject(DestroyRef);
  });

  afterEach(() => {
    http.verify();
    service.reset();
  });

  it('loadProductsImmediate should request products with filters', () => {
    service.loadProductsImmediate({
      page: 1,
      limit: 25,
      search: 'болт',
      categoryId: 'cat1',
      kind: 'ITEM',
      activeOnly: true,
    });

    const req = http.expectOne((r) => r.url.startsWith(`${environment.apiUrl}/directories/products`));
    expect(req.request.params.get('search')).toBe('болт');
    expect(req.request.params.get('categoryId')).toBe('cat1');
    expect(req.request.params.get('kind')).toBe('ITEM');
    expect(req.request.params.get('status')).toBe('active');
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('limit')).toBe('25');
    req.flush({ data: [], total: 0, page: 1, limit: 25, totalPages: 0 });
    expect(service.loading()).toBeFalse();
  });

  it('loadProducts should debounce repeated calls', fakeAsync(() => {
    service.loadProducts({ search: 'a', page: 1 });
    service.loadProducts({ search: 'ab', page: 1 });
    tick(299);
    http.expectNone(`${environment.apiUrl}/directories/products`);
    tick(1);
    const req = http.expectOne((r) => r.url.startsWith(`${environment.apiUrl}/directories/products`));
    expect(req.request.params.get('search')).toBe('ab');
    req.flush({ data: [], total: 0, page: 1, limit: 25, totalPages: 0 });
  }));

  it('reset should clear state', () => {
    service.loadProductsImmediate({ page: 1 });
    const req = http.expectOne((r) => r.url.startsWith(`${environment.apiUrl}/directories/products`));
    req.flush({
      data: [{ _id: '1', name: 'T', sku: 'S', kind: 'ITEM', unit: 'шт', status: 'active' }],
      total: 1,
      page: 1,
      limit: 25,
      totalPages: 1,
    });
    expect(service.products().length).toBe(1);
    service.reset();
    expect(service.products()).toEqual([]);
    expect(service.total()).toBe(0);
  });
});
