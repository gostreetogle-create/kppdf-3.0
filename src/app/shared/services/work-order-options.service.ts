import { Injectable, inject } from '@angular/core';
import { Observable, map, shareReplay } from 'rxjs';
import { CrudApiService } from './crud-api.service';
import type { KpSelectOption } from '../ui/kp-select.component';
import type { IWorkOrder } from '../../../../shared/types/workOrder.interface';

/** Производственные наряды для операций наряда и др. */
@Injectable({ providedIn: 'root' })
export class WorkOrderOptionsService {
  private readonly api = inject(CrudApiService);
  private cached$?: Observable<KpSelectOption[]>;

  load(): Observable<KpSelectOption[]> {
    if (!this.cached$) {
      this.cached$ = this.api
        .list<IWorkOrder>('/directories/work-orders', { limit: 500, page: 1 })
        .pipe(
          map((res) =>
            res.data
              .filter((w) => w._id)
              .map((w) => ({
                label: w.number,
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
