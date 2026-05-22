import { body, param, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { error } from '../utils/api-response';

/**
 * Middleware: проверяет результат валидации и возвращает 400 с ошибками.
 */
export function validate(req: Request, res: Response, next: NextFunction): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map((e) => e.msg).join('; ');
    res.status(400).json(error(messages));
    return;
  }
  next();
}

// ===== Базовые правила для справочников =====

export const nameRequired = body('name')
  .notEmpty().withMessage('Поле "name" обязательно')
  .isString().withMessage('Поле "name" должно быть строкой')
  .trim();

export const idParam = param('id')
  .isMongoId().withMessage('Некорректный ID');

export const emailOptional = body('email')
  .optional()
  .isEmail().withMessage('Некорректный email');

export const innOptional = body('inn')
  .optional()
  .matches(/^\d{10}$|^\d{12}$/).withMessage('ИНН должен содержать 10 или 12 цифр');

export const isActiveBoolean = body('isActive')
  .optional()
  .isBoolean().withMessage('isActive должен быть boolean');

export const sortOrderNumber = body('sortOrder')
  .optional()
  .isInt({ min: 0 }).withMessage('sortOrder должен быть целым числом >= 0');

// ===== Правила для Auth =====
export const loginRules = [
  body('username')
    .notEmpty().withMessage('Логин обязателен')
    .isString().withMessage('Логин должен быть строкой')
    .trim()
    .toLowerCase(),
  body('password')
    .notEmpty().withMessage('Пароль обязателен')
    .isString().withMessage('Пароль должен быть строкой'),
];
