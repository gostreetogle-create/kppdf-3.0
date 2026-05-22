export interface IWorkType {
  _id?: string;
  name: string;
  section: 'materials' | 'work' | 'task' | 'drawing';
  description?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}
