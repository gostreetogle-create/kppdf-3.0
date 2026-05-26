import { createCrudRouter } from '../../utils/crud-factory';
import { CategoryModel } from './category.model';

export const categoryRouter = createCrudRouter(CategoryModel, undefined, undefined, 'admin.categories');
