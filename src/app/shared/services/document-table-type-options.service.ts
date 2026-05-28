import { Injectable, inject } from '@angular/core';
import { Observable, map, shareReplay } from 'rxjs';
import { CrudApiService } from './crud-api.service';
import type { KpSelectOption } from '../ui/kp-select.component';
import type { IDocumentTableType } from '../../../../shared/types/documentTableType.interface';

/** Загружает настраиваемые типы таблиц для выпадающего списка в редакторе документов. */
@Injectable({ providedIn: 'root' })
export class DocumentTableTypeOptionsService {
  private readonly api = inject(CrudApiService);

  /** Получить список типов таблиц для указанного docType */
  load(docType = 'quotation'): Observable<KpSelectOption[]> {
    return this.api
      .list<IDocumentTableType>('/document-table-types', {
        limit: 100,
        page: 1,
        all: true,
        filters: { docType },
      })
      .pipe(
        map((res) =>
          (res.data || [])
            .filter((t) => t.isActive !== false && t.name)
            .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
            .map((t) => ({
              label: t.label || t.title || t.name,
              value: t.name,
            })),
        ),
        shareReplay(1),
      );
  }

  /** Получить полные данные типа таблицы по name */
  loadFull(name: string): Observable<IDocumentTableType | undefined> {
    return this.api
      .list<IDocumentTableType>('/document-table-types', {
        limit: 1,
        page: 1,
        all: true,
        filters: { name },
      })
      .pipe(
        map((res) => res.data?.[0]),
        shareReplay(1),
      );
  }
}
