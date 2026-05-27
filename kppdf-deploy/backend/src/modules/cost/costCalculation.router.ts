import { createCrudRouter } from '../../utils/crud-factory';
import { CostCalculationModel } from './costCalculation.model';

export const costCalculationRouter = createCrudRouter(CostCalculationModel, undefined, undefined, 'accounting.costCalculations');
