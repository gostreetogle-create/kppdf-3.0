import { createCrudRouter } from '../../utils/crud-factory';
import { TenderModel } from './tender.model';
import { getNextNumber } from '../counters/counters.service';

export const tenderRouter = createCrudRouter(TenderModel, ['number', 'tenderId', 'subject', 'productName'], {
  beforeCreate: async (body) => {
    if (!body.number) {
      body.number = await getNextNumber('tender');
    }
  },
}, 'office.tenders');
