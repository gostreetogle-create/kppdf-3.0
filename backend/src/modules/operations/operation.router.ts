import { createCrudRouter } from '../../utils/crud-factory';
import { OperationModel } from './operation.model';

export const operationRouter = createCrudRouter(OperationModel, undefined, undefined, 'production.operations');
