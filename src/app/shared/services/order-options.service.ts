import { Injectable, inject } from '@angular/core';
import { Observable, map, shareReplay } from 'rxjs';
import { CrudApiService } from './crud-api.service';
import type { KpSelectOption } from '../ui/kp-select.component';
import type { IOrder } from '../../../../shared/types/order.interface';

/** Заказы клиентов для связей в нарядах и др. */
@Injectable({ providedIn: 'root' })
export class OrderOptionsService {
  private readonly api = inject(CrudApiService);
  private cached$?: Observable<KpSelectOption[]>;

  load(): Observable<KpSelectOption[]> {
    if (!this.cached$) {
      this.cached$ = this.api
        .list<IOrder>('/directories/orders', { limit: 500, page: 1 })
        .pipe(
          map((res) =>
            res.data
              .filter((o) => o._id)
              .map((o) => ({
                label: o.number,
                value: o._id as string,
              }))
              .sort((a, b) => a.label.localeCompare(b.label, 'ru')),
          ),
          shareReplay(1),
        );
    }
    return this.cached$;
  }
}
