export interface IOperation {
  _id?: string;
  number?: number;
  name: string;
  workshop?: string;
  duration?: number;
  costPerHour?: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

