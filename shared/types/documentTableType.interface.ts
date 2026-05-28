import type { ProductKind } from './product.interface';

/** Тип данных для колонки таблицы */
export type DocTableColumnType = 'text' | 'number' | 'select' | 'date' | 'image' | 'currency';

/** Определение колонки в настраиваемом типе таблицы */
export interface IDocTableColumn {
  field: string;
  header: string;
  type: DocTableColumnType;
  width?: string;
  /** Подстановка значения (например: `products.listPrice` — брать цену из справочника товаров) */
  source?: string;
  /** Статические опции для type='select' (JSON-строка: [{"label":"...","value":"..."},...]) */
  options?: string;
}

/** Настраиваемый тип таблицы для редактора документов */
export interface IDocumentTableType {
  _id?: string;
  /** Название (например: «Товары», «Услуги», «Спецификация») */
  name: string;
  /** Метка для выпадающего списка (например: «Товары») */
  label: string;
  /** Заголовок таблицы в документе */
  title: string;
  /** Тип документа, к которому привязан (quotation, contract, ...) */
  docType: string;
  /** Колонки таблицы */
  columns: IDocTableColumn[];
  /** Источник данных (например: products — подстановка из справочника товаров через productPicker) */
  dataSource?: string;
  /** Тип продукта для точного фильтра в пикере (ITEM / SERVICE / WORK). Если не задан — без фильтра. */
  productKind?: ProductKind;
  /** Порядок сортировки в выпадающем списке */
  sortOrder?: number;
  /** Размер шрифта по умолчанию */
  fontSize?: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}
