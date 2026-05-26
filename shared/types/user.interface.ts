export type UserRole = string;

export interface IUser {
  _id?: string;
  username: string;
  email?: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt?: string;
  updatedAt?: string;
}
