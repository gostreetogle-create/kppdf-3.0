import { createCrudRouter } from '../../utils/crud-factory';
import { PurchaseRequestModel } from './purchaseRequest.model';
import { getNextNumber } from '../counters/counters.service';

export const purchaseRequestRouter = createCrudRouter(PurchaseRequestModel, undefined, {
  beforeCreate: async (body) => {
    if (!body.number) {
      body.number = await getNextNumber('purchase_request');
    }
  },
}, 'warehouse.purchaseRequests');
