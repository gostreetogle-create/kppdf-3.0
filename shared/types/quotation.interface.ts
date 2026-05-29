import type { IQuotationItem } from './quotationItem.interface';
import type { IDocumentBlock } from './documentTemplate.interface';

/** Снапшот дизайна документа — blocks + backgroundImage. Зафиксирован при save, не обновляется из мастера. */
export interface IDocumentDesignSnapshot {
  blocks: IDocumentBlock[];
  backgroundImage?: string;
}

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
  /** Снапшот дизайна { blocks + backgroundImage } — основной источник (v3.3) */
  designSnapshot?: IDocumentDesignSnapshot;
  /** @deprecated v3.2 — заменён на designSnapshot. Оставлен для обратной совместимости. */
  templateSnapshot?: IDocumentBlock[];
  items: IQuotationItem[];
  createdAt?: string;
  updatedAt?: string;
}

