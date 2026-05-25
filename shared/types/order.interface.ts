export interface IOrder {
  _id?: string;
  number: string;
  counterpartyId: string;
  quotationId?: string;
  date?: string;
  plannedDate?: string;
  statusId: string;
  total?: number;
  notes?: string;
  isActive?: boolean;
  // items: [{ productId: string, qty: Number, price: Number, res...
  createdAt?: string;
  updatedAt?: string;
}

