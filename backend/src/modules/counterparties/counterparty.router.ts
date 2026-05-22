import { createCrudRouter } from '../../utils/crud-factory';
import { CounterpartyModel } from './counterparty.model';

export const counterpartyRouter = createCrudRouter(CounterpartyModel);
