export type ProductKind = 'ITEM' | 'SERVICE' | 'WORK';

/** Настройки отображения фото в рамках (позиция + масштаб) */
export interface PhotoItem {
  url: string;
  /** CSS object-position в процентах (по умолчанию center = 50% 50%) */
  position?: { x: number; y: number };
  /** Масштаб 0.5–2.0 (по умолчанию 1) */
  scale?: number;
}

export interface IProduct {
  _id?: string;
  name: string;
  sku: string;
  kind: ProductKind;
  unit: string;
  categoryId?: string;
  status: 'active' | 'draft' | 'archived';
  isActive?: boolean;
  /** Справочная цена для подстановки в документы */
  listPrice?: number;
  /** Себестоимость (закупочная/производственная) */
  costPrice?: number;
  /** Остаток (денормализация; sync из StockMovement — backlog) */
  stockQty?: number;
  description?: string;
  /** Внутренние заметки (не видны клиенту) */
  notes?: string;
  /** Явная подкатегория (строка, помимо categoryId) */
  subcategory?: string;
  /** Фото товара — массив объектов с URL и настройками рамки */
  photos?: PhotoItem[];
  // Технические поля (из паспортов изделий)
  height?: number;
  length?: number;
  width?: number;
  weight?: number;
  materials?: string;
  installation?: string;
  purpose?: string;
  createdAt?: string;
  updatedAt?: string;
}
