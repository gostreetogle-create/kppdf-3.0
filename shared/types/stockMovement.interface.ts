export interface IStockMovement {
  _id?: string;
  type: string;
  date?: string;
  productId: string;
  warehouseId: string;
  qty: number;
  cost?: number;
  orderId?: string;
  documentRef?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

