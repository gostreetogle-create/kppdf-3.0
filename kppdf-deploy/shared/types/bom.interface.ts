export interface IBom {
  _id?: string;
  productId: string;
  version?: number;
  isActive?: boolean;
  // components: [{ componentId: string, qty: Number, waste: Numb...
  createdAt?: string;
  updatedAt?: string;
}

