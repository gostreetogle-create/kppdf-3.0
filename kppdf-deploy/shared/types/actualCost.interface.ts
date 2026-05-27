export interface IActualCost {
  _id?: string;
  orderId: string;
  type: string;
  amount: number;
  description?: string;
  sourceRef?: object;
  date?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

