export interface ICostCalculation {
  _id?: string;
  productId: string;
  bomVersion?: number;
  isActive?: boolean;
  // planned: { materials: [{ productId: string, qty: Number, pri...
  createdAt?: string;
  updatedAt?: string;
}

