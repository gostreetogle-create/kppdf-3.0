/**
 * Compliance operators:
 *   eq     — равно (=)
 *   neq    — не равно (≠)
 *   gt     — больше (>)
 *   lt     — меньше (<)
 *   gte    — больше или равно (≥)
 *   lte    — меньше или равно (≤)
 *   approx — ± допуск (±)
 *   range  — диапазон [min, max]
 */
export type ComplianceOperator = 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'approx' | 'range';

export type ComplianceSeverity = 'warning' | 'block';

/** Правило проверки соответствия (Compliance Rule) */
export interface IComplianceRule {
  _id?: string;
  name: string;
  description?: string;

  /** Тип источника — что проверяем (e.g. 'product_passport', 'tech_process') */
  sourceType: string;
  /** Тип цели — с чем сверяем (e.g. 'specification', 'customer_requirement') */
  targetType: string;

  /** Имя атрибута/поля для проверки */
  field: string;
  /** Человеческое название поля (для отчёта) */
  fieldLabel?: string;

  /** Оператор сравнения */
  operator: ComplianceOperator;

  /** Ожидаемое значение (нижняя граница для range) */
  expectedValue: string | number;
  /** Верхняя граница для range-оператора */
  expectedValueMax?: string | number;
  /** Допуск для approx-оператора (±) */
  tolerance?: number;

  /** Единица измерения */
  unit?: string;

  /** Серьёзность: warning — мягкое предупреждение, block — блокирующая проверка */
  severity: ComplianceSeverity;

  isActive: boolean;
  sortOrder?: number;

  createdAt?: string;
  updatedAt?: string;
}

/** Результат однократной проверки соответствия */
export interface IComplianceCheck {
  _id?: string;
  ruleId: string;
  ruleName: string;

  sourceId: string;
  sourceType: string;
  targetId?: string;
  targetType?: string;

  field: string;
  operator: ComplianceOperator;

  expectedValue: string | number;
  expectedValueMax?: string | number;
  actualValue: string | number | null;
  tolerance?: number;

  passed: boolean;
  severity: ComplianceSeverity;
  message: string;

  checkedAt: string;
  checkedBy?: string;
}

/** Результат массовой проверки (пакет правил) */
export interface IComplianceBatchResult {
  ruleId: string;
  ruleName: string;
  field: string;
  operator: ComplianceOperator;
  expectedValue: string | number;
  actualValue: string | number | null;
  passed: boolean;
  severity: ComplianceSeverity;
  message: string;
}

/** Итог пачки проверок */
export interface IComplianceSummary {
  total: number;
  passed: number;
  warnings: number;
  blocks: number;
  results: IComplianceBatchResult[];
}
