import mongoose from 'mongoose';
import { connectDb } from './config/db';
import { ProductModel } from './modules/products/product.model';
import { CategoryModel } from './modules/categories/category.model';
import { CounterpartyModel } from './modules/counterparties/counterparty.model';
import { UserModel } from './modules/users/user.model';
import { RoleModel } from './modules/roles/role.model';
import { StatusModel } from './modules/statuses/status.model';
import { WorkTypeModel } from './modules/work-types/work-type.model';
import { SettingModel } from './modules/settings/setting.model';

async function seed(): Promise<void> {
  console.log('🌱 Seeding database...\n');

  await connectDb();

  // ===== 1. Категории =====
  await CategoryModel.deleteMany({});
  const categories = await CategoryModel.insertMany([
    { name: 'Металлопрокат', parentId: null, fullPath: '/Металлопрокат', sortOrder: 1, isActive: true },
    { name: 'Крепёж', parentId: null, fullPath: '/Крепёж', sortOrder: 2, isActive: true },
    { name: 'Электроника', parentId: null, fullPath: '/Электроника', sortOrder: 3, isActive: true },
    { name: 'Расходные материалы', parentId: null, fullPath: '/Расходные материалы', sortOrder: 4, isActive: true },
    { name: 'Инструмент', parentId: null, fullPath: '/Инструмент', sortOrder: 5, isActive: true },
    { name: 'Услуги', parentId: null, fullPath: '/Услуги', sortOrder: 6, isActive: true },
    { name: 'Чертежи', parentId: null, fullPath: '/Чертежи', sortOrder: 7, isActive: true },
  ]);
  console.log(`  ✅ Категории: ${categories.length}`);

  // ===== 2. Товары =====
  await ProductModel.deleteMany({});
  const products = await ProductModel.insertMany([
    { name: 'Лист стальной 3мм', sku: 'LST-001', kind: 'ITEM', unit: 'м²', categoryId: categories[0]._id.toString(), status: 'active' },
    { name: 'Лист стальной 5мм', sku: 'LST-002', kind: 'ITEM', unit: 'м²', categoryId: categories[0]._id.toString(), status: 'active' },
    { name: 'Труба профильная 40x20', sku: 'TRB-001', kind: 'ITEM', unit: 'м.п.', categoryId: categories[0]._id.toString(), status: 'active' },
    { name: 'Болт М8x30', sku: 'BRT-001', kind: 'ITEM', unit: 'шт', categoryId: categories[1]._id.toString(), status: 'active' },
    { name: 'Гайка М8', sku: 'BRT-002', kind: 'ITEM', unit: 'шт', categoryId: categories[1]._id.toString(), status: 'active' },
    { name: 'Шайба М8', sku: 'BRT-003', kind: 'ITEM', unit: 'шт', categoryId: categories[1]._id.toString(), status: 'active' },
    { name: 'Контроллер Arduino', sku: 'ELC-001', kind: 'ITEM', unit: 'шт', categoryId: categories[2]._id.toString(), status: 'active' },
    { name: 'Датчик температуры', sku: 'ELC-002', kind: 'ITEM', unit: 'шт', categoryId: categories[2]._id.toString(), status: 'draft' },
    { name: 'Кабель USB 2м', sku: 'ELC-003', kind: 'ITEM', unit: 'шт', categoryId: categories[2]._id.toString(), status: 'active' },
    { name: 'Электроды 3мм', sku: 'RSX-001', kind: 'ITEM', unit: 'кг', categoryId: categories[3]._id.toString(), status: 'active' },
    { name: 'Краска аэрозольная', sku: 'RSX-002', kind: 'ITEM', unit: 'шт', categoryId: categories[3]._id.toString(), status: 'active' },
    { name: 'Шлифкруг 125мм', sku: 'RST-003', kind: 'ITEM', unit: 'шт', categoryId: categories[3]._id.toString(), status: 'active' },
    { name: 'Сварка аргонодуговая', sku: 'SRV-001', kind: 'WORK', unit: 'ч', categoryId: categories[5]._id.toString(), status: 'active' },
    { name: 'Фрезерная обработка', sku: 'SRV-002', kind: 'WORK', unit: 'ч', categoryId: categories[5]._id.toString(), status: 'active' },
    { name: '3D-печать прототипа', sku: 'SRV-003', kind: 'SERVICE', unit: 'шт', categoryId: categories[5]._id.toString(), status: 'active' },
  ]);
  console.log(`  ✅ Товары: ${products.length}`);

  // ===== 3. Контрагенты =====
  await CounterpartyModel.deleteMany({});
  const counterparties = await CounterpartyModel.insertMany([
    { name: 'ООО «МеталлТорг»', shortName: 'МеталлТорг', legalForm: 'ООО', roles: ['supplier'], inn: '7701234567', kpp: '770101001', phone: '+7 (495) 123-45-67', email: 'info@metalltorg.ru', isActive: true },
    { name: 'ИП Иванов А.С.', shortName: 'Иванов', legalForm: 'ИП', roles: ['supplier'], inn: '770823456789', phone: '+7 (903) 111-22-33', email: 'ivanov@mail.ru', isActive: true },
    { name: 'АО «ТехноПром»', shortName: 'ТехноПром', legalForm: 'АО', roles: ['client'], inn: '7702345678', kpp: '770201001', ogrn: '1027700132195', phone: '+7 (495) 987-65-43', email: 'info@technoprom.ru', isActive: true },
    { name: 'ООО «СтройМаш»', shortName: 'СтройМаш', legalForm: 'ООО', roles: ['client', 'supplier'], inn: '7703456789', kpp: '770301001', phone: '+7 (495) 555-44-33', email: 'info@stroymash.ru', isActive: true },
    { name: 'ООО «КППДФ»', shortName: 'КППДФ', legalForm: 'ООО', roles: ['company'], inn: '7704567890', kpp: '770401001', ogrn: '1027700132196', phone: '+7 (495) 333-22-11', email: 'info@kppdf.ru', isActive: true, bankName: 'Сбербанк', bik: '044525225', checkingAccount: '40702810123450000001' },
  ]);
  console.log(`  ✅ Контрагенты: ${counterparties.length}`);

  // ===== 4. Роли =====
  await RoleModel.deleteMany({});
  const roles = await RoleModel.insertMany([
    { name: 'admin', label: 'Администратор', description: 'Полный доступ', permissions: ['*'], isSystem: true, sortOrder: 1 },
    { name: 'manager', label: 'Менеджер', description: 'Управление заказами и справочниками', permissions: ['product.*', 'counterparty.*', 'order.*'], isSystem: true, sortOrder: 2 },
    { name: 'viewer', label: 'Наблюдатель', description: 'Только просмотр', permissions: ['*.view'], isSystem: true, sortOrder: 3 },
    { name: 'engineer', label: 'Инженер', description: 'Работа с чертежами и BOM', permissions: ['product.view', 'product.edit', 'drawing.*'], isSystem: false, sortOrder: 4 },
  ]);
  console.log(`  ✅ Роли: ${roles.length}`);

  // ===== 5. Пользователи =====
  await UserModel.deleteMany({});
  const userData = [
    { username: 'admin', email: 'admin@kppdf.ru', displayName: 'Администратор', passwordHash: 'admin123', role: 'admin', isActive: true },
    { username: 'manager', email: 'manager@kppdf.ru', displayName: 'Менеджер Петров', passwordHash: 'manager123', role: 'manager', isActive: true },
    { username: 'viewer', email: 'viewer@kppdf.ru', displayName: 'Наблюдатель Сидоров', passwordHash: 'viewer123', role: 'viewer', isActive: true },
  ];
  const users = await Promise.all(userData.map((u) => UserModel.create(u)));
  console.log(`  ✅ Пользователи: ${users.length}`);

  // ===== 6. Статусы =====
  await StatusModel.deleteMany({});
  const statuses = await StatusModel.insertMany([
    { entityType: 'ORDER', statusId: 'draft', label: 'Черновик', color: '#6b7280', icon: 'pi pi-file', sortOrder: 1, isInitial: true, isFinal: false },
    { entityType: 'ORDER', statusId: 'confirmed', label: 'Подтверждён', color: '#3b82f6', icon: 'pi pi-check-circle', sortOrder: 2, isInitial: false, isFinal: false },
    { entityType: 'ORDER', statusId: 'in_progress', label: 'В работе', color: '#f59e0b', icon: 'pi pi-spinner', sortOrder: 3, isInitial: false, isFinal: false },
    { entityType: 'ORDER', statusId: 'completed', label: 'Выполнен', color: '#10b981', icon: 'pi pi-check', sortOrder: 4, isInitial: false, isFinal: true },
    { entityType: 'ORDER', statusId: 'cancelled', label: 'Отменён', color: '#ef4444', icon: 'pi pi-times', sortOrder: 5, isInitial: false, isFinal: true },
    { entityType: 'WORK_TASK', statusId: 'todo', label: 'К выполнению', color: '#6b7280', icon: 'pi pi-clock', sortOrder: 1, isInitial: true, isFinal: false },
    { entityType: 'WORK_TASK', statusId: 'in_progress', label: 'В работе', color: '#f59e0b', icon: 'pi pi-spinner', sortOrder: 2, isInitial: false, isFinal: false },
    { entityType: 'WORK_TASK', statusId: 'done', label: 'Готово', color: '#10b981', icon: 'pi pi-check', sortOrder: 3, isInitial: false, isFinal: true },
  ]);
  console.log(`  ✅ Статусы: ${statuses.length}`);

  // ===== 7. Типы работ =====
  await WorkTypeModel.deleteMany({});
  const workTypes = await WorkTypeModel.insertMany([
    { name: 'Резка металла', section: 'work', description: 'Лазерная/плазменная резка', isActive: true },
    { name: 'Сварка', section: 'work', description: 'Аргонодуговая/полуавтомат', isActive: true },
    { name: 'Фрезеровка', section: 'work', description: 'Обработка на ЧПУ', isActive: true },
    { name: 'Покраска', section: 'work', description: 'Порошковая/жидкая покраска', isActive: true },
    { name: 'Сборка', section: 'work', description: 'Механическая сборка', isActive: true },
    { name: 'Закупка материала', section: 'task', description: 'Задача на закуп', isActive: true },
    { name: 'Разработка чертежа', section: 'drawing', description: 'Создание КД', isActive: true },
    { name: 'Металл листовой', section: 'materials', description: 'Листовой прокат', isActive: true },
    { name: 'Крепёж', section: 'materials', description: 'Болты, гайки, шайбы', isActive: true },
  ]);
  console.log(`  ✅ Типы работ: ${workTypes.length}`);

  // ===== 8. Настройки =====
  await SettingModel.deleteMany({});
  const settings = await SettingModel.insertMany([
    { key: 'company.name', value: 'ООО «КППДФ»', description: 'Название компании', group: 'company' },
    { key: 'company.inn', value: '7704567890', description: 'ИНН компании', group: 'company' },
    { key: 'company.phone', value: '+7 (495) 333-22-11', description: 'Телефон', group: 'company' },
    { key: 'company.email', value: 'info@kppdf.ru', description: 'Email', group: 'company' },
    { key: 'company.address', value: 'г. Москва, ул. Строителей, д. 5', description: 'Юридический адрес', group: 'company' },
    { key: 'order.prefix', value: 'З-', description: 'Префикс номера заказа', group: 'order' },
    { key: 'order.default_status', value: 'draft', description: 'Статус по умолчанию', group: 'order' },
    { key: 'currency.default', value: 'RUB', description: 'Валюта по умолчанию', group: 'currency' },
    { key: 'currency.symbol', value: '₽', description: 'Символ валюты', group: 'currency' },
    { key: 'page.size', value: '50', description: 'Записей на странице', group: 'ui' },
  ]);
  console.log(`  ✅ Настройки: ${settings.length}`);

  console.log('\n🎉 Seed completed!');
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
