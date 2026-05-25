import { createCrudRouter } from '../../utils/crud-factory';
import { BomModel } from './bom.model';

export const bomRouter = createCrudRouter(BomModel);
