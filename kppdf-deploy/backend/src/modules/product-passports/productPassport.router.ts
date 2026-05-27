import { createCrudRouter } from '../../utils/crud-factory';
import { ProductPassportModel } from './productPassport.model';

export const productPassportRouter = createCrudRouter(ProductPassportModel, ['name', 'warrantyCode', 'article'], undefined, 'production.productPassports');
