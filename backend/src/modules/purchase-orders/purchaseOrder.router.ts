import { createCrudRouter } from '../../utils/crud-factory';
import { PurchaseOrderModel } from './purchaseOrder.model';
import { getNextNumber } from '../counters/counters.service';

export const purchaseOrderRouter = createCrudRouter(PurchaseOrderModel, undefined, {
  beforeCreate: async (body) => {
    if (!body.number) {
      body.number = await getNextNumber('purchase_order');
    }
  },
}, 'warehouse.purchaseOrders');
