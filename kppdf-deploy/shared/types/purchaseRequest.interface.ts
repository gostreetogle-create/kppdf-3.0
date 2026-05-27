export interface IPurchaseRequest {
  _id?: string;
  number: string;
  date?: string;
  createdBy?: string;
  statusId: string;
  orderId?: string;
  isActive?: boolean;
  // items: [{ productId: string, qty: Number }]...
  createdAt?: string;
  updatedAt?: string;
}

