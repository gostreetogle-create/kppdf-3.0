import { createCrudRouter } from '../../utils/crud-factory';
import { ShippingDocModel } from './shippingDoc.model';
import { getNextNumber } from '../counters/counters.service';

export const shippingDocRouter = createCrudRouter(ShippingDocModel, undefined, {
  beforeCreate: async (body) => {
    if (!body.number) {
      body.number = await getNextNumber('shipping_doc');
    }
  },
}, 'accounting.shippingDocs');
