export interface IEntityAttributeValue {
  _id?: string;
  entityType: string;
  entityId: string;
  attributeId: string;
  value: string | number | boolean | string[] | null;
  createdAt?: string;
  updatedAt?: string;
}
