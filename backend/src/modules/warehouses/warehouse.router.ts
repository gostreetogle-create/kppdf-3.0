import { createCrudRouter } from '../../utils/crud-factory';
import { WarehouseModel } from './warehouse.model';

export const warehouseRouter = createCrudRouter(WarehouseModel, undefined, undefined, 'warehouse.warehouses');
