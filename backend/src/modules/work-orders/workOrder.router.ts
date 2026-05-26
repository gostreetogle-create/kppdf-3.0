import { createCrudRouter } from '../../utils/crud-factory';
import { WorkOrderModel } from './workOrder.model';
import { getNextNumber } from '../counters/counters.service';

export const workOrderRouter = createCrudRouter(WorkOrderModel, undefined, {
  beforeCreate: async (body) => {
    if (!body.number) {
      body.number = await getNextNumber('work_order');
    }
  },
}, 'production.workOrders');
