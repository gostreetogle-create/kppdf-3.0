import { createCrudRouter } from '../../utils/crud-factory';
import { ActualCostModel } from './actualCost.model';

export const actualCostRouter = createCrudRouter(ActualCostModel, undefined, undefined, 'accounting.actualCosts');
