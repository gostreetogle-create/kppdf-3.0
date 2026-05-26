import { Injectable, inject } from '@angular/core';
import { Observable, map, shareReplay } from 'rxjs';
import { CrudApiService } from './crud-api.service';
import type { KpSelectOption } from '../ui/kp-select.component';
import type { IQuotation } from '../../../../shared/types/quotation.interface';

/** Коммерческие предложения для связей (заказы и т.д.). */
@Injectable({ providedIn: 'root' })
export class QuotationOptionsService {
  private readonly api = inject(CrudApiService);
  private cached$?: Observable<KpSelectOption[]>;

  load(): Observable<KpSelectOption[]> {
    if (!this.cached$) {
      this.cached$ = this.api
        .list<IQuotation>('/directories/quotations', { limit: 500, page: 1 })
        .pipe(
          map((res) =>
            res.data
              .filter((q) => q._id)
              .map((q) => ({
                label: q.number,
                value: q._id as string,
              }))
              .sort((a, b) => a.label.localeCompare(b.label, 'ru')),
          ),
          shareReplay(1),
        );
    }
    return this.cached$;
  }
}
