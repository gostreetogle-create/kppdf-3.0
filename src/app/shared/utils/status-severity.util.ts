/**
 * KPPDF 3.0 — Единые severity-карты для тегов (app-kp-tag).
 *
 * Централизованный источник severity: не дублировать severityFn в фичах.
 * Каждый модуль получает свою именованную функцию.
 *
 * Использование:
 *   import { quotationSeverity } from '../../shared/utils/status-severity.util';
 *   // в kp-crud-page: [severityFn]="quotationSeverity"
 */

import type { KpTagSeverity } from '../ui/kp-tag.component';

// ── Универсальная severity-карта (все значения из всех модулей) ──
const UNIVERSAL_SEVERITY: Record<string, KpTagSeverity> = {
  // order / quotation статусы
  draft: 'warn',
  sent: 'info',
  accepted: 'success',
  approved: 'success',
  confirmed: 'success',
  rejected: 'danger',
  expired: 'secondary',
  new: 'info',
  in_progress: 'warn',
  completed: 'success',
  cancelled: 'danger',

  // tender статусы
  kp_sent: 'info',
  won: 'success',
  lost: 'danger',

  // shipment статусы
  preparing: 'warn',
  shipped: 'info',
  delivered: 'success',

  // work-order статусы
  pending: 'secondary',
  on_hold: 'secondary',

  // purchase-order статусы
  confirmed_by_supplier: 'success',
  partially_received: 'info',

  // directories: роли
  admin: 'info',
  manager: 'warn',
  viewer: 'secondary',

  // directories: правовые формы
  'ООО': 'info',
  'ИП': 'success',
  'АО': 'warn',
  'ПАО': 'warn',
  'Физлицо': 'secondary',
  'Другое': 'secondary',

  // directories: entityType
  ORDER: 'info',
  ORDER_ITEM: 'secondary',
  WORK_TASK: 'warn',
  MATERIAL_REQUEST: 'success',

  // directories: workType sections
  materials: 'info',
  work: 'warn',
  task: 'success',
  drawing: 'secondary',

  // directories: counterparty roles
  client: 'info',
  supplier: 'success',
  company: 'warn',

  // boolean
  active: 'success',
  archived: 'danger',
  true: 'success',
  false: 'secondary',

  // modules: stock movement types
  receipt: 'success',
  write_off: 'danger',
  transfer_in: 'info',
  transfer_out: 'warn',

  // modules: cost types
  material: 'info',
  labor: 'warn',
  overhead: 'secondary',

  // modules: shipping doc types
  torg12: 'info',
  ttn: 'warn',
  invoice: 'success',

  // modules: product types
  raw_materials: 'info',
  production: 'warn',
  finished_goods: 'success',

  // modules: interaction types
  call: 'info',
  email: 'warn',
  meeting: 'success',
  note: 'secondary',
  system: 'contrast',

  // modules: reservation status (русский)
  'Резерв': 'warn',
  'В работе': 'info',
  'Выполнено': 'success',
  'Отменён': 'danger',
  'Черновик': 'warn',
};

/** Универсальная severity-функция: покрывает все известные значения. */
export function universalSeverity(value: unknown): string {
  const key = typeof value === 'string' ? value : String(value);
  return UNIVERSAL_SEVERITY[key] ?? 'info';
}

// ── Именованные алиасы для обратной совместимости ──────────────

/** Severity для статусов КП (quotations) */
export const quotationSeverity = universalSeverity;

/** Severity для статусов заказов (orders) */
export const orderSeverity = universalSeverity;

/** Severity для статусов тендеров (tenders) */
export const tenderSeverity = universalSeverity;

/** Severity для статусов отгрузок (shipments) */
export const shipmentSeverity = universalSeverity;

/** Severity для производственных заказов (work-orders) */
export const workOrderSeverity = universalSeverity;

/** Severity для заказов поставщикам (purchase-orders) */
export const purchaseOrderSeverity = universalSeverity;

/** Severity для справочников (directories) */
export const directorySeverity = universalSeverity;

/** Severity для бизнес-процессов (modules) */
export const moduleSeverity = universalSeverity;
