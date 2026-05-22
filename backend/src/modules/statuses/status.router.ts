import { createCrudRouter } from '../../utils/crud-factory';
import { StatusModel } from './status.model';

export const statusRouter = createCrudRouter(StatusModel);
