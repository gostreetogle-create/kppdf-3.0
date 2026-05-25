export interface IQuotation {
  _id?: string;
  number: string;
  counterpartyId: string;
  date?: string;
  validUntil?: string;
  statusId: string;
  total?: number;
  notes?: string;
  isActive?: boolean;
  // items: [{ productId: string, qty: Number, price: Number, dis...
  createdAt?: string;
  updatedAt?: string;
}

