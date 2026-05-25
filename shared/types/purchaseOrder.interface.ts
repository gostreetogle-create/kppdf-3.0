export interface IPurchaseOrder {
  _id?: string;
  number: string;
  supplierId: string;
  orderDate?: string;
  deliveryDate?: string;
  statusId: string;
  total?: number;
  notes?: string;
  isActive?: boolean;
  // items: [{ productId: string, qty: Number, price: Number }]...
  createdAt?: string;
  updatedAt?: string;
}

