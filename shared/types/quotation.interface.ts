import type { IQuotationItem } from './quotationItem.interface';
import type { IDocumentBlock } from './documentTemplate.interface';

export interface IQuotation {
  _id?: string;
  number: string;
  /** Counterparty._id с role='company' — организация-исполнитель */
  organizationId?: string;
  counterpartyId: string;
  tenderId?: string;
  date?: string;
  validUntil?: string;
  statusId: string;
  total?: number;
  notes?: string;
  isActive?: boolean;
  templateId?: string;
  /** Снапшот блоков шаблона на момент создания КП (с токенами {{...}}) */
  templateSnapshot?: IDocumentBlock[];
  items: IQuotationItem[];
  createdAt?: string;
  updatedAt?: string;
}

