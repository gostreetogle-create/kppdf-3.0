import type { KpSelectOption } from '../kp-select.component';

/** Строк на странице витрины (крупная модалка) */
export const PRODUCT_PICKER_PAGE_SIZE = 25;

export interface ProductPickerFilters {
  search?: string;
  categoryId?: string;
  kind?: string;
  activeOnly?: boolean;
  page?: number;
  limit?: number;
}

export const PRODUCT_KIND_OPTIONS: KpSelectOption[] = [
  { label: 'Товар', value: 'ITEM' },
  { label: 'Услуга', value: 'SERVICE' },
  { label: 'Работа', value: 'WORK' },
];

export const PRODUCT_KIND_LABELS: Record<string, string> = {
  ITEM: 'Товар',
  SERVICE: 'Услуга',
  WORK: 'Работа',
};
