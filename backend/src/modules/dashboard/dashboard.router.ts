import { Router, Request, Response } from 'express';
import { ProductModel } from '../products/product.model';
import { CategoryModel } from '../categories/category.model';
import { CounterpartyModel } from '../counterparties/counterparty.model';
import { UserModel } from '../users/user.model';
import { RoleModel } from '../roles/role.model';
import { StatusModel } from '../statuses/status.model';
import { WorkTypeModel } from '../work-types/work-type.model';
import { SettingModel } from '../settings/setting.model';
import { success, error } from '../../utils/api-response';

export const dashboardRouter = Router();

dashboardRouter.get('/stats', async (_req: Request, res: Response) => {
  try {
    const [
      products,
      categories,
      counterparties,
      users,
      roles,
      statuses,
      workTypes,
      settings,
    ] = await Promise.all([
      ProductModel.countDocuments(),
      CategoryModel.countDocuments(),
      CounterpartyModel.countDocuments(),
      UserModel.countDocuments(),
      RoleModel.countDocuments(),
      StatusModel.countDocuments(),
      WorkTypeModel.countDocuments(),
      SettingModel.countDocuments(),
    ]);

    res.json(success({
      products: { total: products, label: 'Товары', icon: 'pi pi-box' },
      categories: { total: categories, label: 'Категории', icon: 'pi pi-sitemap' },
      counterparties: { total: counterparties, label: 'Контрагенты', icon: 'pi pi-users' },
      users: { total: users, label: 'Пользователи', icon: 'pi pi-user' },
      roles: { total: roles, label: 'Роли', icon: 'pi pi-shield' },
      statuses: { total: statuses, label: 'Статусы', icon: 'pi pi-tag' },
      workTypes: { total: workTypes, label: 'Типы работ', icon: 'pi pi-wrench' },
      settings: { total: settings, label: 'Настройки', icon: 'pi pi-cog' },
      total: products + categories + counterparties + users + roles + statuses + workTypes + settings,
    }));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json(error(message));
  }
});
