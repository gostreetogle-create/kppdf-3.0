export interface ITechProcess {
  _id?: string;
  productId: string;
  totalDuration?: number;
  isActive?: boolean;
  // operations: [{ operationId: string, order: Number, duration:...
  createdAt?: string;
  updatedAt?: string;
}

