export interface IRole {
  _id?: string;
  name: string;
  label: string;
  description?: string;
  permissions: string[];
  isSystem: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Полный справочник всех разрешений системы.
 * Группировка по бизнес-секциям:
 *   office     — Офис и продажи
 *   production — Производство
 *   accounting — Финансы и бухгалтерия
 *   warehouse  — Склад и логистика
 *   admin      — Администрирование
 */
export const ALL_PERMISSIONS = [
  // ======== OFFICE (Офис и продажи) ========
  { code: 'office.tenders.view', label: 'Просмотр запросов', group: 'office' },
  { code: 'office.tenders.create', label: 'Создание запросов', group: 'office' },
  { code: 'office.tenders.edit', label: 'Редактирование запросов', group: 'office' },
  { code: 'office.tenders.delete', label: 'Удаление запросов', group: 'office' },

  { code: 'office.quotations.view', label: 'Просмотр КП', group: 'office' },
  { code: 'office.quotations.create', label: 'Создание КП', group: 'office' },
  { code: 'office.quotations.edit', label: 'Редактирование КП', group: 'office' },
  { code: 'office.quotations.delete', label: 'Удаление КП', group: 'office' },
  { code: 'office.quotations.approve', label: 'Утверждение КП', group: 'office' },

  { code: 'office.orders.view', label: 'Просмотр заказов', group: 'office' },
  { code: 'office.orders.create', label: 'Создание заказов', group: 'office' },
  { code: 'office.orders.edit', label: 'Редактирование заказов', group: 'office' },
  { code: 'office.orders.delete', label: 'Удаление заказов', group: 'office' },
  { code: 'office.orders.approve', label: 'Утверждение заказов', group: 'office' },

  { code: 'office.counterparties.view', label: 'Просмотр контрагентов', group: 'office' },
  { code: 'office.counterparties.create', label: 'Создание контрагентов', group: 'office' },
  { code: 'office.counterparties.edit', label: 'Редактирование контрагентов', group: 'office' },
  { code: 'office.counterparties.delete', label: 'Удаление контрагентов', group: 'office' },

  { code: 'office.interactions.view', label: 'Просмотр истории', group: 'office' },
  { code: 'office.interactions.create', label: 'Добавление записи', group: 'office' },
  { code: 'office.interactions.edit', label: 'Редактирование записи', group: 'office' },

  { code: 'office.products.view', label: 'Просмотр товаров', group: 'office' },

  // ======== PRODUCTION (Производство) ========
  { code: 'production.products.edit', label: 'Редактирование тех. полей', group: 'production' },

  { code: 'production.boms.view', label: 'Просмотр BOM', group: 'production' },
  { code: 'production.boms.create', label: 'Создание BOM', group: 'production' },
  { code: 'production.boms.edit', label: 'Редактирование BOM', group: 'production' },
  { code: 'production.boms.delete', label: 'Удаление BOM', group: 'production' },

  { code: 'production.techProcesses.view', label: 'Просмотр техпроцессов', group: 'production' },
  { code: 'production.techProcesses.create', label: 'Создание техпроцессов', group: 'production' },
  { code: 'production.techProcesses.edit', label: 'Редактирование техпроцессов', group: 'production' },
  { code: 'production.techProcesses.delete', label: 'Удаление техпроцессов', group: 'production' },

  { code: 'production.operations.view', label: 'Просмотр операций', group: 'production' },
  { code: 'production.operations.create', label: 'Создание операций', group: 'production' },
  { code: 'production.operations.edit', label: 'Редактирование операций', group: 'production' },
  { code: 'production.operations.delete', label: 'Удаление операций', group: 'production' },

  { code: 'production.workOrders.view', label: 'Просмотр нарядов', group: 'production' },
  { code: 'production.workOrders.create', label: 'Создание нарядов', group: 'production' },
  { code: 'production.workOrders.edit', label: 'Редактирование нарядов', group: 'production' },
  { code: 'production.workOrders.delete', label: 'Удаление нарядов', group: 'production' },

  { code: 'production.workOrderOperations.view', label: 'Просмотр операций нарядов', group: 'production' },
  { code: 'production.workOrderOperations.create', label: 'Выполнение операции', group: 'production' },
  { code: 'production.workOrderOperations.edit', label: 'Корректировка операции', group: 'production' },

  { code: 'production.productPassports.view', label: 'Просмотр паспортов', group: 'production' },
  { code: 'production.productPassports.create', label: 'Создание паспортов', group: 'production' },
  { code: 'production.productPassports.edit', label: 'Редактирование паспортов', group: 'production' },
  { code: 'production.productPassports.delete', label: 'Удаление паспортов', group: 'production' },

  // ======== ACCOUNTING (Финансы) ========
  { code: 'accounting.costCalculations.view', label: 'Просмотр калькуляций', group: 'accounting' },
  { code: 'accounting.costCalculations.create', label: 'Создание калькуляций', group: 'accounting' },
  { code: 'accounting.costCalculations.edit', label: 'Редактирование калькуляций', group: 'accounting' },

  { code: 'accounting.actualCosts.view', label: 'Просмотр затрат', group: 'accounting' },
  { code: 'accounting.actualCosts.create', label: 'Добавление затрат', group: 'accounting' },
  { code: 'accounting.actualCosts.edit', label: 'Корректировка затрат', group: 'accounting' },

  { code: 'accounting.shippingDocs.view', label: 'Просмотр отгруз. документов', group: 'accounting' },
  { code: 'accounting.shippingDocs.create', label: 'Создание отгруз. документов', group: 'accounting' },
  { code: 'accounting.shippingDocs.edit', label: 'Редактирование отгруз. документов', group: 'accounting' },
  { code: 'accounting.shippingDocs.delete', label: 'Удаление отгруз. документов', group: 'accounting' },

  { code: 'accounting.orders.view', label: 'Просмотр заказов (фин.)', group: 'accounting' },
  { code: 'accounting.counterparties.view', label: 'Просмотр реквизитов', group: 'accounting' },

  // ======== WAREHOUSE (Склад и логистика) ========
  { code: 'warehouse.warehouses.view', label: 'Просмотр складов', group: 'warehouse' },
  { code: 'warehouse.warehouses.create', label: 'Создание складов', group: 'warehouse' },
  { code: 'warehouse.warehouses.edit', label: 'Редактирование складов', group: 'warehouse' },

  { code: 'warehouse.stockMovements.view', label: 'Просмотр движений', group: 'warehouse' },
  { code: 'warehouse.stockMovements.create', label: 'Создание движений', group: 'warehouse' },
  { code: 'warehouse.stockMovements.edit', label: 'Корректировка движений', group: 'warehouse' },

  { code: 'warehouse.reservations.view', label: 'Просмотр резервов', group: 'warehouse' },
  { code: 'warehouse.reservations.create', label: 'Создание резервов', group: 'warehouse' },
  { code: 'warehouse.reservations.edit', label: 'Редактирование резервов', group: 'warehouse' },
  { code: 'warehouse.reservations.delete', label: 'Удаление резервов', group: 'warehouse' },

  { code: 'warehouse.purchaseRequests.view', label: 'Просмотр заявок на закуп', group: 'warehouse' },
  { code: 'warehouse.purchaseRequests.create', label: 'Создание заявок на закуп', group: 'warehouse' },
  { code: 'warehouse.purchaseRequests.edit', label: 'Редактирование заявок на закуп', group: 'warehouse' },
  { code: 'warehouse.purchaseRequests.delete', label: 'Удаление заявок на закуп', group: 'warehouse' },
  { code: 'warehouse.purchaseRequests.approve', label: 'Утверждение заявок на закуп', group: 'warehouse' },

  { code: 'warehouse.purchaseOrders.view', label: 'Просмотр заказов поставщикам', group: 'warehouse' },
  { code: 'warehouse.purchaseOrders.create', label: 'Создание заказов поставщикам', group: 'warehouse' },
  { code: 'warehouse.purchaseOrders.edit', label: 'Редактирование заказов поставщикам', group: 'warehouse' },
  { code: 'warehouse.purchaseOrders.delete', label: 'Удаление заказов поставщикам', group: 'warehouse' },

  { code: 'warehouse.shipments.view', label: 'Просмотр отгрузок', group: 'warehouse' },
  { code: 'warehouse.shipments.create', label: 'Создание отгрузок', group: 'warehouse' },
  { code: 'warehouse.shipments.edit', label: 'Редактирование отгрузок', group: 'warehouse' },
  { code: 'warehouse.shipments.delete', label: 'Удаление отгрузок', group: 'warehouse' },

  { code: 'warehouse.products.view', label: 'Просмотр остатков', group: 'warehouse' },

  // ======== ADMIN (Администрирование) ========
  { code: 'admin.users.view', label: 'Просмотр пользователей', group: 'admin' },
  { code: 'admin.users.create', label: 'Создание пользователей', group: 'admin' },
  { code: 'admin.users.edit', label: 'Редактирование пользователей', group: 'admin' },
  { code: 'admin.users.delete', label: 'Удаление пользователей', group: 'admin' },

  { code: 'admin.roles.view', label: 'Просмотр ролей', group: 'admin' },
  { code: 'admin.roles.create', label: 'Создание ролей', group: 'admin' },
  { code: 'admin.roles.edit', label: 'Редактирование ролей', group: 'admin' },
  { code: 'admin.roles.delete', label: 'Удаление ролей', group: 'admin' },

  { code: 'admin.settings.view', label: 'Просмотр настроек', group: 'admin' },
  { code: 'admin.settings.edit', label: 'Редактирование настроек', group: 'admin' },

  { code: 'admin.categories.view', label: 'Просмотр категорий', group: 'admin' },
  { code: 'admin.categories.create', label: 'Создание категорий', group: 'admin' },
  { code: 'admin.categories.edit', label: 'Редактирование категорий', group: 'admin' },
  { code: 'admin.categories.delete', label: 'Удаление категорий', group: 'admin' },

  { code: 'admin.statuses.view', label: 'Просмотр статусов', group: 'admin' },
  { code: 'admin.statuses.create', label: 'Создание статусов', group: 'admin' },
  { code: 'admin.statuses.edit', label: 'Редактирование статусов', group: 'admin' },
  { code: 'admin.statuses.delete', label: 'Удаление статусов', group: 'admin' },

  { code: 'admin.workTypes.view', label: 'Просмотр типов работ', group: 'admin' },
  { code: 'admin.workTypes.create', label: 'Создание типов работ', group: 'admin' },
  { code: 'admin.workTypes.edit', label: 'Редактирование типов работ', group: 'admin' },
  { code: 'admin.workTypes.delete', label: 'Удаление типов работ', group: 'admin' },

  { code: 'admin.counters.view', label: 'Просмотр счётчиков', group: 'admin' },
  { code: 'admin.counters.edit', label: 'Корректировка счётчиков', group: 'admin' },
] as const;
