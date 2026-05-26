export type AttributeType = 'string' | 'number' | 'boolean' | 'date' | 'select' | 'multiselect' | 'text';

export interface IAttributeDefinition {
  _id?: string;
  entityType: string;
  categoryId?: string | null;
  name: string;
  label: string;
  type: AttributeType;
  unit?: string;
  options?: string[];
  required: boolean;
  sortOrder: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}
