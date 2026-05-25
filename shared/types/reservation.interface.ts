export interface IReservation {
  _id?: string;
  orderId: string;
  isActive?: boolean;
  // items: [{ productId: string, warehouseId: string, qty: Numbe...
  createdAt?: string;
  updatedAt?: string;
}

