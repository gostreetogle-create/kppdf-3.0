import type { KpColumn } from '../../shared/ui';

export type ColumnRef =
  | 'counterparty'
  | 'product'
  | 'order'
  | 'warehouse'
  | 'shipment'
  | 'workOrder'
  | 'operation';

export interface ColumnDef {
  field: string;
  header: string;
  type: 'text' | 'number' | 'select' | 'boolean' | 'tag' | 'date' | 'textarea';
  ref?: ColumnRef;
  options?: { label: string; value: string }[];
  required?: boolean;
  readonly?: boolean;
  width?: string;
}

export interface ModuleConfig {
  key: ModuleKey;
  label: string;
  icon: string;
  basePath: string;
  idField: string;
  columns: ColumnDef[];
}

export type ModuleKey =
  | 'boms'
  | 'operations'
  | 'tech-processes'
  | 'purchase-requests'
  | 'warehouses'
  | 'stock-movements'
  | 'reservations'
  | 'work-order-operations'
  | 'cost-calculations'
  | 'actual-costs'
  | 'shipping-docs'
  | 'counters'
  | 'interactions';

export const DEPARTMENTS: { id: string; label: string; icon: string }[] = [
  { id: 'office', label: 'Офис', icon: 'pi pi-building' },
  { id: 'production', label: 'Производство', icon: 'pi pi-cog' },
  { id: 'warehouse', label: 'Склад', icon: 'pi pi-warehouse' },
  { id: 'accounting', label: 'Бухгалтерия', icon: 'pi pi-calculator' },
  { id: 'admin', label: 'Администрирование', icon: 'pi pi-shield' },
];

export const MODULE_ENTITY_LABEL: Record<ModuleKey, string> = {
  boms: 'спецификации BOM',
  operations: 'операции',
  'tech-processes': 'техпроцесса',
  'purchase-requests': 'заявки на закупку',
  warehouses: 'склада',
  'stock-movements': 'движения',
  reservations: 'резерва',
  'work-order-operations': 'операции наряда',
  'cost-calculations': 'калькуляции',
  'actual-costs': 'фактических затрат',
  'shipping-docs': 'отгрузочного документа',
  counters: 'счётчика',
  interactions: 'взаимодействия',
};

export const MODULE_DEPT: Record<ModuleKey, string> = {
  interactions: 'office',
  boms: 'production',
  operations: 'production',
  'tech-processes': 'production',
  'work-order-operations': 'production',
  'purchase-requests': 'warehouse',
  warehouses: 'warehouse',
  'stock-movements': 'warehouse',
  reservations: 'warehouse',
  'cost-calculations': 'accounting',
  'actual-costs': 'accounting',
  'shipping-docs': 'accounting',
  counters: 'admin',
};

