/**
 * KPPDF 3.0 — Единый реестр разрешений (Permissions).
 *
 * Единственный источник правды о permission-строках.
 * Используется в компонентах, директивах и гардах.
 *
 * Формат: { module }.{ entity }.{ action }
 *   module  — admin / office / production / warehouse / accounting
 *   entity  — products / tenders / boms / …
 *   action  — view / create / edit / delete
 *
 * Плохо: хардкодить 'office.products.view' в 10 местах.
 * Хорошо: PERMISSIONS.products.view — один раз здесь, TypeScript подскажет.
 */

// ── Тип для безопасного доступа к действиям ────────────────────
export interface PermissionActions {
  view: string;
  create: string;
  edit: string;
  delete: string;
}

// ── Справочники ───────────────────────────────────────────────
const dirEntries = {
  products:       { view: 'office.products.view',         create: 'office.products.create',         edit: 'office.products.edit',         delete: 'office.products.delete' },
  categories:     { view: 'admin.categories.view',        create: 'admin.categories.create',        edit: 'admin.categories.edit',        delete: 'admin.categories.delete' },
  counterparties: { view: 'office.counterparties.view',    create: 'office.counterparties.create',    edit: 'office.counterparties.edit',    delete: 'office.counterparties.delete' },
  users:          { view: 'admin.users.view',             create: 'admin.users.create',             edit: 'admin.users.edit',             delete: 'admin.users.delete' },
  roles:          { view: 'admin.roles.view',             create: 'admin.roles.create',             edit: 'admin.roles.edit',             delete: 'admin.roles.delete' },
  statuses:       { view: 'admin.statuses.view',          create: 'admin.statuses.create',          edit: 'admin.statuses.edit',          delete: 'admin.statuses.delete' },
  workTypes:      { view: 'admin.workTypes.view',         create: 'admin.workTypes.create',         edit: 'admin.workTypes.edit',         delete: 'admin.workTypes.delete' },
  settings:       { view: 'admin.settings.view',          create: 'admin.settings.create',          edit: 'admin.settings.edit',          delete: 'admin.settings.delete' },
  attributes:     { view: 'admin.attributes.view',        create: 'admin.attributes.create',        edit: 'admin.attributes.edit',        delete: 'admin.attributes.delete' },
} satisfies Record<string, PermissionActions>;

