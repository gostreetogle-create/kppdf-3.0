export interface IQuotationItem {
  _id?: string;
  productId?: string;
  sku: string;
  photo?: string;
  name: string;
  qty: number;
  unit: string;
  price: number;
  sum: number;
  order: number;
}
