import { Injectable, inject } from '@angular/core';
import { Observable, map, shareReplay } from 'rxjs';
import { CrudApiService } from './crud-api.service';
import type { KpSelectOption } from '../ui/kp-select.component';
import type { IShipment } from '../../../../shared/types/shipment.interface';

/** Отгрузки для связей в отгрузочных документах и др. */
@Injectable({ providedIn: 'root' })
export class ShipmentOptionsService {
  private readonly api = inject(CrudApiService);
  private cached$?: Observable<KpSelectOption[]>;

  load(): Observable<KpSelectOption[]> {
    if (!this.cached$) {
      this.cached$ = this.api
        .list<IShipment>('/directories/shipments', { limit: 500, page: 1 })
        .pipe(
          map((res) =>
            res.data
              .filter((s) => s._id)
              .map((s) => ({
                label: s.number,
                value: s._id as string,
              }))
              .sort((a, b) => a.label.localeCompare(b.label, 'ru')),
          ),
          shareReplay(1),
        );
    }
    return this.cached$;
  }
}
