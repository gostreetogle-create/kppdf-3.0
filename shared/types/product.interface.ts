export type ProductKind = 'ITEM' | 'SERVICE' | 'WORK';

export interface IProduct {
  _id?: string;
  name: string;
  sku: string;
  kind: ProductKind;
  unit: string;
  categoryId?: string;
  status: 'active' | 'draft' | 'archived';
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}
