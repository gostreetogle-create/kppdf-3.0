import { Response, NextFunction } from 'express';
import { error } from '../utils/api-response';
import type { AuthRequest } from '../types/auth';

/**
 * Middleware factory — проверяет, есть ли у пользователя указанное разрешение.
 *
 * Поддержка wildcard:
 *   - '*' — полный доступ (admin)
 *   - 'office.*' — все разрешения в секции office
 *   - '*.view'  — просмотр в любом модуле
 *
 * @param permission — код разрешения (например 'office.tenders.view')
 */
export function requirePermission(permission: string) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json(error('Unauthorized: no user'));
      return;
    }

    if (hasPermission(req.user.permissions || [], permission)) {
      next();
    } else {
      res.status(403).json(error(`Forbidden: требуется разрешение "${permission}"`));
    }
  };
}

/**
 * Проверка разрешения с поддержкой wildcard.
 */
function hasPermission(userPermissions: string[], required: string): boolean {
  // '*' — полный доступ
  if (userPermissions.includes('*')) return true;

  // Прямое совпадение
  if (userPermissions.includes(required)) return true;

  // Wildcard: 'office.*' → совпадает с любым 'office.xxx.yyy'
  for (const perm of userPermissions) {
    if (perm.endsWith('.*')) {
      const prefix = perm.slice(0, -2); // 'office'
      if (required.startsWith(prefix + '.')) return true;
    }
  }

  // Wildcard: '*.view' → совпадает с любым xxx.view
  for (const perm of userPermissions) {
    if (perm.startsWith('*.')) {
      const action = perm.slice(1); // '.view'
      if (required.endsWith(action)) return true;
    }
  }

  return false;
}
