import { inject, DestroyRef } from '@angular/core';
import { CrudStore } from '../../shared/services/crud-store.service';
import { CrudApiService } from '../../shared/services/crud-api.service';
import { NotificationService } from '../../core/notification.service';
import { MODULE_CONFIGS, type ModuleKey } from './modules.config';

function createModuleStore(
  basePath: string,
  api: CrudApiService,
  notification: NotificationService,
  destroyRef: DestroyRef,
): CrudStore<object> {
  return new CrudStore<object>(api, {
    basePath,
    defaultLimit: 15,
    onError: (msg: string) => notification.error('Ошибка', msg),
    onSuccess: (msg: string) => notification.success('Успех', msg),
  }, destroyRef);
}

export type ModuleStores = Record<ModuleKey, CrudStore<object>>;

export function createModuleStores(destroyRef: DestroyRef): ModuleStores {
  const api = inject(CrudApiService);
  const notification = inject(NotificationService);

  const stores = {} as ModuleStores;
  for (const mod of MODULE_CONFIGS) {
    stores[mod.key] = createModuleStore(mod.basePath, api, notification, destroyRef);
  }
  return stores;
}
