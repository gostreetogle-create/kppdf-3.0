export interface IRole {
  _id?: string;
  name: string;
  label: string;
  description?: string;
  permissions: string[];
  isSystem: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export const ALL_PERMISSIONS = [
  { code: 'product.view', label: 'Просмотр товаров', group: 'product' },
  { code: 'product.create', label: 'Создание товаров', group: 'product' },
  { code: 'product.edit', label: 'Редактирование товаров', group: 'product' },
  { code: 'product.delete', label: 'Удаление товаров', group: 'product' },
  { code: 'counterparty.view', label: 'Просмотр контрагентов', group: 'counterparty' },
  { code: 'counterparty.create', label: 'Создание контрагентов', group: 'counterparty' },
  { code: 'counterparty.edit', label: 'Редактирование контрагентов', group: 'counterparty' },
  { code: 'counterparty.delete', label: 'Удаление контрагентов', group: 'counterparty' },
  { code: 'settings.view', label: 'Просмотр настроек', group: 'settings' },
  { code: 'settings.edit', label: 'Редактирование настроек', group: 'settings' },
  { code: 'roles.edit', label: 'Управление ролями', group: 'settings' },
  { code: 'statuses.edit', label: 'Управление статусами', group: 'settings' },
] as const;

