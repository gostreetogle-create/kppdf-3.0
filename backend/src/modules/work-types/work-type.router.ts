import { createCrudRouter } from '../../utils/crud-factory';
import { WorkTypeModel } from './work-type.model';

export const workTypeRouter = createCrudRouter(WorkTypeModel, undefined, undefined, 'admin.workTypes');
