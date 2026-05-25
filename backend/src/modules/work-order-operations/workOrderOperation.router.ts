import { createCrudRouter } from '../../utils/crud-factory';
import { WorkOrderOperationModel } from './workOrderOperation.model';

export const workOrderOperationRouter = createCrudRouter(WorkOrderOperationModel);
