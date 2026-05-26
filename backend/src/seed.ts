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
import { QuotationModel } from './modules/quotations/quotation.model';
import { OrderModel } from './modules/orders/order.model';
import { BomModel } from './modules/boms/bom.model';
import { OperationModel } from './modules/operations/operation.model';
import { TechProcessModel } from './modules/tech-processes/techProcess.model';
import { PurchaseRequestModel } from './modules/purchase-requests/purchaseRequest.model';
import { PurchaseOrderModel } from './modules/purchase-orders/purchaseOrder.model';
import { WarehouseModel } from './modules/warehouses/warehouse.model';
import { StockMovementModel } from './modules/stock/stockMovement.model';
import { ReservationModel } from './modules/reservations/reservation.model';
import { WorkOrderModel } from './modules/work-orders/workOrder.model';
import { WorkOrderOperationModel } from './modules/work-order-operations/workOrderOperation.model';
import { CostCalculationModel } from './modules/cost/costCalculation.model';
import { ActualCostModel } from './modules/actual-costs/actualCost.model';
import { ShipmentModel } from './modules/shipments/shipment.model';
import { ShippingDocModel } from './modules/shipping-docs/shippingDoc.model';
import { CounterModel } from './modules/counters/counter.model';
import { InteractionModel } from './modules/interactions/interaction.model';
import { TenderModel } from './modules/tenders/tender.model';
import { ProductPassportModel } from './modules/product-passports/productPassport.model';
import { AttributeDefinitionModel } from './modules/attribute-definitions/attributeDefinition.model';
import { EntityAttributeValueModel } from './modules/entity-attribute-values/entityAttributeValue.model';

