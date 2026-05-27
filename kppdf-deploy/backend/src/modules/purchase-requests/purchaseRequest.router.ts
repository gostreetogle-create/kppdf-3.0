import { createCrudRouter } from '../../utils/crud-factory';
import { PurchaseRequestModel } from './purchaseRequest.model';

export const purchaseRequestRouter = createCrudRouter(PurchaseRequestModel, undefined, undefined, 'warehouse.purchaseRequests');
