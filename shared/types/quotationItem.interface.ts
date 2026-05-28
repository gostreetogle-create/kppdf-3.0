export interface IQuotationItem {
  _id?: string;
  productId?: string;
  /** Тип таблицы документа (products, services, …) — позиция принадлежит одной таблице на листе */
  tableKind?: string;
  sku: string;
  photo?: string;
  name: string;
  qty: number;
  unit: string;
  price: number;
  sum: number;
  order: number;
}
