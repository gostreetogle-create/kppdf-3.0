import { inject, DestroyRef } from '@angular/core';
import { CrudStore } from '../../shared/services/crud-store.service';
import { CrudApiService } from '../../shared/services/crud-api.service';
import { NotificationService } from '../../core/notification.service';
import type { IProduct } from '../../../../shared/types/product.interface';

/**
 * Создаёт экземпляр CrudStore<IProduct> для работы с продуктами.
 * Используется как обычная функция (не DI), результат присваивается полю компонента.
 */
export function createProductsStore(
  destroyRef: DestroyRef,
): CrudStore<IProduct> {
  const api = inject(CrudApiService);
  const notification = inject(NotificationService);

  return new CrudStore<IProduct>(api, {
    basePath: '/products',
    defaultLimit: 15,
    defaultSortField: 'createdAt',
    defaultSortOrder: -1,
    onError: (msg: string) => notification.error('Ошибка', msg),
    onSuccess: (msg: string) => notification.success('Успех', msg),
  }, destroyRef);
}
