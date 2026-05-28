import { Injectable, inject } from '@angular/core';
import { Observable, map, shareReplay } from 'rxjs';
import { CrudApiService } from './crud-api.service';
import type { KpSelectOption } from '../ui/kp-select.component';
import type { IDocumentTableType } from '../../../../shared/types/documentTableType.interface';

/** Загружает настраиваемые типы таблиц для выпадающего списка в редакторе документов. */
@Injectable({ providedIn: 'root' })
export class DocumentTableTypeOptionsService {
  private readonly api = inject(CrudApiService);

  /** Кеш: docType → Observable полных типов (один HTTP-запрос для load + loadFullTypes) */
  private readonly _fullCache = new Map<string, Observable<IDocumentTableType[]>>();

  /** Общий стрим: фильтрация + сортировка полных типов, один HTTP на docType */
  private fetchTypes(docType: string): Observable<IDocumentTableType[]> {
    const cached = this._fullCache.get(docType);
    if (cached) return cached;

    const stream = this.api
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
            .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
        ),
        shareReplay(1),
      );

    this._fullCache.set(docType, stream);
    return stream;
  }

  /** Получить список типов таблиц для указанного docType (из общего кеша с loadFullTypes) */
  load(docType = 'quotation'): Observable<KpSelectOption[]> {
    return this.fetchTypes(docType).pipe(
      map((types) =>
        types.map((t) => ({
          label: t.label || t.title || t.name,
          value: t.name,
        })),
      ),
    );
  }

  /** Получить полные данные типов таблиц (с dataSource, columns и пр.) — тот же стрим, что и load() */
  loadFullTypes(docType = 'quotation'): Observable<IDocumentTableType[]> {
    return this.fetchTypes(docType);
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
