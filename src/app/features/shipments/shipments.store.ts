import { inject, DestroyRef } from '@angular/core';
import { CrudStore } from '../../shared/services/crud-store.service';
import { CrudApiService } from '../../shared/services/crud-api.service';
import { NotificationService } from '../../core/notification.service';
import type { IShipment } from '../../../../shared/types/shipment.interface';

export function createShipmentsStore(destroyRef: DestroyRef): CrudStore<IShipment> {
  const api = inject(CrudApiService);
  const notification = inject(NotificationService);

  return new CrudStore<IShipment>(api, {
    basePath: '/directories/shipments',
    defaultLimit: 15,
    defaultSortField: 'createdAt',
    defaultSortOrder: -1,
    onError: (msg: string) => notification.error('Ошибка', msg),
    onSuccess: (msg: string) => notification.success('Успех', msg),
  }, destroyRef);
}
