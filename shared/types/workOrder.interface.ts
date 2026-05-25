export interface IWorkOrder {
  _id?: string;
  number: string;
  orderId: string;
  productId: string;
  qty: number;
  statusId?: string;
  startDate?: string;
  endDate?: string;
  assignedTo?: string;
  notes?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

