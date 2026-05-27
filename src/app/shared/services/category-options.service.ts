import { Injectable, inject } from '@angular/core';
import { Observable, map, shareReplay } from 'rxjs';
import { CrudApiService } from './crud-api.service';
import type { KpSelectOption } from '../ui/kp-select.component';
import type { ICategory } from '../../../../shared/types/category.interface';

/** Справочник категорий для выпадающих списков в формах CRUD. */
@Injectable({ providedIn: 'root' })
export class CategoryOptionsService {
  private readonly api = inject(CrudApiService);
  private cached$?: Observable<KpSelectOption[]>;

  load(): Observable<KpSelectOption[]> {
    if (!this.cached$) {
      this.cached$ = this.api
        .list<ICategory>('/directories/categories', { limit: 500, page: 1 })
        .pipe(
          map((res) =>
            res.data
              .filter((c) => c._id && c.isActive !== false)
              .map((c) => ({
                label: c.fullPath?.trim() || c.name,
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
