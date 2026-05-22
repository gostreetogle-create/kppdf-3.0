import { createCrudRouter } from '../../utils/crud-factory';
import { ProductModel } from './product.model';

export const productRouter = createCrudRouter(ProductModel);
