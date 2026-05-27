/**
 * KPPDF 3.0 — CRUD Page Types
 *
 * Типы для универсального CRUD-компонента KpCrudPage.
 */

/** Дополнительное действие в строке таблицы (кроме стандартных edit/delete) */
export interface CrudAction<T> {
  id: string;
  label: string;
  icon?: string;
  severity?: 'primary' | 'secondary' | 'danger' | 'info' | 'warn' | 'success' | 'help' | 'contrast';
  /** Permission, необходимый для видимости */
  permission?: string;
  /** Динамическая видимость (по строке) */
  visible?: (row: T) => boolean;
  /** Обработчик клика */
  handler: (row: T) => void;
}

/** Настройки доступа для CRUD-страницы */
export interface CrudPermissions {
  /** Permission для просмотра (view) */
  view: string;
  create?: string;
  edit?: string;
  delete?: string;
}
