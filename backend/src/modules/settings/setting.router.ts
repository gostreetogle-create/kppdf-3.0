import { createCrudRouter } from '../../utils/crud-factory';
import { SettingModel } from './setting.model';

export const settingRouter = createCrudRouter(SettingModel);