export const MODULE_CONFIGS: ModuleConfig[] = [
  {
    key: 'boms',
    label: 'BOM',
    icon: 'pi pi-sitemap',
    basePath: '/directories/boms',
    idField: '_id',
    columns: [
      { field: 'productId', header: 'Товар', type: 'text', ref: 'product' },
      { field: 'version', header: 'Версия', type: 'number', width: '90px' },
      { field: 'isActive', header: 'Активна', type: 'boolean', width: '100px' },
    ],
  },
  {
    key: 'operations',
    label: 'Операции',
    icon: 'pi pi-cog',
    basePath: '/directories/operations',
    idField: '_id',
    columns: [
      { field: 'number', header: '№', type: 'number', width: '60px' },
      { field: 'name', header: 'Название', type: 'text' },
      { field: 'workshop', header: 'Цех', type: 'text' },
      { field: 'duration', header: 'Длит. (ч)', type: 'number', width: '100px' },
      { field: 'costPerHour', header: 'Ст-ть часа', type: 'number', width: '110px' },
      { field: 'isActive', header: 'Активна', type: 'boolean', width: '100px' },
    ],
  },
  {
    key: 'tech-processes',
    label: 'Техпроцессы',
    icon: 'pi pi-chart-scatter',
    basePath: '/directories/tech-processes',
    idField: '_id',
    columns: [
      { field: 'productId', header: 'Товар', type: 'text', ref: 'product' },
      { field: 'totalDuration', header: 'Длит. (ч)', type: 'number', width: '110px' },
      { field: 'isActive', header: 'Активна', type: 'boolean', width: '100px' },
    ],
  },
  {
    key: 'purchase-requests',
    label: 'Заявки',
    icon: 'pi pi-send',
    basePath: '/directories/purchase-requests',
    idField: '_id',
    columns: [
      { field: 'number', header: 'Номер', type: 'text', width: '140px' },
      { field: 'date', header: 'Дата', type: 'date', width: '120px' },
      { field: 'statusId', header: 'Статус', type: 'tag', width: '110px', options: [{ label: 'Черновик', value: 'draft' }, { label: 'Отправлена', value: 'sent' }, { label: 'Утверждена', value: 'approved' }, { label: 'Отменена', value: 'cancelled' }] },
    ],
  },
  {
    key: 'warehouses',
    label: 'Склады',
    icon: 'pi pi-home',
    basePath: '/directories/warehouses',
    idField: '_id',
    columns: [
      { field: 'name', header: 'Название', type: 'text' },
      { field: 'type', header: 'Тип', type: 'tag', width: '140px', options: [{ label: 'Сырьё', value: 'raw_materials' }, { label: 'Производство', value: 'production' }, { label: 'Готовая продукция', value: 'finished_goods' }] },
      { field: 'address', header: 'Адрес', type: 'text' },
      { field: 'isActive', header: 'Активен', type: 'boolean', width: '100px' },
    ],
  },
  {
    key: 'stock-movements',
    label: 'Движения',
    icon: 'pi pi-arrow-right-arrow-left',
    basePath: '/stock/movements',
    idField: '_id',
    columns: [
      { field: 'date', header: 'Дата', type: 'date', width: '120px' },
      { field: 'type', header: 'Тип', type: 'tag', width: '130px', options: [{ label: 'Поступление', value: 'receipt' }, { label: 'Списание', value: 'write_off' }, { label: 'Перемещение (приход)', value: 'transfer_in' }, { label: 'Перемещение (расход)', value: 'transfer_out' }] },
      { field: 'productId', header: 'Товар', type: 'text', ref: 'product' },
      { field: 'warehouseId', header: 'Склад', type: 'text', ref: 'warehouse' },
      { field: 'qty', header: 'Кол-во', type: 'number', width: '100px' },
    ],
  },
  {
    key: 'reservations',
    label: 'Резервы',
    icon: 'pi pi-lock',
    basePath: '/stock/reservations',
    idField: '_id',
    columns: [
      { field: 'orderId', header: 'Заказ', type: 'text', ref: 'order' },
      { field: 'isActive', header: 'Активен', type: 'boolean', width: '100px' },
    ],
  },
  {
    key: 'work-order-operations',
    label: 'Операции нар.',
    icon: 'pi pi-list-check',
    basePath: '/directories/work-order-operations',
    idField: '_id',
    columns: [
      { field: 'workOrderId', header: 'Наряд', type: 'text', ref: 'workOrder' },
      { field: 'operationId', header: 'Операция', type: 'text', ref: 'operation' },
      { field: 'order', header: '№', type: 'number', width: '50px' },
      { field: 'statusId', header: 'Статус', type: 'tag', width: '110px', options: [{ label: 'Ожидает', value: 'pending' }, { label: 'В работе', value: 'in_progress' }, { label: 'Выполнена', value: 'completed' }, { label: 'Отменена', value: 'cancelled' }] },
    ],
  },
  {
    key: 'cost-calculations',
    label: 'Калькуляции',
    icon: 'pi pi-calculator',
    basePath: '/cost',
    idField: '_id',
    columns: [
      { field: 'productId', header: 'Товар', type: 'text', ref: 'product' },
      { field: 'bomVersion', header: 'BOM', type: 'number', width: '70px' },
      { field: 'isActive', header: 'Активна', type: 'boolean', width: '100px' },
    ],
  },
  {
    key: 'actual-costs',
    label: 'Факт. затраты',
    icon: 'pi pi-money-bill',
    basePath: '/directories/actual-costs',
    idField: '_id',
    columns: [
      { field: 'orderId', header: 'Заказ', type: 'text', ref: 'order' },
      { field: 'type', header: 'Тип', type: 'tag', width: '120px', options: [{ label: 'Материалы', value: 'material' }, { label: 'Работы', value: 'labor' }, { label: 'Накладные', value: 'overhead' }] },
      { field: 'amount', header: 'Сумма', type: 'number', width: '120px' },
      { field: 'date', header: 'Дата', type: 'date', width: '120px' },
    ],
  },
  {
    key: 'shipping-docs',
    label: 'Отгруз. док.',
    icon: 'pi pi-file',
    basePath: '/directories/shipping-docs',
    idField: '_id',
    columns: [
      { field: 'number', header: 'Номер', type: 'text', width: '140px', readonly: true },
      { field: 'date', header: 'Дата', type: 'date', width: '120px' },
      { field: 'type', header: 'Тип', type: 'tag', width: '110px', options: [{ label: 'ТОРГ-12', value: 'torg12' }, { label: 'ТТН', value: 'ttn' }, { label: 'Счёт-фактура', value: 'invoice' }] },
      { field: 'shipmentId', header: 'Отгрузка', type: 'text', ref: 'shipment' },
      { field: 'totalAmount', header: 'Сумма', type: 'number', width: '120px' },
    ],
  },
  {
    key: 'counters',
    label: 'Счётчики',
    icon: 'pi pi-hashtag',
    basePath: '/counters',
    idField: '_id',
    columns: [
      { field: 'entity', header: 'Сущность', type: 'text' },
      { field: 'prefix', header: 'Префикс', type: 'text', width: '100px' },
      { field: 'year', header: 'Год', type: 'number', width: '80px' },
      { field: 'seq', header: 'След. №', type: 'number', width: '90px' },
    ],
  },
  {
    key: 'interactions',
    label: 'Взаимод.',
    icon: 'pi pi-comments',
    basePath: '/directories/interactions',
    idField: '_id',
    columns: [
      { field: 'counterpartyId', header: 'Контрагент', type: 'text', ref: 'counterparty' },
      { field: 'type', header: 'Тип', type: 'tag', width: '110px', options: [{ label: 'Звонок', value: 'call' }, { label: 'Email', value: 'email' }, { label: 'Встреча', value: 'meeting' }, { label: 'Заметка', value: 'note' }, { label: 'Система', value: 'system' }] },
      { field: 'description', header: 'Описание', type: 'text' },
    ],
  },
];

/** Колонки таблицы с подстановкой options для *Id полей */
export function buildModuleTableColumns(
  mod: ModuleConfig,
  refs: Record<ColumnRef, { label: string; value: string | number | boolean }[]>,
): KpColumn[] {
  return mod.columns.map((colDef) => {
    const { ref, ...rest } = colDef;
    const col: KpColumn = { ...rest, sortable: true };
    if (ref && refs[ref]?.length) {
      col.type = 'select';
      col.options = refs[ref];
    }
    return col;
  });
}
