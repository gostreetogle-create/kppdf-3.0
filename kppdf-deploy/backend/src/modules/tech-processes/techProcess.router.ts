import { createCrudRouter } from '../../utils/crud-factory';
import { TechProcessModel } from './techProcess.model';

export const techProcessRouter = createCrudRouter(TechProcessModel, undefined, undefined, 'production.techProcesses');
