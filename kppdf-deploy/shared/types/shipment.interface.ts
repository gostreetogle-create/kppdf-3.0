export interface IShipment {
  _id?: string;
  number: string;
  orderId: string;
  date?: string;
  recipient?: string;
  address?: string;
  statusId?: string;
  driverInfo?: string;
  isActive?: boolean;
  // items: [{ productId: string, qty: Number, actualQty: Number ...
  createdAt?: string;
  updatedAt?: string;
}

