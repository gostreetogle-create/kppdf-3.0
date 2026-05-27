import { inject, DestroyRef } from '@angular/core';
import { CrudStore } from '../../shared/services/crud-store.service';
import { CrudApiService } from '../../shared/services/crud-api.service';
import { NotificationService } from '../../core/notification.service';
import type { IAttributeDefinition } from '../../../../shared/types/attributeDefinition.interface';

export function createAttributeDefinitionsStore(
  destroyRef: DestroyRef,
): CrudStore<IAttributeDefinition> {
  const api = inject(CrudApiService);
  const notification = inject(NotificationService);

  return new CrudStore<IAttributeDefinition>(api, {
    basePath: '/attributes/definitions',
    defaultLimit: 15,
    defaultSortField: 'sortOrder',
    defaultSortOrder: 1,
    onError: (msg: string) => notification.error('Ошибка', msg),
    onSuccess: (msg: string) => notification.success('Успех', msg),
  }, destroyRef);
}
