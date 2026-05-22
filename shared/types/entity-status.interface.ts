export interface IEntityStatus {
  _id?: string;
  entityType: string;
  statusId: string;
  label: string;
  color: string;
  icon: string;
  sortOrder: number;
  isInitial: boolean;
  isFinal: boolean;
  createdAt?: string;
  updatedAt?: string;
}
