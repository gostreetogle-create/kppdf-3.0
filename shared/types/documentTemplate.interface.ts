export type DocumentBlockType = 'text' | 'table' | 'header' | 'separator' | 'image';

export type DocType = 'quotation' | 'contract' | 'invoice' | 'shipping' | string;

export type DocumentTextAlign = 'left' | 'center' | 'right';

export interface IDocumentBlockCell {
  content: string;
  align?: DocumentTextAlign;
}

export interface IDocumentBlock {
  _id?: string;
  type: DocumentBlockType;
  order: number;
  title?: string;
  content: string;
  tableKind?: string;
  cells?: IDocumentBlockCell[];
  settings: {
    fontSize?: number;
    fontWeight?: 'normal' | 'bold' | 'semibold';
    align?: DocumentTextAlign;
    color?: string;
    backgroundColor?: string;
    borderStyle?: 'none' | 'dashed' | 'solid';
    paddingTop?: number;
    paddingBottom?: number;
    columns?: number;
  };
}

export interface IDocumentTemplate {
  _id?: string;
  name: string;
  organizationId?: string;
  docType: DocType;
  isDefault: boolean;
  isActive: boolean;
  pageSize: 'A4';
  backgroundImage?: string;
  blocks: IDocumentBlock[];
  createdAt?: string;
  updatedAt?: string;
}
