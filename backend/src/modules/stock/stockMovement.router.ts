import { createCrudRouter } from '../../utils/crud-factory';
import { StockMovementModel } from './stockMovement.model';

export const stockMovementRouter = createCrudRouter(StockMovementModel);
