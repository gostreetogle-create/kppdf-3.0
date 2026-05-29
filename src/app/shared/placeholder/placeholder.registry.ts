/**
 * Реестр плейсхолдеров (токенов) для шаблонов документов.
 *
 * Каждый токен соответствует полю из ICounterparty / IQuotation / IQuotationItem.
 * Формат в шаблоне: `{{категория.поле}}`, например `{{org.name}}`.
 *
 * Используется:
 * - kp-placeholder-picker (UI-выбор токена)
 * - TemplatePlaceholderService.resolve() (подстановка значений)
 */

import type { ICounterparty } from '../../../../shared/types/counterparty.interface';
import type { IQuotationItem } from '../../../../shared/types/quotationItem.interface';

// ─────────────────────────────────────────────────────────
// Типы
// ─────────────────────────────────────────────────────────

export type PlaceholderCategory = 'org' | 'client' | 'doc' | 'item';

export interface PlaceholderToken {
  /** Ключ токена, например "org.name" */
  token: string;
  /** Человекочитаемая метка */
  label: string;
  /** Категория для группировки */
  category: PlaceholderCategory;
  /** Описание — что подставится при рендеринге */
  description: string;
}

export interface PlaceholderContext {
  /** Организация-исполнитель (counterparty с role='company') */
  org?: ICounterparty | null;
  /** Клиент */
  client?: ICounterparty | null;
  /** Документ (КП, заказ, …) */
  doc?: {
    number?: string;
    date?: string;
    validUntil?: string;
    total?: number;
  } | null;
  /** Позиция документа (для подстановки в строках таблиц) */
  item?: IQuotationItem | null;
}

// ─────────────────────────────────────────────────────────
// Категории
// ─────────────────────────────────────────────────────────

export const PLACEHOLDER_CATEGORIES: { key: PlaceholderCategory; label: string; icon: string }[] = [
  { key: 'org', label: 'Организация (исполнитель)', icon: 'pi pi-building' },
  { key: 'client', label: 'Клиент', icon: 'pi pi-user' },
  { key: 'doc', label: 'Документ', icon: 'pi pi-file' },
  { key: 'item', label: 'Позиция (строка таблицы)', icon: 'pi pi-list' },
];

// ─────────────────────────────────────────────────────────
// Реестр токенов
// ─────────────────────────────────────────────────────────

export const PLACEHOLDER_REGISTRY: PlaceholderToken[] = [
  // ── Организация ──
  {
    token: 'org.name',
    label: 'Название организации',
    category: 'org',
    description: 'Полное наименование организации-исполнителя (поле name контрагента)',
  },
  {
    token: 'org.shortName',
    label: 'Краткое название',
    category: 'org',
    description: 'Краткое наименование (shortName)',
  },
  {
    token: 'org.legalForm',
    label: 'Правовая форма',
    category: 'org',
    description: 'ООО / ИП / АО / ПАО / Физлицо / Другое',
  },
  {
    token: 'org.inn',
    label: 'ИНН организации',
    category: 'org',
    description: 'ИНН исполнителя',
  },
  {
    token: 'org.kpp',
    label: 'КПП организации',
    category: 'org',
    description: 'КПП исполнителя',
  },
  {
    token: 'org.ogrn',
    label: 'ОГРН',
    category: 'org',
    description: 'ОГРН исполнителя',
  },
  {
    token: 'org.legalAddress',
    label: 'Юридический адрес',
    category: 'org',
    description: 'Юридический адрес организации-исполнителя',
  },
  {
    token: 'org.phone',
    label: 'Телефон организации',
    category: 'org',
    description: 'Контактный телефон',
  },
  {
    token: 'org.email',
    label: 'Email организации',
    category: 'org',
    description: 'Контактный email',
  },
  {
    token: 'org.bankName',
    label: 'Банк организации',
    category: 'org',
    description: 'Наименование обслуживающего банка',
  },
  {
    token: 'org.bik',
    label: 'БИК банка',
    category: 'org',
    description: 'БИК обслуживающего банка',
  },
  {
    token: 'org.checkingAccount',
    label: 'Расчётный счёт',
    category: 'org',
    description: 'Номер расчётного счёта',
  },

  // ── Клиент ──
  {
    token: 'client.name',
    label: 'Название клиента',
    category: 'client',
    description: 'Полное наименование клиента',
  },
  {
    token: 'client.shortName',
    label: 'Краткое название клиента',
    category: 'client',
    description: 'Краткое наименование клиента',
  },
  {
    token: 'client.legalForm',
    label: 'Правовая форма клиента',
    category: 'client',
    description: 'ООО / ИП / АО / ПАО / Физлицо / Другое',
  },
  {
    token: 'client.inn',
    label: 'ИНН клиента',
    category: 'client',
    description: 'ИНН клиента',
  },
  {
    token: 'client.kpp',
    label: 'КПП клиента',
    category: 'client',
    description: 'КПП клиента',
  },
  {
    token: 'client.ogrn',
    label: 'ОГРН клиента',
    category: 'client',
    description: 'ОГРН клиента',
  },
  {
    token: 'client.legalAddress',
    label: 'Юридический адрес клиента',
    category: 'client',
    description: 'Юридический адрес клиента',
  },
  {
    token: 'client.phone',
    label: 'Телефон клиента',
    category: 'client',
    description: 'Контактный телефон клиента',
  },
  {
    token: 'client.email',
    label: 'Email клиента',
    category: 'client',
    description: 'Контактный email клиента',
  },

  // ── Документ ──
  {
    token: 'doc.number',
    label: 'Номер документа',
    category: 'doc',
    description: 'Номер КП / заказа / накладной',
  },
  {
    token: 'doc.date',
    label: 'Дата документа',
    category: 'doc',
    description: 'Дата создания документа',
  },
  {
    token: 'doc.validUntil',
    label: 'Действителен до',
    category: 'doc',
    description: 'Дата окончания действия (КП)',
  },
  {
    token: 'doc.total',
    label: 'Сумма документа',
    category: 'doc',
    description: 'Итоговая сумма (число)',
  },

  // ── Позиция (строка таблицы) ──
  {
    token: 'item.sku',
    label: 'Артикул позиции',
    category: 'item',
    description: 'Артикул (SKU) товара/услуги в строке',
  },
  {
    token: 'item.name',
    label: 'Наименование позиции',
    category: 'item',
    description: 'Наименование товара/услуги в строке',
  },
  {
    token: 'item.qty',
    label: 'Количество',
    category: 'item',
    description: 'Количество единиц в строке',
  },
  {
    token: 'item.unit',
    label: 'Единица измерения',
    category: 'item',
    description: 'Ед. изм. (шт., кг, услуга, …)',
  },
  {
    token: 'item.price',
    label: 'Цена за единицу',
    category: 'item',
    description: 'Цена за одну единицу',
  },
  {
    token: 'item.sum',
    label: 'Сумма строки',
    category: 'item',
    description: 'Итого по строке (qty × price)',
  },
];

// ─────────────────────────────────────────────────────────
// Сгруппированный реестр (для UI-пикера)
// ─────────────────────────────────────────────────────────

export const PLACEHOLDERS_BY_CATEGORY: Record<PlaceholderCategory, PlaceholderToken[]> = {
  org: PLACEHOLDER_REGISTRY.filter((t) => t.category === 'org'),
  client: PLACEHOLDER_REGISTRY.filter((t) => t.category === 'client'),
  doc: PLACEHOLDER_REGISTRY.filter((t) => t.category === 'doc'),
  item: PLACEHOLDER_REGISTRY.filter((t) => t.category === 'item'),
};
