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
