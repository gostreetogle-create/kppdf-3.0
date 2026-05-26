import { Injectable, inject } from '@angular/core';
import { Observable, map, shareReplay } from 'rxjs';
import { CrudApiService } from './crud-api.service';
import type { KpSelectOption } from '../ui/kp-select.component';
import type { IWarehouse } from '../../../../shared/types/warehouse.interface';

/** Склады для связей в движениях и др. */
@Injectable({ providedIn: 'root' })
export class WarehouseOptionsService {
  private readonly api = inject(CrudApiService);
  private cached$?: Observable<KpSelectOption[]>;

  load(): Observable<KpSelectOption[]> {
    if (!this.cached$) {
      this.cached$ = this.api
        .list<IWarehouse>('/directories/warehouses', { limit: 500, page: 1 })
        .pipe(
          map((res) =>
            res.data
              .filter((w) => w._id)
              .map((w) => ({
                label: w.name,
                value: w._id as string,
              }))
              .sort((a, b) => a.label.localeCompare(b.label, 'ru')),
          ),
          shareReplay(1),
        );
    }
    return this.cached$;
  }
}
