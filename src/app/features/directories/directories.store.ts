import { inject, DestroyRef } from '@angular/core';
import { CrudStore } from '../../shared/services/crud-store.service';
import { CrudApiService } from '../../shared/services/crud-api.service';
import { NotificationService } from '../../core/notification.service';

/**
 * Создаёт CrudStore для работы с конкретным справочником.
 * Вызывается (один раз) в поле компонента DirectoriesPageComponent.
 */
function createDirStore(
  basePath: string,
  api: CrudApiService,
  notification: NotificationService,
  destroyRef: DestroyRef,
): CrudStore<object> {
  return new CrudStore<object>(api, {
    basePath,
    defaultLimit: 25,
    onError: (msg: string) => notification.error('Ошибка', msg),
    onSuccess: (msg: string) => notification.success('Успех', msg),
  }, destroyRef);
}

/**
 * Набор CrudStore для всех 8 справочников.
 */
export interface DirStores {
  categories: CrudStore<object>;
  counterparties: CrudStore<object>;
  users: CrudStore<object>;
  roles: CrudStore<object>;
  statuses: CrudStore<object>;
  workTypes: CrudStore<object>;
  settings: CrudStore<object>;
}

export function createDirStores(destroyRef: DestroyRef): DirStores {
  const api = inject(CrudApiService);
  const notification = inject(NotificationService);

  return {
    categories:     createDirStore('/directories/categories',       api, notification, destroyRef),
    counterparties: createDirStore('/directories/counterparties',   api, notification, destroyRef),
    users:          createDirStore('/directories/users',            api, notification, destroyRef),
    roles:          createDirStore('/directories/roles',            api, notification, destroyRef),
    statuses:       createDirStore('/directories/statuses',         api, notification, destroyRef),
    workTypes:      createDirStore('/directories/work-types',       api, notification, destroyRef),
    settings:       createDirStore('/directories/settings',         api, notification, destroyRef),
  };
}
