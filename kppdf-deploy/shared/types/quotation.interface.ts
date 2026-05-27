import type { IQuotationItem } from './quotationItem.interface';

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
  templateId?: string;
  items: IQuotationItem[];
  createdAt?: string;
  updatedAt?: string;
}

