import { createCrudRouter } from '../../utils/crud-factory';
import { QuotationModel } from './quotation.model';
import { getNextNumber } from '../counters/counters.service';

export const quotationRouter = createCrudRouter(QuotationModel, undefined, {
  beforeCreate: async (body) => {
    if (!body.number) {
      body.number = await getNextNumber('quotation');
    }
  },
});