// ── Бизнес-процессы ───────────────────────────────────────────
const moduleEntries = {
  tenders:              { view: 'office.tenders.view',                 create: 'office.tenders.create',                 edit: 'office.tenders.edit',                 delete: 'office.tenders.delete' },
  'product-passports':  { view: 'production.productPassports.view',    create: 'production.productPassports.create',    edit: 'production.productPassports.edit',    delete: 'production.productPassports.delete' },
  quotations:           { view: 'office.quotations.view',              create: 'office.quotations.create',              edit: 'office.quotations.edit',              delete: 'office.quotations.delete' },
  orders:               { view: 'office.orders.view',                  create: 'office.orders.create',                  edit: 'office.orders.edit',                  delete: 'office.orders.delete' },
  boms:                 { view: 'production.boms.view',                create: 'production.boms.create',                edit: 'production.boms.edit',                delete: 'production.boms.delete' },
  operations:           { view: 'production.operations.view',          create: 'production.operations.create',          edit: 'production.operations.edit',          delete: 'production.operations.delete' },
  'tech-processes':     { view: 'production.techProcesses.view',       create: 'production.techProcesses.create',       edit: 'production.techProcesses.edit',       delete: 'production.techProcesses.delete' },
  'purchase-requests':  { view: 'warehouse.purchaseRequests.view',     create: 'warehouse.purchaseRequests.create',     edit: 'warehouse.purchaseRequests.edit',     delete: 'warehouse.purchaseRequests.delete' },
  'purchase-orders':    { view: 'warehouse.purchaseOrders.view',       create: 'warehouse.purchaseOrders.create',       edit: 'warehouse.purchaseOrders.edit',       delete: 'warehouse.purchaseOrders.delete' },
  warehouses:           { view: 'warehouse.warehouses.view',            create: 'warehouse.warehouses.create',            edit: 'warehouse.warehouses.edit',            delete: 'warehouse.warehouses.delete' },
  'stock-movements':    { view: 'warehouse.stockMovements.view',       create: 'warehouse.stockMovements.create',       edit: 'warehouse.stockMovements.edit',       delete: 'warehouse.stockMovements.delete' },
  reservations:         { view: 'warehouse.reservations.view',         create: 'warehouse.reservations.create',         edit: 'warehouse.reservations.edit',         delete: 'warehouse.reservations.delete' },
  'work-orders':        { view: 'production.workOrders.view',          create: 'production.workOrders.create',          edit: 'production.workOrders.edit',          delete: 'production.workOrders.delete' },
  'work-order-operations': { view: 'production.workOrderOperations.view',  create: 'production.workOrderOperations.create',  edit: 'production.workOrderOperations.edit',  delete: 'production.workOrderOperations.delete' },
  'cost-calculations':  { view: 'accounting.costCalculations.view',    create: 'accounting.costCalculations.create',    edit: 'accounting.costCalculations.edit',    delete: 'accounting.costCalculations.delete' },
  'actual-costs':       { view: 'accounting.actualCosts.view',         create: 'accounting.actualCosts.create',         edit: 'accounting.actualCosts.edit',         delete: 'accounting.actualCosts.delete' },
  shipments:            { view: 'warehouse.shipments.view',             create: 'warehouse.shipments.create',             edit: 'warehouse.shipments.edit',             delete: 'warehouse.shipments.delete' },
  'shipping-docs':      { view: 'accounting.shippingDocs.view',        create: 'accounting.shippingDocs.create',        edit: 'accounting.shippingDocs.edit',        delete: 'accounting.shippingDocs.delete' },
  counters:             { view: 'admin.counters.view',                 create: 'admin.counters.create',                 edit: 'admin.counters.edit',                 delete: 'admin.counters.delete' },
  interactions:         { view: 'office.interactions.view',            create: 'office.interactions.create',            edit: 'office.interactions.edit',            delete: 'office.interactions.delete' },
  'document-templates': { view: 'office.documentTemplates.view',        create: 'office.documentTemplates.create',        edit: 'office.documentTemplates.edit',        delete: 'office.documentTemplates.delete' },
  'document-table-types': { view: 'admin.documentTableTypes.view',      create: 'admin.documentTableTypes.create',      edit: 'admin.documentTableTypes.edit',      delete: 'admin.documentTableTypes.delete' },
} satisfies Record<string, PermissionActions>;

// ── Единый PERMISSIONS объект ────────────────────────────────
export const PERMISSIONS = {
  ...dirEntries,
  ...moduleEntries,
} as const;


// ── Backward-compatible префикс-мапы ─────────────────────────
// Используются в шаблонах для динамической сборки строк:
//   *appHasPermission="(MODULE_PERM_PREFIX[activeKey()] || 'office.') + '.create'"
// Убраны fallback-строки — ошибка теперь будет явной, а не тихой.

/** Префиксы для модулей (Бизнес-процессы) */
export const MODULE_PERM_PREFIX: Record<string, string> = {
  tenders: 'office.tenders',
  'product-passports': 'production.productPassports',
  quotations: 'office.quotations',
  orders: 'office.orders',
  boms: 'production.boms',
  operations: 'production.operations',
  'tech-processes': 'production.techProcesses',
  'purchase-requests': 'warehouse.purchaseRequests',
  'purchase-orders': 'warehouse.purchaseOrders',
  warehouses: 'warehouse.warehouses',
  'stock-movements': 'warehouse.stockMovements',
  reservations: 'warehouse.reservations',
  'work-orders': 'production.workOrders',
  'work-order-operations': 'production.workOrderOperations',
  'cost-calculations': 'accounting.costCalculations',
  'actual-costs': 'accounting.actualCosts',
  shipments: 'warehouse.shipments',
  'shipping-docs': 'accounting.shippingDocs',
  counters: 'admin.counters',
  interactions: 'office.interactions',
};

/** Префиксы для справочников */
export const DIR_PERM_PREFIX: Record<string, string> = {
  products: 'office.products',
  categories: 'admin.categories',
  counterparties: 'office.counterparties',
  users: 'admin.users',
  roles: 'admin.roles',
  statuses: 'admin.statuses',
  'work-types': 'admin.workTypes',
  settings: 'admin.settings',
  attributes: 'admin.attributes',
  'document-table-types': 'admin.documentTableTypes',
};
