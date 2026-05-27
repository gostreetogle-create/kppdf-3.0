export interface ITender {
  _id?: string;
  number: string;
  tenderId: string;
  date?: string;
  companyId: string;
  email: string;
  subject: string;
  productName: string;
  quantity: number;
  unit: string;
  attachments?: string;
  deliveryTerms?: string;
  responseRequirements?: string;
  legalBasis?: string;
  statusId: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}
