import { createCrudRouter } from '../../utils/crud-factory';
import { CounterModel } from './counter.model';

export const counterRouter = createCrudRouter(CounterModel, undefined, undefined, 'admin.counters');
