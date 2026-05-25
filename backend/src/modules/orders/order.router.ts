import { createCrudRouter } from '../../utils/crud-factory';
import { OrderModel } from './order.model';
import { getNextNumber } from '../counters/counters.service';

export const orderRouter = createCrudRouter(OrderModel, undefined, {
  beforeCreate: async (body) => {
    if (!body.number) {
      body.number = await getNextNumber('order');
    }
  },
});
