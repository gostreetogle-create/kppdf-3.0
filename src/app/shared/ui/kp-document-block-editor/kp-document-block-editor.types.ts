import type { IDocumentBlock } from '../../../../../shared/types/documentTemplate.interface';

/** Режим работы канваса */
export type DocCanvasMode = 'template' | 'instance';

/** Внутреннее представление блока с clientKey для отслеживания */
export interface DocCanvasBlock extends IDocumentBlock {
  clientKey?: string;
}

/** Стандартные значения настроек блока */
export const DEFAULT_BLOCK_SETTINGS: DocCanvasBlock['settings'] = {
  fontSize: 11,
  fontWeight: 'normal',
  align: 'center',
  paddingTop: 8,
  paddingBottom: 8,
};

/** Стандартные блоки для нового шаблона */
export const DOC_CANVAS_DEFAULT_BLOCKS: DocCanvasBlock[] = [
  {
    type: 'header',
    order: 0,
    content: '<h2>Заголовок документа</h2>',
    settings: { fontSize: 18, fontWeight: 'bold', align: 'center', paddingTop: 8, paddingBottom: 12 },
  },
  {
    type: 'text',
    order: 1,
    title: 'Информация',
    content: '',
    cells: [
      { content: 'Поставщик: {{org.name}}\nИНН: {{org.inn}}\nАдрес: {{org.address}}', align: 'center' },
      { content: 'Клиент: {{client.name}}', align: 'center' },
    ],
    settings: { fontSize: 11, fontWeight: 'normal', align: 'center', paddingTop: 8, paddingBottom: 8, columns: 2, borderStyle: 'none' },
  },
  {
    type: 'table',
    order: 2,
    title: 'Товары',
    tableKind: 'products',
    content: '',
    settings: { fontSize: 10, fontWeight: 'normal', align: 'left', paddingTop: 8, paddingBottom: 8 },
  },
  {
    type: 'text',
    order: 3,
    title: 'Условия',
    content: 'Условия оплаты: предоплата 100%\nСрок поставки: {{doc.days}} рабочих дней\nГарантия: {{doc.warranty}}',
    settings: { fontSize: 10, fontWeight: 'normal', align: 'center', paddingTop: 8, paddingBottom: 8, borderStyle: 'none' },
  },
  {
    type: 'separator',
    order: 4,
    content: '',
    settings: { fontSize: 11, fontWeight: 'normal', align: 'left', paddingTop: 0, paddingBottom: 4 },
  },
  {
    type: 'text',
    order: 5,
    content: 'Руководитель: ___________________  (подпись)',
    settings: { fontSize: 11, fontWeight: 'normal', align: 'right', paddingTop: 8, paddingBottom: 8, borderStyle: 'none' },
  },
];

/** Цвета текста для панели управления блоком */
export const BLOCK_TEXT_COLORS = [
  { value: '', label: 'Авто — цвет документа' },
  { value: '#111827', label: 'Чёрный' },
  { value: '#2563eb', label: 'Синий' },
  { value: '#dc2626', label: 'Красный' },
  { value: '#059669', label: 'Зелёный' },
] as const;

/** Цвета фона для панели управления блоком */
export const BLOCK_BG_COLORS = [
  { value: '', label: 'Без фона' },
  { value: '#ffffff', label: 'Белый' },
  { value: '#fafafa', label: 'Серый' },
  { value: '#f8fbff', label: 'Голубой' },
  { value: '#fffef5', label: 'Жёлтый' },
  { value: '#f8fefb', label: 'Зелёный' },
] as const;

/** Опции размера шрифта */
export const FONT_SIZE_OPTIONS = [
  { label: '9px', value: 9 },
  { label: '10px', value: 10 },
  { label: '11px', value: 11 },
  { label: '12px', value: 12 },
  { label: '14px', value: 14 },
  { label: '16px', value: 16 },
  { label: '18px', value: 18 },
  { label: '20px', value: 20 },
  { label: '24px', value: 24 },
];

/** Максимальное число колонок в текстовом блоке */
export const MAX_TEXT_CELLS = 6;

/** Опции типов таблиц по умолчанию */
export const FALLBACK_TABLE_BLOCK_OPTIONS: { label: string; value: string }[] = [
  { label: 'Товары', value: 'products' },
  { label: 'Услуги', value: 'services' },
  { label: 'Работы', value: 'work' },
];
