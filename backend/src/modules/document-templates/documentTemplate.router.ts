import { createCrudRouter } from '../../utils/crud-factory';
import { DocumentTemplateModel } from './documentTemplate.model';

export const documentTemplateRouter = createCrudRouter(DocumentTemplateModel);
