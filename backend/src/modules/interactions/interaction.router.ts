import { createCrudRouter } from '../../utils/crud-factory';
import { InteractionModel } from './interaction.model';

export const interactionRouter = createCrudRouter(InteractionModel);
