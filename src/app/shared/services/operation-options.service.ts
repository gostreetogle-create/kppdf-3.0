import { Injectable, inject } from '@angular/core';
import { Observable, map, shareReplay } from 'rxjs';
import { CrudApiService } from './crud-api.service';
import type { KpSelectOption } from '../ui/kp-select.component';
import type { IOperation } from '../../../../shared/types/operation.interface';

/** Технологические операции для операций наряда. */
@Injectable({ providedIn: 'root' })
export class OperationOptionsService {
  private readonly api = inject(CrudApiService);
  private cached$?: Observable<KpSelectOption[]>;

  load(): Observable<KpSelectOption[]> {
    if (!this.cached$) {
      this.cached$ = this.api
        .list<IOperation>('/directories/operations', { limit: 500, page: 1 })
        .pipe(
          map((res) =>
            res.data
              .filter((o) => o._id)
              .map((o) => ({
                label: o.number != null ? `${o.number}. ${o.name}` : o.name,
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
