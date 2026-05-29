import mongoose from 'mongoose';
import { connectDb } from './config/db';
import { ProductModel } from './modules/products/product.model';
import { CategoryModel } from './modules/categories/category.model';
import { CounterpartyModel } from './modules/counterparties/counterparty.model';
import { UserModel } from './modules/users/user.model';
import { RoleModel } from './modules/roles/role.model';
import { AttributeDefinitionModel } from './modules/attribute-definitions/attributeDefinition.model';
import { EntityAttributeValueModel } from './modules/entity-attribute-values/entityAttributeValue.model';
import { DocumentTableTypeModel } from './modules/document-table-types/documentTableType.model';
import { DocumentTemplateModel } from './modules/document-templates/documentTemplate.model';

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
  const productSeedRows = [
    { name: 'Лист стальной 3мм 1250x2500', sku: 'LST-001', kind: 'ITEM', unit: 'м²', categoryId: categories[0]._id.toString(), status: 'active', description: 'Сталь 3мм, размер 1250x2500мм', isActive: true, listPrice: 4200, stockQty: 85 },
    { name: 'Лист стальной 5мм 1250x2500', sku: 'LST-002', kind: 'ITEM', unit: 'м²', categoryId: categories[0]._id.toString(), status: 'active', isActive: true, listPrice: 5800, stockQty: 42 },
    { name: 'Лист нерж. 2мм 1000x2000', sku: 'LST-003', kind: 'ITEM', unit: 'м²', categoryId: categories[8]._id.toString(), status: 'active', isActive: true, listPrice: 12500, stockQty: 18 },
    { name: 'Труба профильная 40x20x2', sku: 'TRB-001', kind: 'ITEM', unit: 'м.п.', categoryId: categories[9]._id.toString(), status: 'active', isActive: true, listPrice: 890, stockQty: 120 },
    { name: 'Труба профильная 60x30x2', sku: 'TRB-002', kind: 'ITEM', unit: 'м.п.', categoryId: categories[9]._id.toString(), status: 'active', isActive: true, listPrice: 1150, stockQty: 95 },
    { name: 'Уголок 50x50x5', sku: 'UGL-001', kind: 'ITEM', unit: 'м.п.', categoryId: categories[0]._id.toString(), status: 'active', isActive: true, listPrice: 720, stockQty: 200 },
    { name: 'Болт М8x30 оцинк.', sku: 'BRT-001', kind: 'ITEM', unit: 'шт', categoryId: categories[1]._id.toString(), status: 'active', isActive: true, listPrice: 12, stockQty: 5000 },
    { name: 'Болт М10x40 оцинк.', sku: 'BRT-002', kind: 'ITEM', unit: 'шт', categoryId: categories[1]._id.toString(), status: 'active', isActive: true, listPrice: 18, stockQty: 3200 },
    { name: 'Гайка М8 оцинк.', sku: 'BRT-003', kind: 'ITEM', unit: 'шт', categoryId: categories[1]._id.toString(), status: 'active', isActive: true, listPrice: 8, stockQty: 4800 },
    { name: 'Гайка М10 оцинк.', sku: 'BRT-004', kind: 'ITEM', unit: 'шт', categoryId: categories[1]._id.toString(), status: 'active', isActive: true, listPrice: 11, stockQty: 2900 },
    { name: 'Шайба М8 оцинк.', sku: 'BRT-005', kind: 'ITEM', unit: 'шт', categoryId: categories[1]._id.toString(), status: 'active', isActive: true, listPrice: 5, stockQty: 6000 },
    { name: 'Шайба М10 оцинк.', sku: 'BRT-006', kind: 'ITEM', unit: 'шт', categoryId: categories[1]._id.toString(), status: 'active', isActive: true, listPrice: 6, stockQty: 4100 },
    { name: 'Контроллер Arduino Mega', sku: 'ELC-001', kind: 'ITEM', unit: 'шт', categoryId: categories[2]._id.toString(), status: 'active', description: 'ATmega2560', isActive: true, listPrice: 4500, stockQty: 24 },
    { name: 'Датчик температуры DS18B20', sku: 'ELC-002', kind: 'ITEM', unit: 'шт', categoryId: categories[2]._id.toString(), status: 'active', isActive: true, listPrice: 350, stockQty: 150 },
    { name: 'Датчик влажности DHT22', sku: 'ELC-003', kind: 'ITEM', unit: 'шт', categoryId: categories[2]._id.toString(), status: 'draft', isActive: true, listPrice: 420, stockQty: 0 },
    { name: 'Кабель USB Type-C 2м', sku: 'ELC-004', kind: 'ITEM', unit: 'шт', categoryId: categories[2]._id.toString(), status: 'active', isActive: true, listPrice: 280, stockQty: 88 },
    { name: 'Плата расширения 8-канальная', sku: 'ELC-005', kind: 'ITEM', unit: 'шт', categoryId: categories[2]._id.toString(), status: 'active', isActive: true, listPrice: 1200, stockQty: 35 },
    { name: 'Электроды МР-3 3мм', sku: 'RSX-001', kind: 'ITEM', unit: 'кг', categoryId: categories[3]._id.toString(), status: 'active', isActive: true, listPrice: 650, stockQty: 45 },
    { name: 'Краска аэрозольная чёрная 520мл', sku: 'RSX-002', kind: 'ITEM', unit: 'шт', categoryId: categories[3]._id.toString(), status: 'active', isActive: true, listPrice: 390, stockQty: 72 },
    { name: 'Шлифкруг 125мм P80', sku: 'RSX-003', kind: 'ITEM', unit: 'шт', categoryId: categories[3]._id.toString(), status: 'active', isActive: true, listPrice: 145, stockQty: 110 },
    { name: 'Сварка аргонодуговая (работа)', sku: 'SRV-001', kind: 'WORK', unit: 'ч', categoryId: categories[5]._id.toString(), status: 'active', isActive: true, listPrice: 2500, stockQty: 0 },
    { name: 'Фрезерная обработка ЧПУ (работа)', sku: 'SRV-002', kind: 'WORK', unit: 'ч', categoryId: categories[5]._id.toString(), status: 'active', isActive: true, listPrice: 3200, stockQty: 0 },
    { name: '3D-печать прототипа PLA', sku: 'SRV-003', kind: 'SERVICE', unit: 'шт', categoryId: categories[5]._id.toString(), status: 'active', isActive: true, listPrice: 8500, stockQty: 0 },
  ];
  const products = await ProductModel.insertMany(productSeedRows);
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
        'admin.attributes.view',
        'admin.attributes.edit',
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
        'admin.attributes.view',
        'admin.attributes.edit',
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
  // Demo passwords plain in seed data only; persist via UserModel.create (save middleware hashes).
  // insertMany does not run pre('save') — do not use it for users.
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
  const users = [];
  for (const row of userData) {
    users.push(await UserModel.create(row));
  }
  console.log(`  ✅ Пользователи: ${users.length}`);

  // ================================================================
  // EAV: Определения атрибутов
  // ================================================================
  await AttributeDefinitionModel.deleteMany({});
  const attrDefRows = [
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
  ];
  const attrDefs = await AttributeDefinitionModel.insertMany(attrDefRows);
  console.log(`  ✅ Определения атрибутов (EAV): ${attrDefs.length}`);

  // ================================================================
  // Document Table Types (для quotation)
  // ================================================================
  await DocumentTableTypeModel.deleteMany({});
  const tableTypes = await DocumentTableTypeModel.insertMany([
    { name: 'products', label: 'Товары', title: 'Товары', tableKind: 'products', dataSource: 'products', productKind: 'ITEM', docType: 'quotation', columns: [], sortOrder: 1, isActive: true },
    { name: 'services', label: 'Услуги', title: 'Услуги', tableKind: 'services', dataSource: 'services', productKind: 'SERVICE', docType: 'quotation', columns: [], sortOrder: 2, isActive: true },
    { name: 'work', label: 'Работы', title: 'Работы', tableKind: 'work', dataSource: 'work', productKind: 'WORK', docType: 'quotation', columns: [], sortOrder: 3, isActive: true },
  ]);
  console.log(`  ✅ Типы таблиц документов: ${tableTypes.length}`);

  // ================================================================
  // Document Templates (2 шаблона: КП + Договор)
  // ================================================================
  await DocumentTemplateModel.deleteMany({});
  const companyId = counterparties[8]?._id?.toString() || '';
  const templates = await DocumentTemplateModel.insertMany([
    {
      name: 'Стандартное КП',
      description: 'Базовый шаблон коммерческого предложения с токенами',
      docType: 'quotation',
      organizationId: companyId,
      isDefault: true,
      isActive: true,
      tags: ['базовый', 'кп'],
      blocks: [
        { type: 'header', order: 0, title: 'Заголовок КП', content: 'Коммерческое предложение №{{doc.number}} от {{doc.date}}', settings: { fontSize: 16, fontWeight: 'bold', align: 'center', paddingTop: 8, paddingBottom: 12 } },
        { type: 'text', order: 1, title: 'Реквизиты', content: '{{org.name}}, ИНН {{org.inn}}, {{org.address}}\nКлиент: {{client.name}}, ИНН {{client.inn}}', settings: { fontSize: 11, fontWeight: 'normal', align: 'left', paddingTop: 8, paddingBottom: 8 } },
        { type: 'table', order: 2, title: 'Таблица товаров', tableKind: 'products', items: [], settings: { fontSize: 10, fontWeight: 'normal', align: 'left', paddingTop: 4, paddingBottom: 4 } },
        { type: 'text', order: 3, title: 'Условия', content: 'Предложение действительно до {{doc.validUntil}}.\nУсловия оплаты: {{doc.paymentTerms}}', settings: { fontSize: 11, fontWeight: 'normal', align: 'left', paddingTop: 8, paddingBottom: 8 } },
      ],
    },
    {
      name: 'Типовой договор',
      description: 'Шаблон договора с реквизитами сторон',
      docType: 'contract',
      organizationId: companyId,
      isDefault: true,
      isActive: true,
      tags: ['договор', 'типовой'],
      blocks: [
        { type: 'header', order: 0, title: 'Заголовок', content: 'Договор №{{doc.number}}', settings: { fontSize: 16, fontWeight: 'bold', align: 'center', paddingTop: 8, paddingBottom: 12 } },
        { type: 'text', order: 1, title: 'Стороны', content: '{{org.name}}, в лице {{org.director}}, действующего на основании Устава, именуемое в дальнейшем «Исполнитель», с одной стороны, и {{client.name}}, в лице {{client.director}}, действующего на основании {{client.authority}}, именуемое в дальнейшем «Заказчик», с другой стороны, заключили настоящий договор о нижеследующем:', settings: { fontSize: 11, fontWeight: 'normal', align: 'left', paddingTop: 8, paddingBottom: 8 } },
      ],
    },
  ]);
  console.log(`  ✅ Шаблоны документов: ${templates.length}`);

  // ================================================================
  // 30. ЗНАЧЕНИЯ АТРИБУТОВ (EAV) — тестовые для первого продукта
  // ================================================================
  await EntityAttributeValueModel.deleteMany({});
  const productAttrDefs = attrDefs.filter((a) => a.entityType === 'product');
  if (products.length > 0 && productAttrDefs.length > 0) {
    const eavValues = await EntityAttributeValueModel.insertMany([
      { entityType: 'product', entityId: products[0]._id.toString(), attributeId: productAttrDefs[0]._id.toString(), value: 'Сталь 3мм' },
      { entityType: 'product', entityId: products[0]._id.toString(), attributeId: productAttrDefs[1]._id.toString(), value: 'Без покрытия' },
      { entityType: 'product', entityId: products[0]._id.toString(), attributeId: productAttrDefs[2]._id.toString(), value: 400 },
      { entityType: 'product', entityId: products[0]._id.toString(), attributeId: productAttrDefs[4]._id.toString(), value: ['ГОСТ'] },
      { entityType: 'product', entityId: products[0]._id.toString(), attributeId: productAttrDefs[5]._id.toString(), value: 12 },
      { entityType: 'product', entityId: products[0]._id.toString(), attributeId: productAttrDefs[6]._id.toString(), value: 'Россия' },
    ]);
    console.log(`  ✅ Значения атрибутов (EAV): ${eavValues.length}`);
  } else {
    console.log(`  ⚠️ Значения атрибутов: пропущены (нет продуктов)`);
  }

  console.log("📌 Все данные можно редактировать через интерфейс справочников.");

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
