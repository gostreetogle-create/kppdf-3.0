import { createCrudRouter } from '../../utils/crud-factory';
import { DocumentTableTypeModel } from './documentTableType.model';

export const documentTableTypeRouter = createCrudRouter(
  DocumentTableTypeModel,
  ['name', 'label', 'title'],
  undefined,
  'admin.documentTableTypes',
);
