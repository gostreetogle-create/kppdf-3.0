import { Router, Response } from 'express';
import { createCrudRouter } from '../../utils/crud-factory';
import { ComplianceRuleModel } from './complianceRule.model';
import { authenticate } from '../../middleware/auth';
import { requirePermission } from '../../middleware/permission';
import { success, error } from '../../utils/api-response';
import type { AuthRequest } from '../../types/auth';
import type {
  IComplianceRule,
  IComplianceCheck,
  IComplianceBatchResult,
  IComplianceSummary,
} from '../../../../shared/types/compliance.interface';

// ============================================================
// Стандартный CRUD для правил проверки
// ============================================================
export const complianceRuleRouter = createCrudRouter(
  ComplianceRuleModel,
  ['name', 'description', 'field', 'sourceType'],
  undefined,
  'production.compliance',
);

// ============================================================
// Дополнительные роуты: engine проверки
// ============================================================
export const complianceCheckRouter = Router();
complianceCheckRouter.use(authenticate);

/**
 * POST /check — выполнить проверку одного атрибута по правилу
 * Body: { ruleId, sourceId, sourceType, actualValue, targetId?, targetType? }
 */
complianceCheckRouter.post('/check', requirePermission('production.compliance.check'), async (req: AuthRequest, res: Response) => {
  try {
    const { ruleId, sourceId, sourceType, actualValue, targetId, targetType } = req.body;

    if (!ruleId || !sourceId || !sourceType || actualValue === undefined || actualValue === null) {
      res.status(400).json(error('Missing required fields: ruleId, sourceId, sourceType, actualValue'));
      return;
    }

    const rule = await ComplianceRuleModel.findById(ruleId);
    if (!rule) {
      res.status(404).json(error(`ComplianceRule not found: ${ruleId}`));
      return;
    }

    const result = evaluateRule(rule, actualValue);

    // Собираем полный результат
    const check: IComplianceCheck = {
      ruleId: rule._id!.toString(),
      ruleName: rule.name,
      sourceId,
      sourceType,
      targetId,
      targetType,
      field: rule.field,
      operator: rule.operator,
      expectedValue: rule.expectedValue,
      expectedValueMax: rule.expectedValueMax,
      actualValue,
      tolerance: rule.tolerance,
      passed: result.passed,
      severity: result.severity,
      message: result.message,
      checkedAt: new Date().toISOString(),
      checkedBy: req.user?.userId,
    };

    res.json(success(check));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json(error(message));
  }
});

/**
 * POST /check-batch — массовая проверка нескольких правил
 * Body: { sourceId, sourceType, values: Record<field, number|string>, targetId?, targetType? }
 */
complianceCheckRouter.post('/check-batch', requirePermission('production.compliance.check'), async (req: AuthRequest, res: Response) => {
  try {
    const { sourceId, sourceType, values } = req.body;

    if (!sourceId || !sourceType || !values) {
      res.status(400).json(error('Missing required fields: sourceId, sourceType, values'));
      return;
    }

    // Загружаем все активные правила для данного sourceType
    const rules = await ComplianceRuleModel.find({ sourceType, isActive: true }).sort({ sortOrder: 1 });

    const results: IComplianceBatchResult[] = [];
    let passed = 0;
    let warnings = 0;
    let blocks = 0;

    for (const rule of rules) {
      const actualValue = values[rule.field] ?? null;

      // Правило: не проверять, если одно из значений null
      if (actualValue === null || actualValue === undefined) {
        continue;
      }

      const result = evaluateRule(rule, actualValue);

      results.push({
        ruleId: rule._id!.toString(),
        ruleName: rule.name,
        field: rule.field,
        operator: rule.operator,
        expectedValue: rule.expectedValue,
        actualValue,
        passed: result.passed,
        severity: result.severity,
        message: result.message,
      });

      if (result.passed) {
        passed++;
      } else if (result.severity === 'warning') {
        warnings++;
      } else {
        blocks++;
      }
    }

    const summary: IComplianceSummary = {
      total: rules.length,
      passed,
      warnings,
      blocks,
      results,
    };

    res.json(success(summary));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json(error(message));
  }
});

// ============================================================
// Compliance Engine — 8 операторов
// ============================================================

interface EvalResult {
  passed: boolean;
  severity: 'warning' | 'block';
  message: string;
}

/**
 * Выполнить проверку атрибута по правилу.
 * Правила:
 * - Если actualValue = null — проверка НЕ выполняется (skip)
 * - При soft warning не блокируем advance
 * - При hard block — возвращаем blocked
 */
function evaluateRule(rule: IComplianceRule, actualValue: string | number): EvalResult {
  const expected = rule.expectedValue;
  const expectedMax = rule.expectedValueMax;
  const tolerance = rule.tolerance ?? 0;

  const numActual = typeof actualValue === 'number' ? actualValue : parseFloat(actualValue);
  const numExpected = typeof expected === 'number' ? expected : parseFloat(expected);
  const numExpectedMax = expectedMax != null
    ? (typeof expectedMax === 'number' ? expectedMax : parseFloat(expectedMax))
    : null;

  let passed = false;
  let detail = '';

  switch (rule.operator) {
    case 'eq':
      passed = String(actualValue) === String(expected);
      detail = `${actualValue} ${passed ? '=' : '≠'} ${expected}`;
      break;

    case 'neq':
      passed = String(actualValue) !== String(expected);
      detail = `${actualValue} ${passed ? '≠' : '='} ${expected}`;
      break;

    case 'gt':
      passed = !isNaN(numActual) && !isNaN(numExpected) && numActual > numExpected;
      detail = `${actualValue} > ${expected}: ${passed ? 'да' : 'нет'}`;
      break;

    case 'lt':
      passed = !isNaN(numActual) && !isNaN(numExpected) && numActual < numExpected;
      detail = `${actualValue} < ${expected}: ${passed ? 'да' : 'нет'}`;
      break;

    case 'gte':
      passed = !isNaN(numActual) && !isNaN(numExpected) && numActual >= numExpected;
      detail = `${actualValue} ≥ ${expected}: ${passed ? 'да' : 'нет'}`;
      break;

    case 'lte':
      passed = !isNaN(numActual) && !isNaN(numExpected) && numActual <= numExpected;
      detail = `${actualValue} ≤ ${expected}: ${passed ? 'да' : 'нет'}`;
      break;

    case 'approx': {
      if (isNaN(numActual) || isNaN(numExpected)) {
        passed = false;
        detail = `Невозможно вычислить допуск (ожидалось число)`;
      } else {
        const lower = numExpected - tolerance;
        const upper = numExpected + tolerance;
        passed = numActual >= lower && numActual <= upper;
        detail = `${actualValue} ∈ [${lower}, ${upper}] (±${tolerance}): ${passed ? 'да' : 'нет'}`;
      }
      break;
    }

    case 'range': {
      if (numExpectedMax == null || isNaN(numExpectedMax)) {
        passed = false;
        detail = `Для оператора range требуется expectedValueMax`;
      } else if (isNaN(numActual)) {
        passed = false;
        detail = `Невозможно вычислить диапазон (ожидалось число)`;
      } else {
        passed = numActual >= numExpected && numActual <= numExpectedMax;
        detail = `${actualValue} ∈ [${expected}, ${expectedMax}]: ${passed ? 'да' : 'нет'}`;
      }
      break;
    }
  }

  const message = `${rule.fieldLabel || rule.field}: ${detail}`;

  return {
    passed,
    severity: rule.severity,
    message,
  };
}
