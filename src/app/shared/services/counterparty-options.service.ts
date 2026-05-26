import { Injectable, inject } from '@angular/core';
import { Observable, map, shareReplay } from 'rxjs';
import { CrudApiService } from './crud-api.service';
import type { KpSelectOption } from '../ui/kp-select.component';
import type { ICounterparty } from '../../../../shared/types/counterparty.interface';

/** Справочник контрагентов для выпадающих списков в формах CRUD. */
@Injectable({ providedIn: 'root' })
export class CounterpartyOptionsService {
  private readonly api = inject(CrudApiService);
  private cached$?: Observable<KpSelectOption[]>;

  load(): Observable<KpSelectOption[]> {
    if (!this.cached$) {
      this.cached$ = this.api
        .list<ICounterparty>('/directories/counterparties', { limit: 500, page: 1 })
        .pipe(
          map((res) =>
            res.data
              .filter((c) => c._id)
              .map((c) => ({
                label: c.shortName?.trim() || c.name,
                value: c._id as string,
              }))
              .sort((a, b) => a.label.localeCompare(b.label, 'ru')),
          ),
          shareReplay(1),
        );
    }
    return this.cached$;
  }
}
