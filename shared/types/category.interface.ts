export interface ICategory {
  _id?: string;
  name: string;
  parentId?: string;
  fullPath?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}