async function seed(): Promise<void> {
  console.log('🌱 KPPDF 3.0 — Seed: наполнение БД тестовыми и часто используемыми данными\n');

  await connectDb();

  // ================================================================
  // 1. КАТЕГОРИИ (часто используемые)
  // ================================================================
  await CategoryModel.deleteMany({});
  const categories = await CategoryModel.insertMany([
    { name: 'Металлопрокат', parentId: null, fullPath: '/Металлопрокат', description: 'Листовой и профильный металл', sortOrder: 1, isActive: true },
    { name: 'Крепёж', parentId: null, fullPath: '/Крепёж', description: 'Болты, гайки, шайбы', sortOrder: 2, isActive: true },
    { name: 'Электроника', parentId: null, fullPath: '/Электроника', description: 'Комплектующие и контроллеры', sortOrder: 3, isActive: true },
    { name: 'Расходные материалы', parentId: null, fullPath: '/Расходные материалы', description: 'Электроды, краска, абразив', sortOrder: 4, isActive: true },
    { name: 'Инструмент', parentId: null, fullPath: '/Инструмент', description: 'Ручной и электроинструмент', sortOrder: 5, isActive: true },
    { name: 'Услуги', parentId: null, fullPath: '/Услуги', sortOrder: 6, isActive: true },
    { name: 'Чертежи', parentId: null, fullPath: '/Чертежи', description: 'Конструкторская документация', sortOrder: 7, isActive: true },
    { name: 'Тара и упаковка', parentId: null, fullPath: '/Тара и упаковка', description: 'Коробки, стрейч-плёнка', sortOrder: 8, isActive: true },
    // Подкатегории
    { name: 'Листовой металл', parentId: null, fullPath: '/Металлопрокат/Листовой металл', sortOrder: 11, isActive: true },
    { name: 'Профильный металл', parentId: null, fullPath: '/Металлопрокат/Профильный металл', sortOrder: 12, isActive: true },
    { name: 'Метизы', parentId: null, fullPath: '/Крепёж/Метизы', sortOrder: 21, isActive: true },
  ]);
  console.log(`  ✅ Категории (часто используемые): ${categories.length}`);

  // ================================================================
  // 2. ТОВАРЫ (часто используемые)
  // ================================================================
  await ProductModel.deleteMany({});
  const products = await ProductModel.insertMany([
    { name: 'Лист стальной 3мм 1250x2500', sku: 'LST-001', kind: 'ITEM', unit: 'м²', categoryId: categories[0]._id.toString(), status: 'active', description: 'Сталь 3мм, размер 1250x2500мм', isActive: true },
    { name: 'Лист стальной 5мм 1250x2500', sku: 'LST-002', kind: 'ITEM', unit: 'м²', categoryId: categories[0]._id.toString(), status: 'active', isActive: true },
    { name: 'Лист нерж. 2мм 1000x2000', sku: 'LST-003', kind: 'ITEM', unit: 'м²', categoryId: categories[8]._id.toString(), status: 'active', isActive: true },
    { name: 'Труба профильная 40x20x2', sku: 'TRB-001', kind: 'ITEM', unit: 'м.п.', categoryId: categories[9]._id.toString(), status: 'active', isActive: true },
    { name: 'Труба профильная 60x30x2', sku: 'TRB-002', kind: 'ITEM', unit: 'м.п.', categoryId: categories[9]._id.toString(), status: 'active', isActive: true },
    { name: 'Уголок 50x50x5', sku: 'UGL-001', kind: 'ITEM', unit: 'м.п.', categoryId: categories[0]._id.toString(), status: 'active', isActive: true },
    { name: 'Болт М8x30 оцинк.', sku: 'BRT-001', kind: 'ITEM', unit: 'шт', categoryId: categories[1]._id.toString(), status: 'active', isActive: true },
    { name: 'Болт М10x40 оцинк.', sku: 'BRT-002', kind: 'ITEM', unit: 'шт', categoryId: categories[1]._id.toString(), status: 'active', isActive: true },
    { name: 'Гайка М8 оцинк.', sku: 'BRT-003', kind: 'ITEM', unit: 'шт', categoryId: categories[1]._id.toString(), status: 'active', isActive: true },
    { name: 'Гайка М10 оцинк.', sku: 'BRT-004', kind: 'ITEM', unit: 'шт', categoryId: categories[1]._id.toString(), status: 'active', isActive: true },
    { name: 'Шайба М8 оцинк.', sku: 'BRT-005', kind: 'ITEM', unit: 'шт', categoryId: categories[1]._id.toString(), status: 'active', isActive: true },
    { name: 'Шайба М10 оцинк.', sku: 'BRT-006', kind: 'ITEM', unit: 'шт', categoryId: categories[1]._id.toString(), status: 'active', isActive: true },
    { name: 'Контроллер Arduino Mega', sku: 'ELC-001', kind: 'ITEM', unit: 'шт', categoryId: categories[2]._id.toString(), status: 'active', description: 'ATmega2560', isActive: true },
    { name: 'Датчик температуры DS18B20', sku: 'ELC-002', kind: 'ITEM', unit: 'шт', categoryId: categories[2]._id.toString(), status: 'active', isActive: true },
    { name: 'Датчик влажности DHT22', sku: 'ELC-003', kind: 'ITEM', unit: 'шт', categoryId: categories[2]._id.toString(), status: 'draft', isActive: true },
    { name: 'Кабель USB Type-C 2м', sku: 'ELC-004', kind: 'ITEM', unit: 'шт', categoryId: categories[2]._id.toString(), status: 'active', isActive: true },
    { name: 'Плата расширения 8-канальная', sku: 'ELC-005', kind: 'ITEM', unit: 'шт', categoryId: categories[2]._id.toString(), status: 'active', isActive: true },
    { name: 'Электроды МР-3 3мм', sku: 'RSX-001', kind: 'ITEM', unit: 'кг', categoryId: categories[3]._id.toString(), status: 'active', isActive: true },
    { name: 'Краска аэрозольная чёрная 520мл', sku: 'RSX-002', kind: 'ITEM', unit: 'шт', categoryId: categories[3]._id.toString(), status: 'active', isActive: true },
    { name: 'Шлифкруг 125мм P80', sku: 'RSX-003', kind: 'ITEM', unit: 'шт', categoryId: categories[3]._id.toString(), status: 'active', isActive: true },
    { name: 'Сварка аргонодуговая (работа)', sku: 'SRV-001', kind: 'WORK', unit: 'ч', categoryId: categories[5]._id.toString(), status: 'active', isActive: true },
    { name: 'Фрезерная обработка ЧПУ (работа)', sku: 'SRV-002', kind: 'WORK', unit: 'ч', categoryId: categories[5]._id.toString(), status: 'active', isActive: true },
    { name: '3D-печать прототипа PLA', sku: 'SRV-003', kind: 'SERVICE', unit: 'шт', categoryId: categories[5]._id.toString(), status: 'active', isActive: true },
  ]);
  console.log(`  ✅ Товары (часто используемые): ${products.length}`);

  // ================================================================
  // 3. КОНТРАГЕНТЫ (часто используемые)
  // ================================================================
  await CounterpartyModel.deleteMany({});
  const counterparties = await CounterpartyModel.insertMany([
    // Поставщики
    { name: 'ООО «МеталлТорг»', shortName: 'МеталлТорг', legalForm: 'ООО', roles: ['supplier'], inn: '7701234567', kpp: '770101001', ogrn: '1027700132190', phone: '+7 (495) 123-45-67', email: 'info@metalltorg.ru', isActive: true },
    { name: 'ИП Иванов А.С.', shortName: 'Иванов', legalForm: 'ИП', roles: ['supplier'], inn: '770823456789', phone: '+7 (903) 111-22-33', email: 'ivanov@mail.ru', isActive: true },
    { name: 'ООО «ЭлектроКомплект»', shortName: 'ЭлектроКомплект', legalForm: 'ООО', roles: ['supplier'], inn: '7705678901', phone: '+7 (495) 777-88-99', email: 'sales@electrokomplekt.ru', isActive: true },
    { name: 'ООО «Русский Крепёж»', shortName: 'РусКрепёж', legalForm: 'ООО', roles: ['supplier'], inn: '7706789012', phone: '+7 (495) 444-55-66', email: 'zakaz@ruskrep.ru', isActive: true },
    // Клиенты
    { name: 'АО «ТехноПром»', shortName: 'ТехноПром', legalForm: 'АО', roles: ['client'], inn: '7702345678', kpp: '770201001', ogrn: '1027700132195', phone: '+7 (495) 987-65-43', email: 'info@technoprom.ru', isActive: true },
    { name: 'ООО «СтройМаш»', shortName: 'СтройМаш', legalForm: 'ООО', roles: ['client', 'supplier'], inn: '7703456789', kpp: '770301001', phone: '+7 (495) 555-44-33', email: 'info@stroymash.ru', isActive: true },
    { name: 'ИП Петров В.К.', shortName: 'Петров', legalForm: 'ИП', roles: ['client'], inn: '770923456780', phone: '+7 (916) 777-88-99', email: 'petrov@yandex.ru', isActive: true },
    { name: 'ЗАО «НефтеМаш»', shortName: 'НефтеМаш', legalForm: 'АО', roles: ['client'], inn: '7707890123', phone: '+7 (495) 222-33-44', email: 'info@neftemash.ru', isActive: true },
    // Наши компании (юрлица, от лица которых работаем)
    { name: 'ООО «КППДФ»', shortName: 'КППДФ', legalForm: 'ООО', roles: ['company'], inn: '7704567890', kpp: '770401001', ogrn: '1027700132196', phone: '+7 (495) 333-22-11', email: 'info@kppdf.ru', isActive: true, bankName: 'Сбербанк', bik: '044525225', checkingAccount: '40702810123450000001', correspondentAccount: '30101810400000000225' },
    { name: 'ООО «СпортИН-ЮГ»', shortName: 'СпортИН-ЮГ', legalForm: 'ООО', roles: ['company'], inn: '7705567891', kpp: '770501001', phone: '+7 (861) 123-45-67', email: 'sportin-yug@mail.ru', isActive: true },
    { name: 'ООО «СпортСтройЮГ»', shortName: 'СпортСтройЮГ', legalForm: 'ООО', roles: ['company'], inn: '7706567892', kpp: '770601001', phone: '+7 (861) 234-56-78', email: 'sportstroy_yug@mail.ru', isActive: true },
    { name: 'ООО «Приват-деал»', shortName: 'Приват-деал', legalForm: 'ООО', roles: ['company'], inn: '7707567893', kpp: '770701001', phone: '+7 (495) 345-67-89', email: 'info-privatdeal@mail.ru', isActive: true },
  ]);
  console.log(`  ✅ Контрагенты (часто используемые): ${counterparties.length}`);

  // ================================================================
  // 4. РОЛИ (RBAC — полная матрица permissions)
  // ================================================================
  await RoleModel.deleteMany({});
  const roles = await RoleModel.insertMany([
    { name: 'admin', label: 'Администратор', description: 'Полный доступ ко всем функциям системы', permissions: ['*'], isSystem: true, sortOrder: 1 },
    { name: 'director', label: 'Директор', description: 'Просмотр всего + утверждение ключевых решений', permissions: [
        '*.view',
        'office.quotations.approve',
        'office.orders.approve',
        'warehouse.purchaseRequests.approve',
        'warehouse.purchaseOrders.approve',
      ], isSystem: true, sortOrder: 2 },
    { name: 'manager', label: 'Менеджер', description: 'Управление тендерами, КП, заказами, контрагентами', permissions: [
        'office.*',
      ], isSystem: true, sortOrder: 3 },
    { name: 'accountant', label: 'Бухгалтер', description: 'Калькуляции, фактические затраты, отгрузочные документы', permissions: [
        'accounting.*',
        'office.orders.view',
        'office.counterparties.view',
      ], isSystem: true, sortOrder: 4 },
    { name: 'engineer', label: 'Инженер-конструктор', description: 'BOM, техпроцессы, паспорта изделий', permissions: [
        'production.*',
        'office.interactions.view',
        'office.interactions.create',
      ], isSystem: false, sortOrder: 5 },
    { name: 'foreman', label: 'Мастер цеха', description: 'Производственные наряды, операции, создание паспортов', permissions: [
        'production.operations.view',
        'production.workOrders.create',
        'production.workOrders.edit',
        'production.workOrderOperations.create',
        'production.workOrderOperations.edit',
        'production.productPassports.create',
        'production.boms.view',
        'production.techProcesses.view',
        'production.workOrders.view',
        'production.workOrderOperations.view',
        'production.productPassports.view',
        'office.interactions.view',
        'office.interactions.create',
        'warehouse.products.view',
      ], isSystem: false, sortOrder: 6 },
    { name: 'storekeeper', label: 'Зав. складом', description: 'Склад, движения, закупки, отгрузки', permissions: [
        'warehouse.warehouses.*',
        'warehouse.stockMovements.*',
        'warehouse.reservations.*',
        'warehouse.purchaseRequests.*',
        'warehouse.purchaseRequests.approve',
        'warehouse.purchaseOrders.view',
        'warehouse.shipments.*',
        'warehouse.products.view',
        'office.counterparties.view',
        'office.orders.view',
      ], isSystem: false, sortOrder: 7 },
    { name: 'purchaser', label: 'Снабженец', description: 'Заявки на закуп, заказы поставщикам', permissions: [
        'warehouse.purchaseRequests.*',
        'warehouse.purchaseOrders.*',
        'warehouse.warehouses.view',
        'warehouse.products.view',
        'office.counterparties.view',
      ], isSystem: false, sortOrder: 8 },
    { name: 'viewer', label: 'Наблюдатель', description: 'Только просмотр (кроме администрирования)', permissions: [
        '*.view',
      ], isSystem: true, sortOrder: 9 },
  ]);
  console.log(`  ✅ Роли: ${roles.length}`);

  // ================================================================
  // 5. ПОЛЬЗОВАТЕЛИ (тестовые — по одному на каждую роль)
  // ================================================================
  await UserModel.deleteMany({});
  // Plain-text пароли — pre('save') хук сам захеширует их bcrypt
  const userData = [
    { username: 'admin', email: 'admin@kppdf.ru', displayName: 'Главный администратор', passwordHash: 'admin123', role: 'admin', isActive: true },
    { username: 'director', email: 'director@kppdf.ru', displayName: 'Соколов Дмитрий', passwordHash: 'director123', role: 'director', isActive: true },
    { username: 'manager', email: 'manager@kppdf.ru', displayName: 'Петров Иван', passwordHash: 'manager123', role: 'manager', isActive: true },
    { username: 'accountant', email: 'accountant@kppdf.ru', displayName: 'Смирнова Елена', passwordHash: 'accountant123', role: 'accountant', isActive: true },
    { username: 'engineer', email: 'engineer@kppdf.ru', displayName: 'Кузнецов Андрей', passwordHash: 'engineer123', role: 'engineer', isActive: true },
    { username: 'foreman', email: 'foreman@kppdf.ru', displayName: 'Михайлов Сергей', passwordHash: 'foreman123', role: 'foreman', isActive: true },
    { username: 'storekeeper', email: 'store@kppdf.ru', displayName: 'Иванов Александр', passwordHash: 'storekeeper123', role: 'storekeeper', isActive: true },
    { username: 'purchaser', email: 'purchaser@kppdf.ru', displayName: 'Козлова Ольга', passwordHash: 'purchaser123', role: 'purchaser', isActive: true },
    { username: 'viewer', email: 'viewer@kppdf.ru', displayName: 'Сидоров Николай', passwordHash: 'viewer123', role: 'viewer', isActive: true },
  ];
  const users = await Promise.all(userData.map((u) => UserModel.create(u)));
  console.log(`  ✅ Пользователи: ${users.length}`);

  // ================================================================
  // 6. СТАТУСЫ (часто используемые — справочник workflow)
  // ================================================================
  await StatusModel.deleteMany({});
  const statuses = await StatusModel.insertMany([
    // ORDER workflow
    { entityType: 'ORDER', statusId: 'draft', label: 'Черновик', color: '#6b7280', icon: 'pi pi-file', sortOrder: 1, isInitial: true, isFinal: false },
    { entityType: 'ORDER', statusId: 'confirmed', label: 'Подтверждён', color: '#3b82f6', icon: 'pi pi-check-circle', sortOrder: 2, isInitial: false, isFinal: false },
    { entityType: 'ORDER', statusId: 'in_progress', label: 'В работе', color: '#f59e0b', icon: 'pi pi-spinner', sortOrder: 3, isInitial: false, isFinal: false },
    { entityType: 'ORDER', statusId: 'completed', label: 'Выполнен', color: '#10b981', icon: 'pi pi-check', sortOrder: 4, isInitial: false, isFinal: true },
    { entityType: 'ORDER', statusId: 'cancelled', label: 'Отменён', color: '#ef4444', icon: 'pi pi-times', sortOrder: 5, isInitial: false, isFinal: true },
    // WORK_TASK workflow
    { entityType: 'WORK_TASK', statusId: 'pending', label: 'Ожидает', color: '#6b7280', icon: 'pi pi-clock', sortOrder: 1, isInitial: true, isFinal: false },
    { entityType: 'WORK_TASK', statusId: 'in_progress', label: 'В работе', color: '#f59e0b', icon: 'pi pi-spinner', sortOrder: 2, isInitial: false, isFinal: false },
    { entityType: 'WORK_TASK', statusId: 'completed', label: 'Выполнено', color: '#10b981', icon: 'pi pi-check', sortOrder: 3, isInitial: false, isFinal: true },
    { entityType: 'WORK_TASK', statusId: 'cancelled', label: 'Отменён', color: '#ef4444', icon: 'pi pi-times', sortOrder: 4, isInitial: false, isFinal: true },
    // QUOTATION workflow
    { entityType: 'QUOTATION', statusId: 'draft', label: 'Черновик', color: '#6b7280', icon: 'pi pi-file', sortOrder: 1, isInitial: true, isFinal: false },
    { entityType: 'QUOTATION', statusId: 'sent', label: 'Отправлен', color: '#3b82f6', icon: 'pi pi-send', sortOrder: 2, isInitial: false, isFinal: false },
    { entityType: 'QUOTATION', statusId: 'accepted', label: 'Принят', color: '#10b981', icon: 'pi pi-check-circle', sortOrder: 3, isInitial: false, isFinal: true },
    { entityType: 'QUOTATION', statusId: 'rejected', label: 'Отклонён', color: '#ef4444', icon: 'pi pi-times-circle', sortOrder: 4, isInitial: false, isFinal: true },
    // PURCHASE_REQUEST workflow
    { entityType: 'PURCHASE_REQUEST', statusId: 'draft', label: 'Черновик', color: '#6b7280', icon: 'pi pi-file', sortOrder: 1, isInitial: true, isFinal: false },
    { entityType: 'PURCHASE_REQUEST', statusId: 'approved', label: 'Утверждён', color: '#10b981', icon: 'pi pi-check', sortOrder: 2, isInitial: false, isFinal: false },
    { entityType: 'PURCHASE_REQUEST', statusId: 'ordered', label: 'Заказан', color: '#3b82f6', icon: 'pi pi-truck', sortOrder: 3, isInitial: false, isFinal: false },
    { entityType: 'PURCHASE_REQUEST', statusId: 'received', label: 'Получен', color: '#8b5cf6', icon: 'pi pi-inbox', sortOrder: 4, isInitial: false, isFinal: true },
    // PURCHASE_ORDER workflow
    { entityType: 'PURCHASE_ORDER', statusId: 'new', label: 'Новый', color: '#6b7280', icon: 'pi pi-file', sortOrder: 1, isInitial: true, isFinal: false },
    { entityType: 'PURCHASE_ORDER', statusId: 'sent', label: 'Отправлен', color: '#3b82f6', icon: 'pi pi-send', sortOrder: 2, isInitial: false, isFinal: false },
    { entityType: 'PURCHASE_ORDER', statusId: 'confirmed_by_supplier', label: 'Подтверждён', color: '#f59e0b', icon: 'pi pi-check-circle', sortOrder: 3, isInitial: false, isFinal: false },
    { entityType: 'PURCHASE_ORDER', statusId: 'partially_received', label: 'Частично получен', color: '#8b5cf6', icon: 'pi pi-inbox', sortOrder: 4, isInitial: false, isFinal: false },
    { entityType: 'PURCHASE_ORDER', statusId: 'completed', label: 'Выполнен', color: '#10b981', icon: 'pi pi-check', sortOrder: 5, isInitial: false, isFinal: true },
    // SHIPMENT workflow
    { entityType: 'SHIPMENT', statusId: 'preparing', label: 'Собирается', color: '#f59e0b', icon: 'pi pi-box', sortOrder: 1, isInitial: true, isFinal: false },
    { entityType: 'SHIPMENT', statusId: 'shipped', label: 'Отгружен', color: '#3b82f6', icon: 'pi pi-truck', sortOrder: 2, isInitial: false, isFinal: false },
    { entityType: 'SHIPMENT', statusId: 'delivered', label: 'Доставлен', color: '#10b981', icon: 'pi pi-check', sortOrder: 3, isInitial: false, isFinal: true },
    { entityType: 'SHIPMENT', statusId: 'cancelled', label: 'Отменён', color: '#ef4444', icon: 'pi pi-times', sortOrder: 4, isInitial: false, isFinal: true },
    // MATERIAL_REQUEST workflow
    { entityType: 'MATERIAL_REQUEST', statusId: 'draft', label: 'Черновик', color: '#6b7280', icon: 'pi pi-file', sortOrder: 1, isInitial: true, isFinal: false },
    { entityType: 'MATERIAL_REQUEST', statusId: 'approved', label: 'Утверждена', color: '#10b981', icon: 'pi pi-check', sortOrder: 2, isInitial: false, isFinal: false },
    { entityType: 'MATERIAL_REQUEST', statusId: 'issued', label: 'Выдана', color: '#8b5cf6', icon: 'pi pi-arrow-right', sortOrder: 3, isInitial: false, isFinal: true },
  ]);
  console.log(`  ✅ Статусы (часто используемые): ${statuses.length}`);

  // ================================================================
  // 7. ТИПЫ РАБОТ
  // ================================================================
  await WorkTypeModel.deleteMany({});
  const workTypes = await WorkTypeModel.insertMany([
    { name: 'Резка металла лазерная', section: 'work', description: 'Лазерная резка листового металла', isActive: true },
    { name: 'Резка металла плазма', section: 'work', description: 'Плазменная резка', isActive: true },
    { name: 'Сварка аргонодуговая (TIG)', section: 'work', description: 'Сварка нержавейки/алюминия', isActive: true },
    { name: 'Сварка полуавтомат (MIG/MAG)', section: 'work', description: 'Сварка углеродистой стали', isActive: true },
    { name: 'Фрезеровка ЧПУ', section: 'work', description: 'Обработка на 3-осевом ЧПУ', isActive: true },
    { name: 'Покраска порошковая', section: 'work', description: 'Порошковая окраска', isActive: true },
    { name: 'Покраска жидкая', section: 'work', description: 'Жидкая окраска', isActive: true },
    { name: 'Сборка механическая', section: 'work', description: 'Сборка узлов и агрегатов', isActive: true },
    { name: 'Электромонтаж', section: 'work', description: 'Монтаж электрооборудования', isActive: true },
    { name: 'Закупка материала', section: 'task', description: 'Задача на закуп ТМЦ', isActive: true },
    { name: 'Разработка чертежа КД', section: 'drawing', description: 'Создание конструкторской документации', isActive: true },
    { name: 'Согласование с заказчиком', section: 'task', description: 'Согласование изменений', isActive: true },
    { name: 'Металл листовой', section: 'materials', description: 'Листовой прокат', isActive: true },
    { name: 'Металл профильный', section: 'materials', description: 'Трубы, уголок, швеллер', isActive: true },
    { name: 'Крепёж', section: 'materials', description: 'Болты, гайки, шайбы, винты', isActive: true },
    { name: 'Лакокрасочные материалы', section: 'materials', description: 'Краски, грунты, растворители', isActive: true },
  ]);
  console.log(`  ✅ Типы работ (часто используемые): ${workTypes.length}`);

  // ================================================================
  // 8. НАСТРОЙКИ
  // ================================================================
  await SettingModel.deleteMany({});
  const settings = await SettingModel.insertMany([
    { key: 'company.name', value: 'ООО «КППДФ»', description: 'Название компании', group: 'company' },
    { key: 'company.shortName', value: 'КППДФ', description: 'Краткое название', group: 'company' },
    { key: 'company.inn', value: '7704567890', description: 'ИНН компании', group: 'company' },
    { key: 'company.kpp', value: '770401001', description: 'КПП компании', group: 'company' },
    { key: 'company.ogrn', value: '1027700132196', description: 'ОГРН компании', group: 'company' },
    { key: 'company.phone', value: '+7 (495) 333-22-11', description: 'Телефон', group: 'company' },
    { key: 'company.email', value: 'info@kppdf.ru', description: 'Email', group: 'company' },
    { key: 'company.address', value: 'г. Москва, ул. Строителей, д. 5, офис 12', description: 'Юридический адрес', group: 'company' },
    { key: 'order.prefix', value: 'З-', description: 'Префикс номера заказа', group: 'order' },
    { key: 'order.default_status', value: 'draft', description: 'Статус заказа по умолчанию', group: 'order' },
    { key: 'quotation.prefix', value: 'КП-', description: 'Префикс номера КП', group: 'quotation' },
    { key: 'quotation.valid_days', value: '30', description: 'Срок действия КП (дней)', group: 'quotation' },
    { key: 'purchase_order.prefix', value: 'ПЗ-', description: 'Префикс заказа поставщику', group: 'purchase' },
    { key: 'purchase_request.prefix', value: 'ЗЗ-', description: 'Префикс заявки на закуп', group: 'purchase' },
    { key: 'shipment.prefix', value: 'ОТ-', description: 'Префикс отгрузки', group: 'shipment' },
    { key: 'work_order.prefix', value: 'Н-', description: 'Префикс наряда', group: 'production' },
    { key: 'currency.default', value: 'RUB', description: 'Валюта по умолчанию', group: 'currency' },
    { key: 'currency.symbol', value: '₽', description: 'Символ валюты', group: 'currency' },
    { key: 'page.size', value: '50', description: 'Записей на странице по умолчанию', group: 'ui' },
    { key: 'page.size_directories', value: '25', description: 'Записей на странице справочников', group: 'ui' },
    { key: 'notifications.email_enabled', value: 'false', description: 'Включить email-уведомления', group: 'notifications' },
    { key: 'production.default_workshop', value: 'Цех №1', description: 'Цех по умолчанию', group: 'production' },
  ]);
  console.log(`  ✅ Настройки: ${settings.length}`);

  // ================================================================
  // 9. СЧЁТЧИКИ (автонумерация документов)
  // ================================================================
  await CounterModel.deleteMany({});
  const counters = await CounterModel.insertMany([
    { entity: 'quotation', prefix: 'КП-', year: 2026, seq: 0 },
    { entity: 'order', prefix: 'З-', year: 2026, seq: 0 },
    { entity: 'purchase_order', prefix: 'ПЗ-', year: 2026, seq: 0 },
    { entity: 'purchase_request', prefix: 'ЗЗ-', year: 2026, seq: 0 },
    { entity: 'work_order', prefix: 'Н-', year: 2026, seq: 0 },
    { entity: 'shipment', prefix: 'ОТ-', year: 2026, seq: 0 },
    { entity: 'shipping_doc', prefix: 'ДО-', year: 2026, seq: 0 },
    { entity: 'tender', prefix: 'Т-', year: 2026, seq: 27 },
  ]);
  console.log(`  ✅ Счётчики: ${counters.length}`);

  // ================================================================
  // 10. СКЛАДЫ (часто используемые)
  // ================================================================
  await WarehouseModel.deleteMany({});
  const warehouses = await WarehouseModel.insertMany([
    { name: 'Основной склад', address: 'г. Москва, ул. Строителей, д. 5', type: 'raw_materials', isActive: true },
    { name: 'Производственный склад', address: 'г. Москва, ул. Заводская, д. 10', type: 'production', isActive: true },
    { name: 'Склад готовой продукции', address: 'г. Москва, ул. Строителей, д. 5', type: 'finished_goods', isActive: true },
    { name: 'Склад инструмента', address: 'г. Москва, ул. Заводская, д. 10', type: 'raw_materials', isActive: true },
  ]);
  console.log(`  ✅ Склады (часто используемые): ${warehouses.length}`);

  // ================================================================
  // 11. ОПЕРАЦИИ (технологические)
  // ================================================================
  await OperationModel.deleteMany({});
  const operations = await OperationModel.insertMany([
    { number: 10, name: 'Лазерная резка', workshop: 'Цех №1', duration: 0.5, costPerHour: 2500, isActive: true },
    { number: 20, name: 'Зачистка кромок', workshop: 'Цех №1', duration: 0.2, costPerHour: 800, isActive: true },
    { number: 30, name: 'Гибка листа', workshop: 'Цех №1', duration: 0.3, costPerHour: 1500, isActive: true },
    { number: 40, name: 'Сварка TIG', workshop: 'Цех №2', duration: 1.0, costPerHour: 2000, isActive: true },
    { number: 50, name: 'Сварка MIG/MAG', workshop: 'Цех №2', duration: 0.8, costPerHour: 1800, isActive: true },
    { number: 60, name: 'Фрезерная обработка ЧПУ', workshop: 'Цех №3', duration: 1.5, costPerHour: 3000, isActive: true },
    { number: 70, name: 'Сверлильная', workshop: 'Цех №1', duration: 0.15, costPerHour: 900, isActive: true },
    { number: 80, name: 'Покраска порошковая', workshop: 'Цех №4', duration: 0.5, costPerHour: 1200, isActive: true },
    { number: 90, name: 'Сборка', workshop: 'Цех №2', duration: 0.8, costPerHour: 1100, isActive: true },
    { number: 100, name: 'Контроль качества', workshop: 'ОТК', duration: 0.25, costPerHour: 1000, isActive: true },
  ]);
  console.log(`  ✅ Операции: ${operations.length}`);

  // ================================================================
  // 12. КОММЕРЧЕСКИЕ ПРЕДЛОЖЕНИЯ (КП)
  // ================================================================
  await QuotationModel.deleteMany({});
  const quotations = await QuotationModel.insertMany([
    { number: 'КП-2026-001', counterpartyId: counterparties[4]._id.toString(), date: new Date('2026-05-10'), validUntil: new Date('2026-06-10'), statusId: 'sent', total: 450000, notes: 'Изготовление металлоконструкций по чертежам заказчика', isActive: true },
    { number: 'КП-2026-002', counterpartyId: counterparties[5]._id.toString(), date: new Date('2026-05-12'), validUntil: new Date('2026-06-12'), statusId: 'accepted', total: 1280000, notes: 'Поставка датчиков температуры 200 шт.', isActive: true },
    { number: 'КП-2026-003', counterpartyId: counterparties[6]._id.toString(), date: new Date('2026-05-15'), validUntil: new Date('2026-06-15'), statusId: 'draft', total: 85000, notes: 'Разработка корпуса прибора', isActive: true },
    { number: 'КП-2026-004', counterpartyId: counterparties[7]._id.toString(), date: new Date('2026-05-18'), validUntil: new Date('2026-06-18'), statusId: 'rejected', total: 2560000, notes: 'Модернизация производственной линии', isActive: true },
    { number: 'КП-2026-005', counterpartyId: counterparties[4]._id.toString(), date: new Date('2026-05-20'), validUntil: new Date('2026-06-20'), statusId: 'draft', total: 320000, notes: 'Дополнительная партия крепежа', isActive: true },
  ]);
  console.log(`  ✅ Коммерческие предложения (КП): ${quotations.length}`);

  // ================================================================
  // 13. ЗАКАЗЫ
  // ================================================================
  await OrderModel.deleteMany({});
  const orders = await OrderModel.insertMany([
    { number: 'З-2026-001', counterpartyId: counterparties[4]._id.toString(), quotationId: quotations[1]._id.toString(), date: new Date('2026-05-13'), plannedDate: new Date('2026-07-01'), statusId: 'in_progress', total: 1280000, notes: 'Поставка датчиков температуры — подтверждённый заказ', isActive: true },
    { number: 'З-2026-002', counterpartyId: counterparties[5]._id.toString(), date: new Date('2026-05-14'), plannedDate: new Date('2026-06-15'), statusId: 'confirmed', total: 670000, notes: 'Ремонт производственного оборудования', isActive: true },
    { number: 'З-2026-003', counterpartyId: counterparties[7]._id.toString(), date: new Date('2026-05-16'), plannedDate: new Date('2026-08-01'), statusId: 'draft', total: 3450000, notes: 'Разработка и изготовление стенда испытаний', isActive: true },
    { number: 'З-2026-004', counterpartyId: counterparties[4]._id.toString(), date: new Date('2026-05-19'), plannedDate: new Date('2026-06-20'), statusId: 'completed', total: 450000, notes: 'Изготовление металлоконструкций — выполнено', isActive: true },
  ]);
  console.log(`  ✅ Заказы: ${orders.length}`);

  // ================================================================
  // 14. BOM (Спецификации)
  // ================================================================
  await BomModel.deleteMany({});
  const boms = await BomModel.insertMany([
    { productId: products[0]._id.toString(), version: 1, isActive: true },
    { productId: products[4]._id.toString(), version: 1, isActive: true },
    { productId: products[5]._id.toString(), version: 2, isActive: true },
    { productId: products[3]._id.toString(), version: 1, isActive: true },
  ]);
  console.log(`  ✅ BOM (спецификации): ${boms.length}`);

  // ================================================================
  // 15. ТЕХПРОЦЕССЫ
  // ================================================================
  await TechProcessModel.deleteMany({});
  const techProcesses = await TechProcessModel.insertMany([
    { productId: products[0]._id.toString(), totalDuration: 1.5, isActive: true },
    { productId: products[4]._id.toString(), totalDuration: 2.8, isActive: true },
    { productId: products[3]._id.toString(), totalDuration: 0.3, isActive: true },
  ]);
  console.log(`  ✅ Техпроцессы: ${techProcesses.length}`);

  // ================================================================
  // 16. ЗАЯВКИ НА ЗАКУП
  // ================================================================
  await PurchaseRequestModel.deleteMany({});
  const purchaseRequests = await PurchaseRequestModel.insertMany([
    { number: 'ЗЗ-2026-001', date: new Date('2026-05-11'), createdBy: users[1]._id.toString(), statusId: 'approved', orderId: orders[0]._id.toString(), isActive: true },
    { number: 'ЗЗ-2026-002', date: new Date('2026-05-15'), createdBy: users[3]._id.toString(), statusId: 'draft', orderId: orders[2]._id.toString(), isActive: true },
    { number: 'ЗЗ-2026-003', date: new Date('2026-05-17'), createdBy: users[1]._id.toString(), statusId: 'received', orderId: orders[1]._id.toString(), isActive: true },
    { number: 'ЗЗ-2026-004', date: new Date('2026-05-20'), createdBy: users[3]._id.toString(), statusId: 'ordered', isActive: true },
  ]);
  console.log(`  ✅ Заявки на закуп: ${purchaseRequests.length}`);

  // ================================================================
  // 17. ЗАКАЗЫ ПОСТАВЩИКАМ
  // ================================================================
  await PurchaseOrderModel.deleteMany({});
  const purchaseOrders = await PurchaseOrderModel.insertMany([
    { number: 'ПЗ-2026-001', supplierId: counterparties[0]._id.toString(), orderDate: new Date('2026-05-11'), deliveryDate: new Date('2026-05-25'), statusId: 'completed', total: 345000, notes: 'Лист стальной 3мм — 50 листов', isActive: true },
    { number: 'ПЗ-2026-002', supplierId: counterparties[3]._id.toString(), orderDate: new Date('2026-05-12'), deliveryDate: new Date('2026-05-28'), statusId: 'completed', total: 85600, notes: 'Крепёж М8/М10 — 2000 шт.', isActive: true },
    { number: 'ПЗ-2026-003', supplierId: counterparties[2]._id.toString(), orderDate: new Date('2026-05-14'), deliveryDate: new Date('2026-06-01'), statusId: 'sent', total: 420000, notes: 'Arduino Mega — 100 шт.', isActive: true },
    { number: 'ПЗ-2026-004', supplierId: counterparties[0]._id.toString(), orderDate: new Date('2026-05-18'), deliveryDate: new Date('2026-06-05'), statusId: 'confirmed_by_supplier', total: 210000, notes: 'Нержавейка 2мм — 20 листов', isActive: true },
  ]);
  console.log(`  ✅ Заказы поставщикам: ${purchaseOrders.length}`);

  // ================================================================
  // 18. ПРОИЗВОДСТВЕННЫЕ НАРЯДЫ
  // ================================================================
  await WorkOrderModel.deleteMany({});
  const workOrders = await WorkOrderModel.insertMany([
    { number: 'Н-2026-001', orderId: orders[3]._id.toString(), productId: products[0]._id.toString(), qty: 50, statusId: 'completed', startDate: new Date('2026-05-15'), endDate: new Date('2026-05-20'), assignedTo: users[3]._id.toString(), notes: 'Резка листа 3мм под заказ ТехноПром', isActive: true },
    { number: 'Н-2026-002', orderId: orders[0]._id.toString(), productId: products[12]._id.toString(), qty: 100, statusId: 'in_progress', startDate: new Date('2026-05-18'), assignedTo: users[3]._id.toString(), notes: 'Сборка контроллеров Arduino', isActive: true },
    { number: 'Н-2026-003', orderId: orders[0]._id.toString(), productId: products[3]._id.toString(), qty: 20, statusId: 'pending', assignedTo: users[3]._id.toString(), isActive: true },
    { number: 'Н-2026-004', orderId: orders[1]._id.toString(), productId: products[20]._id.toString(), qty: 10, statusId: 'pending', notes: 'Сварочные работы по заказу СтройМаш', isActive: true },
  ]);
  console.log(`  ✅ Производственные наряды: ${workOrders.length}`);

  // ================================================================
  // 19. ОПЕРАЦИИ НАРЯДОВ
  // ================================================================
  await WorkOrderOperationModel.deleteMany({});
  const workOrderOps = await WorkOrderOperationModel.insertMany([
    { workOrderId: workOrders[0]._id.toString(), operationId: operations[0]._id.toString(), order: 1, plannedDuration: 0.5, actualDuration: 0.5, statusId: 'completed', completedAt: new Date('2026-05-15'), completedBy: users[3]._id.toString() },
    { workOrderId: workOrders[0]._id.toString(), operationId: operations[1]._id.toString(), order: 2, plannedDuration: 0.2, actualDuration: 0.3, statusId: 'completed', completedAt: new Date('2026-05-16'), completedBy: users[3]._id.toString() },
    { workOrderId: workOrders[0]._id.toString(), operationId: operations[8]._id.toString(), order: 3, plannedDuration: 0.5, actualDuration: 0.4, statusId: 'completed', completedAt: new Date('2026-05-17'), completedBy: users[3]._id.toString() },
    { workOrderId: workOrders[0]._id.toString(), operationId: operations[9]._id.toString(), order: 4, plannedDuration: 0.25, actualDuration: 0.2, statusId: 'completed', completedAt: new Date('2026-05-17'), completedBy: users[3]._id.toString() },
    { workOrderId: workOrders[1]._id.toString(), operationId: operations[5]._id.toString(), order: 1, plannedDuration: 0.5, actualDuration: null, statusId: 'in_progress', startedAt: new Date('2026-05-18') },
    { workOrderId: workOrders[1]._id.toString(), operationId: operations[8]._id.toString(), order: 2, plannedDuration: 1.0, actualDuration: null, statusId: 'pending' },
  ]);
  console.log(`  ✅ Операции нарядов: ${workOrderOps.length}`);

  // ================================================================
  // 20. ДВИЖЕНИЯ СКЛАДА
  // ================================================================
  await StockMovementModel.deleteMany({});
  const movements = await StockMovementModel.insertMany([
    { type: 'receipt', date: new Date('2026-05-11'), productId: products[0]._id.toString(), warehouseId: warehouses[0]._id.toString(), qty: 50, cost: 345000, documentRef: 'ПЗ-2026-001', createdBy: users[4]._id.toString() },
    { type: 'receipt', date: new Date('2026-05-12'), productId: products[5]._id.toString(), warehouseId: warehouses[0]._id.toString(), qty: 2000, cost: 85600, documentRef: 'ПЗ-2026-002', createdBy: users[4]._id.toString() },
    { type: 'transfer_out', date: new Date('2026-05-15'), productId: products[0]._id.toString(), warehouseId: warehouses[0]._id.toString(), qty: 20, cost: 138000, orderId: orders[3]._id.toString(), createdBy: users[4]._id.toString() },
    { type: 'transfer_in', date: new Date('2026-05-15'), productId: products[0]._id.toString(), warehouseId: warehouses[1]._id.toString(), qty: 20, cost: 138000, orderId: orders[3]._id.toString(), createdBy: users[4]._id.toString() },
    { type: 'write_off', date: new Date('2026-05-16'), productId: products[5]._id.toString(), warehouseId: warehouses[1]._id.toString(), qty: 5, cost: 214, createdBy: users[4]._id.toString() },
    { type: 'receipt', date: new Date('2026-05-18'), productId: products[12]._id.toString(), warehouseId: warehouses[0]._id.toString(), qty: 100, cost: 420000, documentRef: 'ПЗ-2026-003', createdBy: users[4]._id.toString() },
    { type: 'transfer_out', date: new Date('2026-05-18'), productId: products[12]._id.toString(), warehouseId: warehouses[0]._id.toString(), qty: 100, cost: 420000, orderId: orders[0]._id.toString(), createdBy: users[4]._id.toString() },
  ]);
  console.log(`  ✅ Движения склада: ${movements.length}`);

  // ================================================================
  // 21. РЕЗЕРВЫ
  // ================================================================
  await ReservationModel.deleteMany({});
  const reservations = await ReservationModel.insertMany([
    { orderId: orders[0]._id.toString(), isActive: true },
    { orderId: orders[1]._id.toString(), isActive: true },
    { orderId: orders[2]._id.toString(), isActive: false },
  ]);
  console.log(`  ✅ Резервы: ${reservations.length}`);

  // ================================================================
  // 22. КАЛЬКУЛЯЦИИ
  // ================================================================
  await CostCalculationModel.deleteMany({});
  const costCalculations = await CostCalculationModel.insertMany([
    { productId: products[0]._id.toString(), bomVersion: 1, isActive: true },
    { productId: products[4]._id.toString(), bomVersion: 1, isActive: true },
    { productId: products[12]._id.toString(), bomVersion: 1, isActive: true },
  ]);
  console.log(`  ✅ Калькуляции: ${costCalculations.length}`);

  // ================================================================
  // 23. ФАКТИЧЕСКИЕ ЗАТРАТЫ
  // ================================================================
  await ActualCostModel.deleteMany({});
  const actualCosts = await ActualCostModel.insertMany([
    { orderId: orders[3]._id.toString(), type: 'material', amount: 138000, description: 'Лист стальной 3мм', date: new Date('2026-05-15'), createdBy: users[3]._id.toString() },
    { orderId: orders[3]._id.toString(), type: 'labor', amount: 45000, description: 'Резка + сварка + сборка', date: new Date('2026-05-20'), createdBy: users[3]._id.toString() },
    { orderId: orders[3]._id.toString(), type: 'overhead', amount: 15000, description: 'Электроэнергия, амортизация', date: new Date('2026-05-20'), createdBy: users[3]._id.toString() },
    { orderId: orders[0]._id.toString(), type: 'material', amount: 420000, description: 'Arduino Mega 100 шт.', date: new Date('2026-05-18'), createdBy: users[3]._id.toString() },
    { orderId: orders[1]._id.toString(), type: 'material', amount: 85600, description: 'Крепёж', date: new Date('2026-05-14'), createdBy: users[3]._id.toString() },
  ]);
  console.log(`  ✅ Фактические затраты: ${actualCosts.length}`);

  // ================================================================
  // 24. ОТГРУЗКИ
  // ================================================================
  await ShipmentModel.deleteMany({});
  const shipments = await ShipmentModel.insertMany([
    { number: 'ОТ-2026-001', orderId: orders[3]._id.toString(), date: new Date('2026-05-21'), recipient: 'АО «ТехноПром»', address: 'г. Москва, ул. Индустриальная, д. 15', statusId: 'delivered', driverInfo: 'Иванов И.И., гос.номер А123ВВ777', isActive: true },
    { number: 'ОТ-2026-002', orderId: orders[0]._id.toString(), date: new Date('2026-05-22'), recipient: 'АО «ТехноПром»', address: 'г. Москва, ул. Индустриальная, д. 15', statusId: 'preparing', isActive: true },
  ]);
  console.log(`  ✅ Отгрузки: ${shipments.length}`);

  // ================================================================
  // 25. ОТГРУЗОЧНЫЕ ДОКУМЕНТЫ
  // ================================================================
  await ShippingDocModel.deleteMany({});
  const shippingDocs = await ShippingDocModel.insertMany([
    { number: 'ДО-2026-001', date: new Date('2026-05-21'), type: 'torg12', shipmentId: shipments[0]._id.toString(), totalAmount: 450000 },
    { number: 'ДО-2026-002', date: new Date('2026-05-21'), type: 'invoice', shipmentId: shipments[0]._id.toString(), totalAmount: 450000 },
  ]);
  console.log(`  ✅ Отгрузочные документы: ${shippingDocs.length}`);

  // ================================================================
  // 26. ВЗАИМОДЕЙСТВИЯ (лог)
  // ================================================================
  await InteractionModel.deleteMany({});
  const interactions = await InteractionModel.insertMany([
    { counterpartyId: counterparties[4]._id.toString(), type: 'email', description: 'Отправлено КП №001 по металлоконструкциям', createdBy: users[1]._id.toString() },
    { counterpartyId: counterparties[4]._id.toString(), type: 'call', description: 'Уточнение по срокам поставки — договорились на июль', createdBy: users[1]._id.toString() },
    { counterpartyId: counterparties[5]._id.toString(), type: 'meeting', description: 'Встреча по ремонту оборудования — составлена смета', createdBy: users[1]._id.toString() },
    { counterpartyId: counterparties[7]._id.toString(), type: 'email', description: 'Направлен договор на разработку стенда испытаний', createdBy: users[1]._id.toString() },
    { counterpartyId: counterparties[0]._id.toString(), type: 'call', description: 'Согласование графика поставки металла', createdBy: users[4]._id.toString() },
    { counterpartyId: counterparties[2]._id.toString(), type: 'email', description: 'Запрос КП на партию Arduino Mega 200 шт.', createdBy: users[1]._id.toString() },
    { counterpartyId: counterparties[4]._id.toString(), type: 'note', description: 'Клиент просит предоставить сертификаты качества', createdBy: users[3]._id.toString() },
  ]);
  console.log(`  ✅ Взаимодействия: ${interactions.length}`);

  // ================================================================
  // 27. ТЕНДЕРЫ (входящие запросы) — из mail_data.html
  // ================================================================
  await TenderModel.deleteMany({});
  let tendersCount = 0;
  let firstTenderId = '';
  const companyIds = [
    counterparties.find(c => c.name.includes('СпортИН'))?._id.toString() || '',
    counterparties.find(c => c.name.includes('СпортСтрой'))?._id.toString() || '',
    counterparties.find(c => c.name.includes('Приват'))?._id.toString() || '',
  ];
  if (companyIds.filter(Boolean).length === 3) {
    const tenderProducts = ['Велопарковка', 'Скамья парковая', 'Урна', 'Стойка баскетбольная', 'Тренажёр уличный', 'Турник', 'Ограждение', 'Информационный стенд', 'Флагшток'];
    const tenders = [];
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 3; j++) {
        const num = 94 + i + j * 9;
        tenders.push({
          number: `Т-2026-${String(tenders.length + 1).padStart(3, '0')}`,
          tenderId: `5202_${num}`,
          date: new Date('2026-05-22'),
          companyId: companyIds[j],
          email: ['sportin-yug@mail.ru', 'sportstroy_yug@mail.ru', 'info-privatdeal@mail.ru'][j],
          subject: `Поставка ${tenderProducts[i].toLowerCase()} для нужд МО «Город Майкоп»`,
          productName: tenderProducts[i],
          quantity: Math.floor(Math.random() * 5) + 1,
          unit: 'шт',
          attachments: 'Таблица 1',
          deliveryTerms: 'Стоимость включает изготовление, упаковку, доставку, установку',
          responseRequirements: 'КП с указанием НМЦК, спецификация, сертификаты',
          legalBasis: 'Федеральный закон № 44-ФЗ «О контрактной системе»',
          statusId: ['new', 'in_progress', 'kp_sent', 'won', 'lost'][(i + j) % 5],
          isActive: true,
        });
      }
    }
    // Сортируем в порядке возрастания номера
    tenders.sort((a, b) => a.number.localeCompare(b.number));
    const insertedTenders = await TenderModel.insertMany(tenders);
    tendersCount = insertedTenders.length;
    firstTenderId = insertedTenders[0]._id.toString();
    console.log(`  ✅ Тендеры (входящие запросы): ${tenders.length}`);
  } else {
    console.log(`  ⚠️ Тендеры: пропущены (нужны компании с role='company')`);
  }

  // ================================================================
  // 28. ПАСПОРТА ИЗДЕЛИЙ — из pasports.html
  // ================================================================
  await ProductPassportModel.deleteMany({});
  const passportProducts = [
    { name: 'Стойка баскетбольная', category: 'Спортивное оборудование', height: 3050, length: 1200, width: 800, weight: 95 },
    { name: 'Тренажёр «Жим от груди»', category: 'Уличный тренажёр', height: 1800, length: 1200, width: 900, weight: 65 },
    { name: 'Турник-брусья', category: 'Воркаут', height: 2400, length: 1500, width: 200, weight: 45 },
    { name: 'Скамья парковая', category: 'Благоустройство', height: 800, length: 1800, width: 500, weight: 35 },
    { name: 'Велопарковка', category: 'Благоустройство', height: 900, length: 800, width: 400, weight: 25 },
    { name: 'Урна', category: 'Благоустройство', height: 600, length: 400, width: 400, weight: 12 },
    { name: 'Информационный стенд', category: 'Стенд', height: 2000, length: 1200, width: 100, weight: 30 },
    { name: 'Флагшток', category: 'Стела', height: 8000, length: 0, width: 0, weight: 55 },
  ];
  const passports = await ProductPassportModel.insertMany(
    passportProducts.map((p, i) => ({
      productId: products[i]?._id?.toString() || '',
      passportNumber: 224 + i,
      date: new Date(2025, 7 + Math.floor(i / 10), 15 + (i % 15)),
      warrantyCode: `2025${8 + Math.floor(i / 10)}-${224 + i}`,
      productCode: 2254 + i,
      photo: '',
      category: p.category,
      name: p.name,
      height: p.height,
      length: p.length,
      width: p.width,
      weight: p.weight,
      description: `${p.name} изготовлена из стали с порошковым покрытием. Устанавливается в местах общественного пользования.`,
      installationSite: i % 2 === 0 ? 'Ейское, п. Ближнеейск, ул. Садовая, 21' : '',
      supplier: i === 0 ? 'ИП Желонкин' : undefined,
      isActive: true,
    }))
  );
  console.log(`  ✅ Паспорта изделий: ${passports.length}`);

  // ================================================================
  // ИТОГО
  // ================================================================
  console.log('\n' + '='.repeat(50));
  console.log('🌱 Seed completed!');
  console.log('='.repeat(50));
  console.log('');
  console.log('Категории           :', categories.length);
  console.log('Товары              :', products.length);
  console.log('Контрагенты         :', counterparties.length);
  console.log('Роли                :', roles.length);
  console.log('Пользователи        :', users.length);
  console.log('Статусы             :', statuses.length);
  console.log('Типы работ          :', workTypes.length);
  console.log('Настройки           :', settings.length);
  console.log('Счётчики            :', counters.length);
  console.log('Склады              :', warehouses.length);
  console.log('Операции            :', operations.length);
  console.log('КП                  :', quotations.length);
  console.log('Заказы              :', orders.length);
  console.log('BOM                 :', boms.length);
  console.log('Техпроцессы         :', techProcesses.length);
  console.log('Заявки на закуп     :', purchaseRequests.length);
  console.log('Заказы поставщикам  :', purchaseOrders.length);
  console.log('Производ. наряды    :', workOrders.length);
  console.log('Операции нарядов    :', workOrderOps.length);
  console.log('Движения склада     :', movements.length);
  console.log('Резервы             :', reservations.length);
  console.log('Калькуляции         :', costCalculations.length);
  console.log('Факт. затраты       :', actualCosts.length);
  console.log('Отгрузки            :', shipments.length);
  console.log('Отгруз. документы   :', shippingDocs.length);
  console.log('Взаимодействия      :', interactions.length);
  console.log('Тендеры             :', tendersCount);
  console.log('Паспорта изделий    :', passports.length);
  console.log('');
  // ================================================================
  // 29. ОПРЕДЕЛЕНИЯ АТРИБУТОВ (EAV)
  // ================================================================
  await AttributeDefinitionModel.deleteMany({});
  const attrDefs = await AttributeDefinitionModel.insertMany([
    // Product attributes
    { entityType: 'product', name: 'material', label: 'Материал', type: 'string', sortOrder: 10, isActive: true },
    { entityType: 'product', name: 'color', label: 'Цвет', type: 'string', sortOrder: 20, isActive: true },
    { entityType: 'product', name: 'coating', label: 'Покрытие', type: 'select', options: ['Порошковая', 'Жидкая', 'Оцинковка', 'Без покрытия'], sortOrder: 30, isActive: true },
    { entityType: 'product', name: 'maxTemp', label: 'Макс. температура', type: 'number', unit: '°C', sortOrder: 40, isActive: true },
    { entityType: 'product', name: 'ipRating', label: 'Степень защиты IP', type: 'string', sortOrder: 50, isActive: true },
    { entityType: 'product', name: 'certification', label: 'Сертификация', type: 'multiselect', options: ['ГОСТ', 'ISO', 'CE', 'EAC'], sortOrder: 60, isActive: true },
    { entityType: 'product', name: 'warranty', label: 'Гарантия', type: 'number', unit: 'мес', sortOrder: 70, isActive: true },
    { entityType: 'product', name: 'country', label: 'Страна производства', type: 'string', sortOrder: 80, isActive: true },
    // Tender attributes
    { entityType: 'tender', name: 'deliveryDeadline', label: 'Срок поставки', type: 'date', sortOrder: 10, isActive: true },
    { entityType: 'tender', name: 'nmck', label: 'НМЦК', type: 'number', unit: '₽', sortOrder: 20, isActive: true },
    { entityType: 'tender', name: 'prepayment', label: 'Аванс, %', type: 'number', unit: '%', sortOrder: 30, isActive: true },
    { entityType: 'tender', name: 'deliveryTerms', label: 'Условия поставки', type: 'select', options: ['Самовывоз', 'Доставка', 'DDP', 'CPT'], sortOrder: 40, isActive: true },
    // Order attributes
    { entityType: 'order', name: 'priority', label: 'Приоритет', type: 'select', options: ['Низкий', 'Средний', 'Высокий', 'Критичный'], sortOrder: 10, isActive: true },
    { entityType: 'order', name: 'paymentTerms', label: 'Условия оплаты', type: 'string', sortOrder: 20, isActive: true },
  ]);
  console.log(`  ✅ Определения атрибутов (EAV): ${attrDefs.length}`);

  // ================================================================
  // 30. ЗНАЧЕНИЯ АТРИБУТОВ (EAV) — тестовые для первого продукта
  // ================================================================
  await EntityAttributeValueModel.deleteMany({});
  const productAttrDefs = attrDefs.filter((a) => a.entityType === 'product');
  if (products.length > 0 && productAttrDefs.length > 0) {
    const eavValues = await EntityAttributeValueModel.insertMany([
      { entityType: 'product', entityId: products[0]._id.toString(), attributeId: productAttrDefs[0]._id.toString(), value: 'Сталь 3мм' },
      { entityType: 'product', entityId: products[0]._id.toString(), attributeId: productAttrDefs[2]._id.toString(), value: 'Без покрытия' },
      { entityType: 'product', entityId: products[0]._id.toString(), attributeId: productAttrDefs[3]._id.toString(), value: 400 },
      { entityType: 'product', entityId: products[0]._id.toString(), attributeId: productAttrDefs[5]._id.toString(), value: ['ГОСТ'] },
      { entityType: 'product', entityId: products[0]._id.toString(), attributeId: productAttrDefs[6]._id.toString(), value: 12 },
      { entityType: 'product', entityId: products[0]._id.toString(), attributeId: productAttrDefs[7]._id.toString(), value: 'Россия' },
      // Tender attributes for first tender
      { entityType: 'tender', entityId: firstTenderId || '', attributeId: attrDefs.find((a) => a.entityType === 'tender' && a.name === 'deliveryDeadline')?._id.toString() || '', value: '2026-07-01' },
      { entityType: 'tender', entityId: firstTenderId || '', attributeId: attrDefs.find((a) => a.entityType === 'tender' && a.name === 'nmck')?._id.toString() || '', value: 450000 },
    ].filter((v) => v.entityId));
    console.log(`  ✅ Значения атрибутов (EAV): ${eavValues.length}`);
  } else {
    console.log(`  ⚠️ Значения атрибутов: пропущены (нет продуктов)`);
  }

  console.log('📌 Все данные можно редактировать через интерфейс справочников.');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
