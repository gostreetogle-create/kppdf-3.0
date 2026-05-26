import { createCrudRouter } from '../../utils/crud-factory';
import { UserModel } from './user.model';

export const userRouter = createCrudRouter(UserModel, undefined, undefined, 'admin.users');
