import { createCrudRouter } from '../../utils/crud-factory';
import { ShipmentModel } from './shipment.model';
import { getNextNumber } from '../counters/counters.service';

export const shipmentRouter = createCrudRouter(ShipmentModel, undefined, {
  beforeCreate: async (body) => {
    if (!body.number) {
      body.number = await getNextNumber('shipment');
    }
  },
});
