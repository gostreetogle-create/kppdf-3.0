import { createCrudRouter } from '../../utils/crud-factory';
import { AttributeDefinitionModel } from './attributeDefinition.model';

export const attributeDefinitionRouter = createCrudRouter(
  AttributeDefinitionModel,
  ['name', 'label', 'entityType'],
  undefined,
  'admin.attributes',
);
