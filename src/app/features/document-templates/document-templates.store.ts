import { inject, DestroyRef } from '@angular/core';
import { Router } from '@angular/router';
import { CrudStore } from '../../shared/services/crud-store.service';
import { CrudApiService } from '../../shared/services/crud-api.service';
import { NotificationService } from '../../core/notification.service';
import type { IDocumentTemplate, IDocumentBlock } from '../../../../shared/types/documentTemplate.interface';

const STARTER_BLOCKS: IDocumentBlock[] = [
  { type: 'header', order: 0, title: 'Заголовок', content: '{{doc.title}}', settings: { fontSize: 16, fontWeight: 'bold', align: 'center', paddingTop: 8, paddingBottom: 12 } },
  { type: 'text', order: 1, title: 'Содержание', content: '', settings: { fontSize: 11, fontWeight: 'normal', align: 'left', paddingTop: 8, paddingBottom: 8 } },
];

export function createDocumentTemplatesStore(
  destroyRef: DestroyRef,
): CrudStore<IDocumentTemplate> {
  const api = inject(CrudApiService);
  const notification = inject(NotificationService);
  const router = inject(Router);

  const store = new CrudStore<IDocumentTemplate>(api, {
    basePath: '/document-templates',
    defaultLimit: 25,
    defaultSortField: 'name',
    defaultSortOrder: 1,
    onError: (msg: string) => notification.error('Ошибка', msg),
    onSuccess: (msg: string) => notification.success('Успех', msg),
  }, destroyRef);

  // Wrap create: добавить STARTER_BLOCKS новым шаблонам + redirect в editor
  const originalCreate = store.create.bind(store);
  store.create = async (body: Record<string, unknown>): Promise<IDocumentTemplate | null> => {
    const enriched = {
      ...body,
      blocks: (body['blocks'] as IDocumentBlock[] | undefined) ?? STARTER_BLOCKS,
      pageSize: 'A4',
    };
    const result = await originalCreate(enriched);
    if (result) {
      void router.navigate(['/document-templates', result._id]);
    }
    return result;
  };

  return store;
}
