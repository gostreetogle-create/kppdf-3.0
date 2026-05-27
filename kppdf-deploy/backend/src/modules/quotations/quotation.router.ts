import { createCrudRouter } from '../../utils/crud-factory';
import { QuotationModel } from './quotation.model';
import { getNextNumber } from '../counters/counters.service';

function calcItems(body: Record<string, unknown>): void {
  const items = body.items as unknown as Array<Record<string, unknown>>;
  if (Array.isArray(items)) {
    body.items = items.map((item, i) => ({
      ...item,
      order: (item.order as number) ?? i,
      sum: ((item.qty as number) || 0) * ((item.price as number) || 0),
    })) as unknown as Record<string, unknown>;
  }
}

export const quotationRouter = createCrudRouter(QuotationModel, undefined, {
  beforeCreate: async (body) => {
    if (!body.number) {
      body.number = await getNextNumber('quotation');
    }
    calcItems(body);
  },
  beforeUpdate: async (body) => {
    calcItems(body);
  },
}, 'office.quotations');
