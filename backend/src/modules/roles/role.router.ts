import { createCrudRouter } from '../../utils/crud-factory';
import { RoleModel } from './role.model';

export const roleRouter = createCrudRouter(RoleModel);
