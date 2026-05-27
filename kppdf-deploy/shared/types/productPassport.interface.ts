export interface IProductPassport {
  _id?: string;
  productId: string;
  passportNumber: number;
  date?: string;
  warrantyCode: string;
  productCode: number;
  photo?: string;
  category: string;
  name: string;
  article?: string;
  height?: number;
  length?: number;
  width?: number;
  weight?: number;
  description?: string;
  installationSite?: string;
  supplier?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}
