import { Injectable, inject } from '@angular/core';
import { Observable, map, shareReplay } from 'rxjs';
import { CrudApiService } from './crud-api.service';
import type { KpSelectOption } from '../ui/kp-select.component';
import type { ITender } from '../../../../shared/types/tender.interface';

/** Справочник тендеров для выпадающих списков в формах CRUD. */
@Injectable({ providedIn: 'root' })
export class TenderOptionsService {
  private readonly api = inject(CrudApiService);
  private cached$?: Observable<KpSelectOption[]>;

  load(): Observable<KpSelectOption[]> {
    if (!this.cached$) {
      this.cached$ = this.api
        .list<ITender>('/directories/tenders', { limit: 500, page: 1 })
        .pipe(
          map((res) =>
            res.data
              .filter((t) => t._id)
              .map((t) => ({
                label: `${t.number} — ${t.subject || 'Без темы'}`,
                value: t._id as string,
              }))
              .sort((a, b) => a.label.localeCompare(b.label, 'ru')),
          ),
          shareReplay(1),
        );
    }
    return this.cached$;
  }
}
