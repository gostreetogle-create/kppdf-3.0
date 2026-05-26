import { Injectable, inject } from '@angular/core';
import { Observable, map, shareReplay } from 'rxjs';
import { CrudApiService } from './crud-api.service';
import type { KpSelectOption } from '../ui/kp-select.component';
import type { IProduct } from '../../../../shared/types/product.interface';

/** Номенклатура для связей в формах CRUD. */
@Injectable({ providedIn: 'root' })
export class ProductOptionsService {
  private readonly api = inject(CrudApiService);
  private cached$?: Observable<KpSelectOption[]>;

  load(): Observable<KpSelectOption[]> {
    if (!this.cached$) {
      this.cached$ = this.api
        .list<IProduct>('/directories/products', { limit: 500, page: 1 })
        .pipe(
          map((res) =>
            res.data
              .filter((p) => p._id)
              .map((p) => ({
                label: p.sku ? `${p.name} (${p.sku})` : p.name,
                value: p._id as string,
              }))
              .sort((a, b) => a.label.localeCompare(b.label, 'ru')),
          ),
          shareReplay(1),
        );
    }
    return this.cached$;
  }
}
