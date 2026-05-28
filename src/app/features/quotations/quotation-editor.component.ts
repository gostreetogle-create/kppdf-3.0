import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgFor, NgIf, DecimalPipe, NgStyle } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { of, tap, catchError, finalize } from 'rxjs';

import type { IQuotation, IProduct, ITender } from '../../../../shared/types';

// PrimeNG button — только для block-controls (toggle-панель); остальное через app-kp-button
/* eslint-disable no-restricted-imports */
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
/* eslint-enable no-restricted-imports */
import { MessageService } from 'primeng/api';

// Services
import { CrudApiService } from '../../shared/services/crud-api.service';
import { DocumentTableTypeOptionsService } from '../../shared/services/document-table-type-options.service';
import {
  KpSortableListDirective,
  KpSortableItemDirective,
  KpSortableHandleDirective,
  KpSplitTextCardComponent,
  KpProductPickerComponent,
  KpButtonComponent,
  KpDialogComponent,
  KpInputComponent,
  KpInputNumberComponent,
  KpTextareaComponent,
  KpSelectComponent,
  moveSortableItems,
} from '../../shared/ui';
import type { KpSortableDropEvent, KpSelectOption, ProductPickerFilters } from '../../shared/ui';

// ===== Types =====
function formatQuotationLabel(number: string | undefined): string {
  const raw = number?.trim() ?? '';
  if (!raw) return 'КП';
  const body = raw.replace(/^КП[\s.\-_№]*/i, '').trim();
  return body ? `КП №${body}` : raw;
}

const DEFAULT_TABLE_KIND = 'products';

const FALLBACK_TABLE_BLOCK_OPTIONS: KpSelectOption[] = [
  { label: 'Товары', value: 'products' },
  { label: 'Услуги', value: 'services' },
];

/** Fallback-маппинг типа → productKind для фильтра в пикере (пока productKind не в модели) */
const PRODUCT_KIND_BY_NAME: Record<string, string> = {
  products: 'ITEM',
  services: 'SERVICE',
};

/** Метаданные для подбора из справочника (загружаются динамически по dataSource типа таблицы) */
interface PickerKindMeta {
  label: string;
  dataSource: string;
}

interface BlockItemRow {
  item: QuotationItem;
  index: number;
}

interface QuotationItem {
  _id?: string;
  productId?: string;
  tableKind?: string;
  sku: string;
  photo?: string;
  name: string;
  qty: number;
  unit: string;
  price: number;
  sum: number;
  order: number;
}

interface EditorBlockCell {
  content: string;
  align?: 'left' | 'center' | 'right';
}

interface EditorBlock {
  _id?: string;
  clientKey?: string;
  type: 'text' | 'table' | 'header' | 'separator';
  order: number;
  title?: string;
  content: string;
  tableKind?: string;
  cells?: EditorBlockCell[];
  settings: {
    fontSize: number;
    fontWeight: 'normal' | 'bold' | 'semibold';
    align: 'left' | 'center' | 'right';
    color?: string;
    backgroundColor?: string;
    borderStyle?: 'none' | 'dashed' | 'solid';
    paddingTop: number;
    paddingBottom: number;
    columns?: number;
  };
}

const BLOCK_TEXT_COLORS = [
  { value: '', label: 'Авто — цвет документа' },
  { value: '#111827', label: 'Чёрный' },
  { value: '#2563eb', label: 'Синий' },
  { value: '#dc2626', label: 'Красный' },
  { value: '#059669', label: 'Зелёный' },
] as const;

const BLOCK_BG_COLORS = [
  { value: '', label: 'Без фона' },
  { value: '#ffffff', label: 'Белый' },
  { value: '#fafafa', label: 'Серый' },
  { value: '#f8fbff', label: 'Голубой' },
  { value: '#fffef5', label: 'Жёлтый' },
  { value: '#f8fefb', label: 'Зелёный' },
] as const;

interface DocumentTemplate {
  _id?: string;
  name: string;
  organizationId?: string;
  docType: string;
  isDefault: boolean;
  backgroundImage?: string;
  blocks: EditorBlock[];
}

interface RowActionState {
  index: number;
}

const DEFAULT_BLOCKS: EditorBlock[] = [
  {
    type: 'header',
    order: 0,
    content: '<h2>Коммерческое предложение</h2>',
    settings: { fontSize: 18, fontWeight: 'bold', align: 'center', paddingTop: 20, paddingBottom: 12 },
  },
  {
    type: 'text',
    order: 1,
    title: 'Информация',
    content: '',
    cells: [
      { content: 'Поставщик: [Название организации]\nИНН: [ИНН]\nАдрес: [Адрес]', align: 'center' },
      { content: 'Клиент: [Название клиента]', align: 'center' },
    ],
    settings: { fontSize: 11, fontWeight: 'normal', align: 'center', paddingTop: 8, paddingBottom: 8, columns: 2 },
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
    content: 'Условия оплаты: предоплата 100%\nСрок поставки: [количество] рабочих дней\nГарантия: [срок]',
    settings: { fontSize: 10, fontWeight: 'normal', align: 'center', paddingTop: 8, paddingBottom: 8 },
  },
  {
    type: 'separator',
    order: 4,
    content: '',
    settings: { fontSize: 11, fontWeight: 'normal', align: 'left', paddingTop: 4, paddingBottom: 4 },
  },
  {
    type: 'text',
    order: 5,
    content: 'Руководитель: ___________________  (подпись)',
    settings: { fontSize: 11, fontWeight: 'normal', align: 'right', paddingTop: 8, paddingBottom: 8 },
  },
];

@Component({
  selector: 'app-quotation-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgFor, NgIf, DecimalPipe, NgStyle, FormsModule,
    ButtonModule, SelectModule, ToastModule, TagModule,
    KpSortableListDirective, KpSortableItemDirective, KpSortableHandleDirective,
    KpSplitTextCardComponent,
    KpProductPickerComponent,
    KpButtonComponent,
    KpDialogComponent,
    KpInputComponent,
    KpInputNumberComponent,
    KpTextareaComponent,
    KpSelectComponent,
  ],
  providers: [MessageService],
  template: `
    <div class="editor">
      <!-- ═══ Top Toolbar ═══ -->
      <header class="editor__toolbar">
        <div class="editor__toolbar-left">
          <app-kp-button
            icon="pi pi-arrow-left"
            severity="secondary"
            [text]="true"
            size="small"
            (buttonClick)="goBack()"
          />
          <span class="editor__toolbar-title">
            {{ quotationToolbarTitle() }}
          </span>
          <span class="editor__toolbar-status">
            <p-tag
              *ngIf="quotation().statusId"
              [value]="quotation().statusId"
              [severity]="getSeverity(quotation().statusId)"
            />
          </span>
        </div>
        <div class="editor__toolbar-right">
          <app-kp-button
            [icon]="blocksReorderLocked() ? 'pi pi-lock' : 'pi pi-lock-open'"
            [label]="blocksReorderLocked() ? 'Порядок зафиксирован' : 'Порядок открыт'"
            [severity]="blocksReorderLocked() ? 'secondary' : 'primary'"
            [outlined]="blocksReorderLocked()"
            size="small"
            (buttonClick)="toggleBlocksReorderLock()"
            [attr.aria-label]="blocksReorderLocked() ? 'Разблокировать перемещение блоков' : 'Зафиксировать порядок блоков'"
            [attr.aria-pressed]="blocksReorderLocked()"
          />
          <app-kp-button
            label="Шаблоны"
            icon="pi pi-palette"
            severity="secondary"
            [outlined]="true"
            size="small"
            (buttonClick)="showTemplates = true"
          />
          <app-kp-button
            label="Сохранить"
            icon="pi pi-check"
            size="small"
            (buttonClick)="save()"
            [loading]="saving()"
          />
        </div>
      </header>

      <!-- ═══ Main Layout: A4 Canvas + Right Panel ═══ -->
      <div class="editor__body">
        <!-- A4 Canvas -->
        <div class="editor__canvas-wrapper">
          <div
            class="editor__canvas"
            [class.editor__canvas--reorder-locked]="blocksReorderLocked()"
            [style.background-image]="getBackgroundCss()"
            tabindex="0"
            (click)="onCanvasClick()"
            (keydown.escape)="onCanvasClick()"
          >
            <!-- Blocks -->
            <div
              class="editor__blocks"
              appKpSortableList
              [appKpSortableListData]="blocks()"
              [appKpSortableListDisabled]="blocksReorderLocked()"
              (appKpSortableListDropped)="onBlockDropped($event)"
            >
              <div
                *ngFor="let block of blocks(); trackBy: trackByBlock; let i = index"
                appKpSortableItem
                [appKpSortableItemData]="block"
                [appKpSortableItemDisabled]="blocksReorderLocked()"
                [appKpSortableLockAxis]="'y'"
                class="editor__block"
                [class.editor__block--table]="block.type === 'table'"
                [class.editor__block--header]="block.type === 'header'"
                [class.editor__block--separator]="block.type === 'separator'"
                [class.editor__block--reorder-locked]="blocksReorderLocked()"
                [class.editor__block--controls-active]="isBlockControlsVisible(i, block)"
                [class.editor__block--has-controls]="hasEditableControls(block)"
                [attr.tabindex]="hasEditableControls(block) ? 0 : null"
                role="group"
                (click)="selectBlock(i, $event)"
                (keydown.enter)="selectBlockKey(i, $event)"
                (keydown.space)="selectBlockKey(i, $event)"
                (appKpSortableItemStarted)="onBlockDragStarted(i)"
                (appKpSortableItemEnded)="onBlockDragEnded()"
              >
                <!-- Block Controls — широкая панель навигации (клик по блоку) -->
                <div
                  class="editor__block-controls"
                  role="toolbar"
                  [attr.aria-label]="'Настройки блока ' + (i + 1)"
                  tabindex="-1"
                  (mousedown)="$event.stopPropagation()"
                >
                  @if (block.type === 'text' || block.type === 'header') {
                    <div class="editor__block-controls-section">
                      <span class="editor__block-controls-label">Выравнивание</span>
                      <div class="editor__block-controls-align" role="group" aria-label="Выравнивание блока">
                        <p-button
                          icon="pi pi-align-left"
                          [rounded]="false"
                          [outlined]="block.settings.align !== 'left'"
                          [severity]="block.settings.align === 'left' ? 'primary' : 'secondary'"
                          size="small"
                          styleClass="editor__block-controls-chip"
                          (click)="setBlockAlign(i, 'left')"
                        />
                        <p-button
                          icon="pi pi-align-center"
                          [rounded]="false"
                          [outlined]="block.settings.align !== 'center'"
                          [severity]="block.settings.align === 'center' ? 'primary' : 'secondary'"
                          size="small"
                          styleClass="editor__block-controls-chip"
                          (click)="setBlockAlign(i, 'center')"
                        />
                        <p-button
                          icon="pi pi-align-right"
                          [rounded]="false"
                          [outlined]="block.settings.align !== 'right'"
                          [severity]="block.settings.align === 'right' ? 'primary' : 'secondary'"
                          size="small"
                          styleClass="editor__block-controls-chip"
                          (click)="setBlockAlign(i, 'right')"
                        />
                      </div>
                    </div>
                    <div class="editor__block-controls-section">
                      <span class="editor__block-controls-label">Цвет текста</span>
                      <div class="editor__block-controls-colors" role="group" aria-label="Цвет текста">
                        @for (c of blockTextColors; track c.value) {
                          <button
                            type="button"
                            class="editor__color-swatch"
                            [class.editor__color-swatch--active]="blockColorActive(block, c.value)"
                            [class.editor__color-swatch--auto]="!c.value"
                            [class.editor__color-swatch--light]="!!c.value && isLightSwatchColor(c.value)"
                            [style.background]="c.value || null"
                            [attr.title]="c.label"
                            [attr.aria-label]="c.label"
                            [attr.aria-pressed]="blockColorActive(block, c.value)"
                            (click)="setBlockColor(i, c.value)"
                          >
                            @if (!c.value) {
                              <span class="editor__color-swatch-label" aria-hidden="true">А</span>
                            }
                          </button>
                        }
                      </div>
                    </div>
                    <div class="editor__block-controls-section">
                      <span class="editor__block-controls-label">Цвет фона</span>
                      <div class="editor__block-controls-colors" role="group" aria-label="Цвет фона">
                        @for (c of blockBgColors; track c.value) {
                          <button
                            type="button"
                            class="editor__color-swatch"
                            [class.editor__color-swatch--active]="blockBackgroundColorActive(block, c.value)"
                            [class.editor__color-swatch--none]="!c.value"
                            [class.editor__color-swatch--light]="!!c.value && isLightSwatchColor(c.value)"
                            [style.background]="c.value || null"
                            [attr.title]="c.label"
                            [attr.aria-label]="c.label"
                            [attr.aria-pressed]="blockBackgroundColorActive(block, c.value)"
                            (click)="setBlockBackgroundColor(i, c.value)"
                          ></button>
                        }
                      </div>
                    </div>
                    <div class="editor__block-controls-row">
                      <p-button
                        icon="pi pi-bold"
                        [rounded]="false"
                        [outlined]="block.settings.fontWeight !== 'bold'"
                        [severity]="block.settings.fontWeight === 'bold' ? 'primary' : 'secondary'"
                        size="small"
                        (click)="toggleBlockFontWeight(i)"
                        styleClass="editor__block-controls-btn--wide"
                      />
                      <p-button
                        icon="pi pi-stop"
                        [rounded]="false"
                        [outlined]="!blockBorderActive(block)"
                        [severity]="blockBorderActive(block) ? 'primary' : 'secondary'"
                        size="small"
                        (click)="cycleBlockBorder(i)"
                        styleClass="editor__block-controls-btn--wide"
                      />
                    </div>
                  }

                  @if (block.type === 'text') {
                    <div class="editor__block-controls-row">
                      <p-button
                        icon="pi pi-plus"
                        [rounded]="false"
                        [outlined]="true"
                        severity="secondary"
                        size="small"
                        (click)="onAddCell(i)"
                        [disabled]="getCells(block).length >= maxTextCells"
                        styleClass="editor__block-controls-btn--wide"
                      />
                      <p-button
                        icon="pi pi-pencil"
                        [rounded]="false"
                        [outlined]="true"
                        severity="secondary"
                        size="small"
                        (click)="editTextBlock(i)"
                        styleClass="editor__block-controls-btn--wide"
                      />
                    </div>
                  }

                  @if (block.type === 'separator') {
                    <p-button
                      icon="pi pi-arrows-v"
                      [rounded]="false"
                      [outlined]="true"
                      severity="secondary"
                      size="small"
                      (click)="editBlockSettings(i)"
                      styleClass="editor__block-controls-btn--wide"
                    />
                  }

                  <div class="editor__block-controls-row editor__block-controls-row--full">
                    <p-button
                      icon="pi pi-trash"
                      [rounded]="false"
                      [outlined]="true"
                      severity="danger"
                      size="small"
                      (click)="removeBlock(i)"
                      [disabled]="blocks().length <= 1"
                      styleClass="editor__block-controls-btn--wide"
                    />
                  </div>
                </div>

                <!-- Block Content -->
                <!-- Header -->
                <div
                  *ngIf="block.type === 'header'"
                  class="editor__block-content editor__block-drag-surface"
                  [class.editor__block-drag-surface--active]="!blocksReorderLocked()"
                  appKpSortableHandle
                  [ngStyle]="blockVisualStyles(block)"
                  [style.text-align]="block.settings.align"
                  [style.font-size.px]="block.settings.fontSize"
                  [style.font-weight]="block.settings.fontWeight"
                  [style.padding-top.px]="block.settings.paddingTop"
                  [style.padding-bottom.px]="block.settings.paddingBottom"
                >
                  <div [innerHTML]="block.content"></div>
                </div>

                <!-- Text Card -->
                <div
                  *ngIf="block.type === 'text'"
                  class="editor__block-content editor__text-card editor__block-drag-surface"
                  [class.editor__block-drag-surface--active]="!blocksReorderLocked()"
                  appKpSortableHandle
                  [style.padding-top.px]="block.settings.paddingTop"
                  [style.padding-bottom.px]="block.settings.paddingBottom"
                >
                  <app-kp-split-text-card
                    [title]="block.title ?? ''"
                    [cells]="getCells(block)"
                    [settings]="block.settings"
                    [maxColumns]="maxTextCells"
                    (editCell)="onEditCell(i, $event)"
                  />
                </div>

                <!-- Separator -->
                <div
                  *ngIf="block.type === 'separator'"
                  class="editor__block-content editor__block-drag-surface"
                  [class.editor__block-drag-surface--active]="!blocksReorderLocked()"
                  appKpSortableHandle
                  [style.padding-top.px]="block.settings.paddingTop"
                  [style.padding-bottom.px]="block.settings.paddingBottom"
                >
                  <hr class="editor__separator" />
                </div>

                <!-- Table Block -->
                <div
                  *ngIf="block.type === 'table'"
                  class="editor__table-wrapper"
                >
                  <div
                    class="editor__table-toolbar editor__block-drag-surface"
                    [class.editor__block-drag-surface--active]="!blocksReorderLocked()"
                  >
                    <div class="editor__table-toolbar-left">
                      <span class="editor__table-grip" aria-hidden="true">
                        <i class="pi pi-grip-vertical"></i>
                      </span>
                      <span class="editor__table-title">{{ block.title || 'Таблица' }}</span>
                    </div>
                    <div
                      class="editor__table-toolbar-actions"
                      (mousedown)="stopTableBlockDrag($event)"
                    >
                      @if (tableBlockHasPicker(block)) {
                        <app-kp-button
                          icon="pi pi-shopping-cart"
                          size="small"
                          [rounded]="true"
                          [text]="true"
                          [attr.aria-label]="pickerButtonTitle(block)"
                          [attr.title]="pickerButtonTitle(block)"
                          (buttonClick)="openProductPicker(i)"
                        />
                      }
                    </div>
                  </div>

                  <table class="editor__table">
                    <thead>
                      <tr>
                        <th style="width:40px">№</th>
                        <th style="width:60px">Арт.</th>
                        <th style="width:60px">Фото</th>
                        <th>Наименование</th>
                        <th style="width:70px">Кол-во</th>
                        <th style="width:50px">Ед.</th>
                        <th style="width:90px">Цена, ₽</th>
                        <th style="width:100px">Сумма, ₽</th>
                      </tr>
                    </thead>
                    <tbody (mousedown)="stopTableBlockDrag($event)">
                      <tr
                        *ngFor="let row of blockItemRows(i); trackBy: trackByBlockItemRow; let localIdx = index"
                        class="editor__table-row"
                        [class.editor__table-row--selected]="selectedItemIndex() === row.index"
                        (click)="onTableRowClick($event, row.index)"
                      >
                        <td class="editor__table-idx">
                          <button type="button" class="editor__table-cell-action" (click)="openRowActions(row.index)">
                            {{ localIdx + 1 }}
                          </button>
                        </td>
                        <td>
                          <button type="button" class="editor__table-cell-action" (click)="openRowActions(row.index)">
                            {{ row.item.sku || '—' }}
                          </button>
                        </td>
                        <td>
                          <button
                            type="button"
                            class="editor__table-photo"
                            (click)="openRowActions(row.index)"
                            [attr.aria-label]="'Действия для позиции ' + (row.index + 1)"
                          >
                            <i class="pi pi-image" *ngIf="!row.item.photo"></i>
                            <img *ngIf="row.item.photo" [src]="row.item.photo" class="editor__table-photo-img" alt="фото" />
                          </button>
                        </td>
                        <td>
                          <button type="button" class="editor__table-cell-action editor__table-cell-action--wide" (click)="openRowActions(row.index)">
                            {{ row.item.name || 'Без названия' }}
                          </button>
                        </td>
                        <td>
                          <app-kp-input-number
                            [value]="row.item.qty"
                            (valueChange)="setItemQty(row.index, $event)"
                            [min]="0"
                            [useGrouping]="false"
                            class="editor__table-number"
                            (click)="$event.stopPropagation()"
                            (dblclick)="$event.stopPropagation()"
                          />
                        </td>
                        <td>
                          <span class="editor__table-readonly">{{ row.item.unit || 'шт' }}</span>
                        </td>
                        <td>
                          <app-kp-input-number
                            [value]="row.item.price"
                            (valueChange)="setItemPrice(row.index, $event)"
                            [min]="0"
                            [step]="0.01"
                            [useGrouping]="false"
                            class="editor__table-number"
                            (click)="$event.stopPropagation()"
                            (dblclick)="$event.stopPropagation()"
                          />
                        </td>
                        <td class="editor__table-sum">
                          {{ computeSum(row.item) | number:'1.2-2' }}
                        </td>
                      </tr>
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colspan="7" class="editor__table-total-label">Итого:</td>
                        <td class="editor__table-total">{{ blockItemsTotal(block) | number:'1.2-2' }}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>

            <!-- Add Block FAB -->
            <div class="editor__add-fab">
              <app-kp-button
                icon="pi pi-plus"
                [rounded]="true"
                size="large"
                severity="primary"
                styleClass="editor__add-fab-btn"
                [attr.aria-label]="'Добавить блок'"
                [attr.title]="'Добавить блок'"
                (buttonClick)="showAddMenu = !showAddMenu"
              />
              <div class="editor__add-menu" *ngIf="showAddMenu" (keydown.escape)="showAddMenu = false" tabindex="-1" role="menu">
                <app-kp-button label="Текстовый блок" icon="pi pi-align-left" [text]="true" size="small" (buttonClick)="addBlock('text')" />
                <app-kp-button label="Разделитель" icon="pi pi-minus" [text]="true" size="small" (buttonClick)="addBlock('separator')" />
                <div class="editor__add-menu-table" role="presentation" (buttonClick)="$event.stopPropagation()">
                  <span class="editor__add-menu-label">Таблица</span>
                  <p-select
                    [ngModel]="selectedTableKind()"
                    (ngModelChange)="selectedTableKind.set($event)"
                    [options]="availableTableBlockOptions()"
                    optionLabel="label"
                    optionValue="value"
                    placeholder="Выберите тип"
                    class="w-full"
                    size="small"
                    appendTo="body"
                    [disabled]="availableTableBlockOptions().length === 0"
                  />
                  <app-kp-button
                    label="Добавить таблицу"
                    icon="pi pi-table"
                    [text]="true"
                    size="small"
                    class="w-full"
                    [disabled]="availableTableBlockOptions().length === 0"
                    (buttonClick)="addTableBlock()"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Side info panel -->
        <aside class="editor__sidebar">
          <div class="editor__sidebar-section">
            <h3 class="editor__sidebar-title">Реквизиты</h3>
            <div class="editor__sidebar-field">
              <app-kp-input
                name="qe-field-number"
                label="Номер"
                [value]="quotation().number"
                (valueChange)="patchQuotationField('number', $event)"
                [readonly]="true"
              />
            </div>
            <div class="editor__sidebar-field">
              <app-kp-input
                name="qe-field-date"
                label="Дата"
                [value]="quotationDate"
                (valueChange)="quotationDate = $event"
              />
            </div>
            <div class="editor__sidebar-field">
              <app-kp-input
                name="qe-field-counterparty"
                label="Контрагент"
                [value]="quotation().counterpartyId"
                (valueChange)="patchQuotationField('counterpartyId', $event)"
                placeholder="ID контрагента"
              />
            </div>
            <div class="editor__sidebar-field">
              <app-kp-input
                name="qe-field-valid-until"
                label="Действует до"
                [value]="quotationValidUntil"
                (valueChange)="quotationValidUntil = $event"
              />
            </div>
          </div>

          <div class="editor__sidebar-section">
            <h3 class="editor__sidebar-title">Фон документа</h3>
            <div class="editor__sidebar-field">
              <app-kp-button
                [label]="quotationBg ? 'Изменить фон' : 'Загрузить фон'"
                icon="pi pi-image"
                severity="secondary"
                [outlined]="true"
                size="small"
                (buttonClick)="showBgInput()"
                class="w-full"
              />
              <app-kp-button
                *ngIf="quotationBg"
                label="Удалить фон"
                icon="pi pi-times"
                severity="danger"
                [text]="true"
                size="small"
                (buttonClick)="removeBackgroundImage()"
              />
            </div>
          </div>

          <div class="editor__sidebar-section">
            <h3 class="editor__sidebar-title">Примечание</h3>
            <app-kp-textarea
              name="qe-notes"
              [value]="quotation().notes || ''"
              (valueChange)="patchQuotationField('notes', $event)"
              [rows]="4"
              placeholder="Примечание к документу..."
            />
          </div>

          @if (sidebarItemRows().length > 0) {
            <div class="editor__sidebar-section">
              <h3 class="editor__sidebar-title">{{ sidebarItemsTitle() }}</h3>
              <ul class="editor__item-nav" role="list">
                @for (row of sidebarItemRows(); track row.index) {
                  <li class="editor__item-nav-item" role="listitem">
                    <button
                      type="button"
                      class="editor__item-nav-btn"
                      [class.editor__item-nav-btn--active]="selectedItemIndex() === row.index"
                      (click)="selectItem(row.index)"
                    >
                      <span class="editor__item-nav-idx">{{ row.index + 1 }}</span>
                      @if (row.item.photo) {
                        <img [src]="row.item.photo" alt="" class="editor__item-nav-thumb" />
                      } @else {
                        <span class="editor__item-nav-thumb editor__item-nav-thumb--empty" aria-hidden="true">
                          <i class="pi pi-image"></i>
                        </span>
                      }
                      <span class="editor__item-nav-text">
                        <span class="editor__item-nav-name">{{ row.item.name || 'Без названия' }}</span>
                        <span class="editor__item-nav-meta">
                          {{ row.item.qty || 0 }} {{ row.item.unit || 'шт' }} · {{ computeSum(row.item) | number:'1.2-2' }} ₽
                        </span>
                      </span>
                    </button>
                  </li>
                }
              </ul>
            </div>

            @if (selectedItemIndex() !== null) {
              @if (items()[selectedItemIndex()!]; as item) {
                <div class="editor__sidebar-section editor__item-editor">
                  <h3 class="editor__sidebar-title">Позиция {{ selectedItemIndex()! + 1 }}</h3>

                  <div class="editor__item-photo-panel">
                    @if (item.photo) {
                      <button
                        type="button"
                        class="editor__item-photo-zoom"
                        (click)="openPhotoZoom(item.photo!)"
                        aria-label="Увеличить фото товара"
                      >
                        <img [src]="item.photo" alt="Фото товара" />
                        <span class="editor__item-photo-zoom-hint">
                          <i class="pi pi-search-plus" aria-hidden="true"></i>
                          Увеличить
                        </span>
                      </button>
                    } @else {
                      <div class="editor__item-photo-empty">
                        <i class="pi pi-image" aria-hidden="true"></i>
                        <span>Фото не задано</span>
                      </div>
                    }
                    <app-kp-button
                      label="Изменить фото"
                      icon="pi pi-image"
                      severity="secondary"
                      [outlined]="true"
                      size="small"
                      styleClass="w-full"
                      (buttonClick)="showPhotoInput(selectedItemIndex()!)"
                    />
                  </div>

                  <div class="editor__item-editor-actions">
                    <app-kp-button
                      label="Заменить"
                      icon="pi pi-refresh"
                      severity="secondary"
                      [outlined]="true"
                      size="small"
                      styleClass="editor__item-editor-action"
                      (buttonClick)="replaceItem(selectedItemIndex()!)"
                    />
                    <app-kp-button
                      label="Удалить"
                      icon="pi pi-trash"
                      severity="danger"
                      [outlined]="true"
                      size="small"
                      styleClass="editor__item-editor-action"
                      (buttonClick)="removeItem(selectedItemIndex()!)"
                    />
                  </div>
                </div>
              }
            }
          }
        </aside>
      </div>
    </div>

    <!-- ═══ Template Dialog ═══ -->
    <app-kp-dialog
      [(visible)]="showTemplates"
      header="Шаблоны оформления"
      width="520px"
    >
      <div class="tmpl-list">
        <div class="tmpl-list__header">
          <app-kp-button
            label="Сохранить как шаблон"
            icon="pi pi-save"
            size="small"
            (buttonClick)="showSaveTemplateInput()"
            [outlined]="true"
          />
        </div>

        <div class="tmpl-list__items">
          <div
            *ngFor="let tmpl of templates(); trackBy: trackByTemplate"
            class="tmpl-card"
            [class.tmpl-card--active]="activeTemplateId() === tmpl._id"
            (buttonClick)="applyTemplate(tmpl)" (keydown.enter)="applyTemplate(tmpl)" tabindex="0" role="button"
          >
            <div class="tmpl-card__info">
              <span class="tmpl-card__name">{{ tmpl.name }}</span>
              <span class="tmpl-card__meta">{{ tmpl.blocks.length || 0 }} блоков</span>
            </div>
            <p-tag
              *ngIf="tmpl.isDefault"
              value="По умолчанию"
              severity="info"
              styleClass="tmpl-card__tag"
            />
            <div class="tmpl-card__actions">
              <app-kp-button
                icon="pi pi-trash"
                [rounded]="true"
                [text]="true"
                severity="danger"
                size="small"
                (buttonClick)="$event.stopPropagation(); deleteTemplate(tmpl)"
              />
            </div>
          </div>

          <div *ngIf="templates().length === 0" class="tmpl-list__empty">
            <p>Нет сохранённых шаблонов</p>
          </div>
        </div>
      </div>
    </app-kp-dialog>

    <!-- ═══ Text Block Editor Dialog ═══ -->
    <app-kp-dialog
      [(visible)]="showTextEditor"
      header="Настройки текстового блока"
      width="500px"
    >
      <div class="editor__dialog-body">
        <app-kp-input
          name="qe-text-block-title"
          label="Заголовок"
          [value]="editingTextBlock.title || ''"
          (valueChange)="editingTextBlock.title = $event"
          placeholder="Необязательно"
        />
        <div class="editor__dialog-field">
          <span class="editor__dialog-field-label">Колонки</span>
          <div class="flex flex-col gap-2">
            <div
              *ngFor="let cell of editingTextBlock.cells; let ci = index"
              class="flex items-center gap-2"
            >
              <span class="text-xs text-soft flex-1 truncate">{{ cell.content || '(пусто)' }}</span>
              <app-kp-button
                icon="pi pi-pencil"
                [rounded]="true"
                [text]="true"
                severity="secondary"
                size="small"
                (buttonClick)="openCellEditor(ci)"
              />
              <app-kp-button
                icon="pi pi-trash"
                [rounded]="true"
                [text]="true"
                severity="danger"
                size="small"
                (buttonClick)="deleteCell(ci)"
                [disabled]="(editingTextBlock.cells?.length ?? 0) <= 1"
              />
            </div>
          </div>
          <app-kp-button
            label="Добавить колонку"
            icon="pi pi-plus"
            [text]="true"
            size="small"
            (buttonClick)="addCell()"
            [disabled]="(editingTextBlock.cells?.length ?? 0) >= maxTextCells"
          />
        </div>
        <app-kp-select
          name="qe-text-block-font-size"
          label="Размер шрифта"
          [options]="fontSizes"
          [value]="editingTextBlock.settings.fontSize"
          (valueChange)="onTextBlockFontSizeChange($event)"
        />
        <div class="editor__dialog-field editor__dialog-field--row">
          <app-kp-input-number
            name="qe-text-block-padding-top"
            label="Отступ сверху (px)"
            [value]="editingTextBlock.settings.paddingTop"
            (valueChange)="onTextBlockPaddingChange('paddingTop', $event)"
            [min]="0"
            [max]="120"
            [useGrouping]="false"
          />
          <app-kp-input-number
            name="qe-text-block-padding-bottom"
            label="Отступ снизу (px)"
            [value]="editingTextBlock.settings.paddingBottom"
            (valueChange)="onTextBlockPaddingChange('paddingBottom', $event)"
            [min]="0"
            [max]="120"
            [useGrouping]="false"
          />
        </div>
      </div>
      <div kpDialogFooter class="editor__dialog-footer">
        <app-kp-button label="Отмена" severity="secondary" [outlined]="true" size="small" (buttonClick)="showTextEditor = false" />
        <app-kp-button label="Готово" size="small" (buttonClick)="confirmTextEdit()" />
      </div>
    </app-kp-dialog>

    <!-- ═══ Text Cell Dialog ═══ -->
    <app-kp-dialog
      [(visible)]="showCellEditor"
      header="Редактировать колонку"
      width="500px"
    >
      <div class="editor__dialog-body">
        <app-kp-textarea
          name="qe-cell-content"
          label="Текст колонки"
          [value]="editingCellContent"
          (valueChange)="editingCellContent = $event"
          [rows]="8"
          placeholder="Введите текст (каждая строка — новый абзац)"
        />
        <span class="editor__dialog-hint">Каждая строка = новый абзац</span>
        <div class="editor__dialog-field">
          <span id="qe-cell-align-label" class="editor__dialog-field-label">Выравнивание колонки</span>
          <div class="editor__align-group" role="group" aria-labelledby="qe-cell-align-label">
            <app-kp-button
              icon="pi pi-align-left"
              [rounded]="false"
              [text]="editingCellAlign !== 'left'"
              [severity]="editingCellAlign === 'left' ? 'primary' : 'secondary'"
              size="small"
              (buttonClick)="editingCellAlign = 'left'"
            />
            <app-kp-button
              icon="pi pi-align-center"
              [rounded]="false"
              [text]="editingCellAlign !== 'center'"
              [severity]="editingCellAlign === 'center' ? 'primary' : 'secondary'"
              size="small"
              (buttonClick)="editingCellAlign = 'center'"
            />
            <app-kp-button
              icon="pi pi-align-right"
              [rounded]="false"
              [text]="editingCellAlign !== 'right'"
              [severity]="editingCellAlign === 'right' ? 'primary' : 'secondary'"
              size="small"
              (buttonClick)="editingCellAlign = 'right'"
            />
          </div>
        </div>
      </div>
      <div kpDialogFooter class="editor__dialog-footer">
        <app-kp-button label="Отмена" severity="secondary" [outlined]="true" size="small" (buttonClick)="showCellEditor = false" />
        <app-kp-button label="Готово" size="small" (buttonClick)="confirmCellEdit()" />
      </div>
    </app-kp-dialog>

    <!-- ═══ Photo Zoom Dialog ═══ -->
    <app-kp-dialog
      class="editor__photo-zoom-dialog"
      [(visible)]="showPhotoZoomDialog"
      header="Фото товара"
      width="auto"
    >
      <img [src]="photoZoomUrl" class="editor__photo-zoom-img" alt="Увеличенное фото товара" />
      <div kpDialogFooter class="editor__dialog-footer">
        <app-kp-button label="Закрыть" severity="secondary" [outlined]="true" size="small" (buttonClick)="showPhotoZoomDialog = false" />
      </div>
    </app-kp-dialog>

    <!-- ═══ Photo URL Dialog ═══ -->
    <app-kp-dialog
      [(visible)]="showPhotoDialog"
      header="URL фото"
      width="400px"
    >
      <app-kp-input
        name="qe-photo-url"
        label="URL изображения товара"
        type="url"
        [value]="photoDialogUrl"
        (valueChange)="photoDialogUrl = $event"
        placeholder="https://example.com/photo.jpg"
      />
      <div kpDialogFooter class="editor__dialog-footer">
        <app-kp-button label="Отмена" severity="secondary" [outlined]="true" size="small" (buttonClick)="showPhotoDialog = false" />
        <app-kp-button label="Применить" size="small" (buttonClick)="confirmPhoto()" />
      </div>
    </app-kp-dialog>

    <!-- ═══ Row Actions Dialog ═══ -->
    <app-kp-dialog
      [(visible)]="showRowActionsDialog"
      header="Действия с товарной позицией"
      width="420px"
    >
      <div class="editor__row-actions">
        @if (rowActionState(); as state) {
          <div class="editor__row-actions-summary">
            Позиция {{ state.index + 1 }}: {{ items()[state.index]?.name || 'Без названия' }}
          </div>
          <div class="editor__row-actions-buttons">
            <app-kp-button
              label="Заменить товар"
              icon="pi pi-refresh"
              severity="secondary"
              [outlined]="true"
              size="small"
              styleClass="w-full"
              (buttonClick)="replaceItemFromActions()"
            />
            <app-kp-button
              label="Редактировать товар"
              icon="pi pi-pencil"
              severity="secondary"
              [outlined]="true"
              size="small"
              styleClass="w-full"
              (buttonClick)="editProductFromActions()"
            />
            <app-kp-button
              label="Удалить позицию"
              icon="pi pi-trash"
              severity="danger"
              [outlined]="true"
              size="small"
              styleClass="w-full"
              (buttonClick)="removeItemFromActions()"
            />
            <app-kp-button
              label="Отмена"
              severity="secondary"
              [outlined]="true"
              size="small"
              styleClass="w-full"
              (buttonClick)="closeRowActionsDialog()"
            />
          </div>
        }
      </div>
    </app-kp-dialog>

    <!-- ═══ Separator Padding Dialog ═══ -->
    <app-kp-dialog
      [(visible)]="showPaddingDialog"
      header="Отступ разделителя"
      width="350px"
    >
      <app-kp-input-number
        name="qe-padding-value"
        label="Отступ сверху (px)"
        [(value)]="paddingDialogValue"
        [min]="0"
        [max]="100"
        [useGrouping]="false"
      />
      <div kpDialogFooter class="editor__dialog-footer">
        <app-kp-button label="Отмена" severity="secondary" [outlined]="true" size="small" (buttonClick)="showPaddingDialog = false" />
        <app-kp-button label="Готово" size="small" (buttonClick)="confirmPadding()" />
      </div>
    </app-kp-dialog>

    <!-- ═══ Background URL Dialog ═══ -->
    <app-kp-dialog
      [(visible)]="showBgDialog"
      header="Фоновое изображение"
      width="450px"
    >
      <app-kp-input
        name="qe-bg-url"
        label="URL фонового изображения"
        type="url"
        [value]="bgDialogUrl"
        (valueChange)="bgDialogUrl = $event"
        placeholder="https://example.com/bg.jpg"
      />
      <div kpDialogFooter class="editor__dialog-footer">
        <app-kp-button label="Отмена" severity="secondary" [outlined]="true" size="small" (buttonClick)="showBgDialog = false" />
        <app-kp-button label="Применить" size="small" (buttonClick)="confirmBg()" />
      </div>
    </app-kp-dialog>

    <!-- ═══ Template Name Dialog ═══ -->
    <app-kp-dialog
      [(visible)]="showTemplateNameDialog"
      header="Сохранение шаблона"
      width="400px"
    >
      <app-kp-input
        name="qe-template-name"
        label="Название шаблона"
        [value]="templateNameValue"
        (valueChange)="templateNameValue = $event"
        placeholder="Мой шаблон"
      />
      <div kpDialogFooter class="editor__dialog-footer">
        <app-kp-button label="Отмена" severity="secondary" [outlined]="true" size="small" (buttonClick)="showTemplateNameDialog = false" />
        <app-kp-button label="Сохранить" size="small" (buttonClick)="confirmSaveTemplate()" />
      </div>
    </app-kp-dialog>

    <app-kp-product-picker
      [(visible)]="productPickerVisible"
      [multiple]="replaceItemIndex() === null"
      [pickerTitle]="productPickerTitle()"
      [defaultFilters]="productPickerDefaults()"
      [selectedIds]="productPickerExistingIds()"
      (productsSelected)="onProductsSelected($event)"
      (productSelected)="onProductReplaced($event)"
    />

    <p-toast position="top-right" />
  `,
  styleUrl: './quotation-editor.component.scss',
})
export class QuotationEditorComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly crudApi = inject(CrudApiService);
  private readonly tableTypeOptionsService = inject(DocumentTableTypeOptionsService);
  private readonly notification = inject(MessageService);

  // State
  readonly isNew = signal(false);

  readonly quotationToolbarTitle = computed(() =>
    this.isNew() ? 'Новое КП' : formatQuotationLabel(this.quotation().number),
  );

  readonly saving = signal(false);
  readonly quotation = signal<IQuotation>({
    number: '',
    counterpartyId: '',
    statusId: 'draft',
    total: 0,
    notes: '',
    items: [],
    templateId: '',
    date: new Date().toISOString(),
  });
  readonly items = signal<QuotationItem[]>([]);
  readonly blocks = signal<EditorBlock[]>([]);
  readonly templates = signal<DocumentTemplate[]>([]);
  readonly activeTemplateId = signal<string | undefined>(undefined);

  // UI State
  showTemplates = false;
  showAddMenu = false;
  readonly selectedTableKind = signal<string>('products');
  readonly tableBlockOptions = signal<KpSelectOption[]>(FALLBACK_TABLE_BLOCK_OPTIONS);
  /** Метаданные типов таблиц с dataSource (для подстановки из справочника). Предзаполнен фолбэком — API обновит после загрузки. */
  readonly pickerMetaByKind = signal<Record<string, PickerKindMeta>>({
    products: { label: 'Товары', dataSource: 'products' },
  });
  showTextEditor = false;
  showCellEditor = false;
  editingTextIndex = -1;
  editingCellIndex = -1;
  editingCellContent = '';
  editingCellAlign: 'left' | 'center' | 'right' = 'center';
  readonly maxTextCells = 6;
  readonly blockTextColors = BLOCK_TEXT_COLORS;
  readonly blockBgColors = BLOCK_BG_COLORS;
  editingTextBlock: EditorBlock = {
    type: 'text',
    order: 0,
    title: '',
    content: '',
    cells: [{ content: '' }],
    settings: { fontSize: 11, fontWeight: 'normal', align: 'center', paddingTop: 8, paddingBottom: 8 },
  };

  // Computed
  readonly totalSum = computed(() =>
    this.items().reduce((acc, item) => acc + (item.qty || 0) * (item.price || 0), 0),
  );

  readonly productPickerVisible = signal(false);
  readonly replaceItemIndex = signal<number | null>(null);
  readonly activeTableBlockIndex = signal<number | null>(null);
  readonly selectedItemIndex = signal<number | null>(null);
  readonly activeBlockIndex = signal<number | null>(null);
  readonly isDraggingBlock = signal(false);
  readonly rowActionState = signal<RowActionState | null>(null);
  showRowActionsDialog = false;

  /** true = порядок блоков зафиксирован, перетаскивание отключено */
  readonly blocksReorderLocked = signal(false);

  readonly productPickerExistingIds = computed(() =>
    this.items()
      .filter((item) => (item.tableKind ?? DEFAULT_TABLE_KIND) === this.activePickerTableKind())
      .map((i) => i.productId)
      .filter((id): id is string => !!id),
  );

  readonly activePickerTableKind = computed(() => {
    const replaceIdx = this.replaceItemIndex();
    if (replaceIdx !== null) {
      const item = this.items()[replaceIdx];
      return item?.tableKind ?? DEFAULT_TABLE_KIND;
    }
    const blockIndex = this.activeTableBlockIndex();
    if (blockIndex === null) return DEFAULT_TABLE_KIND;
    const block = this.blocks()[blockIndex];
    return block?.type === 'table' ? this.resolveTableKind(block) : DEFAULT_TABLE_KIND;
  });

  readonly productPickerDefaults = computed((): ProductPickerFilters => {
    const kind = this.activePickerTableKind();
    const productKind = PRODUCT_KIND_BY_NAME[kind];
    return {
      kind: productKind,
      activeOnly: true,
    };
  });

  readonly productPickerTitle = computed(() => {
    if (this.replaceItemIndex() !== null) {
      const item = this.items()[this.replaceItemIndex()!];
      const kind = item?.tableKind ?? DEFAULT_TABLE_KIND;
      const label = this.pickerMetaByKind()[kind]?.label ?? 'позицию';
      return `Заменить ${label.toLowerCase()}`;
    }
    const kind = this.activePickerTableKind();
    const label = this.pickerMetaByKind()[kind]?.label ?? 'позиции';
    return `Выберите ${label.toLowerCase()}`;
  });

  readonly availableTableBlockOptions = computed(() => {
    const usedKinds = new Set(
      this.blocks()
        .filter((block) => block.type === 'table')
        .map((block) => this.resolveTableKind(block)),
    );
    return this.tableBlockOptions().filter((option) => !usedKinds.has(String(option.value ?? '')));
  });

  readonly sidebarItemRows = computed((): BlockItemRow[] => {
    const kind = this.sidebarItemsKind();
    if (!kind) return [];
    return this.items()
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => (item.tableKind ?? DEFAULT_TABLE_KIND) === kind);
  });

  readonly sidebarItemsTitle = computed(() => {
    const kind = this.sidebarItemsKind();
    if (!kind) return 'Позиции';
    const block = this.blocks().find((b) => b.type === 'table' && this.resolveTableKind(b) === kind);
    return block?.title || this.tableBlockOptions().find((o) => o.value === kind)?.label || 'Позиции';
  });

  // ── Prompt-replacement dialog state ──
  showPhotoDialog = false;
  photoDialogIndex = -1;
  photoDialogUrl = '';

  showPhotoZoomDialog = false;
  photoZoomUrl = '';

  showPaddingDialog = false;
  paddingDialogIndex = -1;
  paddingDialogValue: number | null = 4;

  showBgDialog = false;
  bgDialogUrl = '';

  showTemplateNameDialog = false;
  templateNameValue = '';

  // Font options
  readonly fontSizes = [
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

  // Inline editing helpers for quotation
  get quotationDate(): string {
    const d = this.quotation().date;
    return d ? new Date(d).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
  }
  set quotationDate(v: string) {
    this.quotation().date = v;
  }

  get quotationValidUntil(): string {
    const d = this.quotation().validUntil;
    return d || '';
  }
  set quotationValidUntil(v: string) {
    this.quotation().validUntil = v;
  }

  get quotationBg(): string | undefined {
    if (this.activeTemplateId()) {
      const tmpl = this.templates().find(t => t._id === this.activeTemplateId());
      return tmpl?.backgroundImage;
    }
    return undefined;
  }

  getBackgroundCss(): string {
    if (this.quotationBg) {
      return `url(${this.quotationBg})`;
    }
    return 'none';
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id === 'new') {
      this.isNew.set(true);
      this.initNewQuotation();
      const tenderId = this.route.snapshot.queryParamMap.get('tenderId');
      if (tenderId) {
        this.prefillFromTender(tenderId);
      }
    } else if (id) {
      this.loadQuotation(id);
    }

    this.loadTemplates();
    this.loadTableTypeOptions();
  }

  private initNewQuotation(): void {
    this.quotation.set({
      ...this.quotation(),
      number: 'Новый',
      date: new Date().toISOString(),
      statusId: 'draft',
    });
  }

  private prefillFromTender(tenderId: string): void {
    this.crudApi.getById<ITender>('/directories/tenders', tenderId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => of(null)),
      )
      .subscribe({
        next: (tender) => {
          if (!tender) return;
          this.quotation.update(q => ({
            ...q,
            tenderId: tender._id,
            counterpartyId: tender.companyId,
            notes: [q.notes, `Тендер: ${tender.number} — ${tender.subject || 'Без темы'}`].filter(Boolean).join('\n'),
          }));
          if (tender.productName) {
            const item: QuotationItem = {
              sku: '',
              tableKind: DEFAULT_TABLE_KIND,
              name: tender.productName,
              qty: tender.quantity || 1,
              unit: tender.unit || 'шт',
              price: 0,
              sum: 0,
              order: 0,
            };
            this.items.set([item]);
          }
        },
      });
  }

  private loadQuotation(id: string): void {
    this.crudApi.getById<IQuotation>('/directories/quotations', id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap({
          next: (data) => {
            this.quotation.set(data);
            this.items.set(this.normalizeItems(data.items || []));
            if (data.templateId) {
              this.activeTemplateId.set(data.templateId);
            } else {
              this.initDefaultBlocks();
            }
          },
          error: () => {
            this.notification.add({ severity: 'error', summary: 'Ошибка', detail: 'Не удалось загрузить документ' });
            this.goBack();
          },
        }),
        catchError(() => of(null)),
      )
      .subscribe();
  }

  private loadTableTypeOptions(): void {
    this.tableTypeOptionsService
      .load('quotation')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (options) => {
          this.tableBlockOptions.set(this.mergeTableBlockOptions(options));
          this.syncSelectedTableKind();
        },
        error: () => {
          this.tableBlockOptions.set([...FALLBACK_TABLE_BLOCK_OPTIONS]);
          this.selectedTableKind.set('products');
          this.syncSelectedTableKind();
        },
      });

    this.tableTypeOptionsService
      .loadFullTypes('quotation')
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => of([])),
      )
      .subscribe({
        next: (types) => {
          const meta: Record<string, PickerKindMeta> = {};
          for (const t of types) {
            if (t.dataSource && t.name) {
              meta[t.name] = { label: t.label || t.title || t.name, dataSource: t.dataSource };
            }
          }
          this.pickerMetaByKind.set(meta);
        },
      });
  }

  private loadTemplates(): void {
    this.crudApi.list<DocumentTemplate>('/document-templates', { all: true })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap({
          next: (res) => {
            this.templates.set(res.data || []);

            const activeId = this.activeTemplateId();

            // If we have an active template, apply its blocks on reload
            if (activeId && (res.data || []).length > 0) {
              const tmpl = res.data.find((t: DocumentTemplate) => t._id === activeId);
              if (tmpl && tmpl.blocks && tmpl.blocks.length > 0) {
                this.blocks.set(this.normalizeBlocks(JSON.parse(JSON.stringify(tmpl.blocks))));
              } else {
                // Template not found or has no blocks — fall back to defaults
                this.initDefaultBlocks();
              }
              return;
            }

            // If no template loaded yet and we have templates, apply default
            if (!activeId && (res.data || []).length > 0) {
              const defaultTmpl = res.data.find((t: DocumentTemplate) => t.isDefault && t.docType === 'quotation');
              if (defaultTmpl) {
                this.applyTemplate(defaultTmpl);
              } else {
                this.initDefaultBlocks();
              }
            }
          },
        }),
        catchError(() => of(null)),
      )
      .subscribe();
  }

  private initDefaultBlocks(): void {
    this.blocks.set(this.normalizeBlocks(JSON.parse(JSON.stringify(DEFAULT_BLOCKS))));
  }

  // ===== Save =====
  save(): void {
    const q = this.quotation();
    const data = {
      ...q,
      items: this.items().map((item, i) => ({
        ...item,
        order: i,
        sum: (item.qty || 0) * (item.price || 0),
      })),
      templateId: this.activeTemplateId(),
      total: this.totalSum(),
    };

    this.saving.set(true);

    if (this.isNew()) {
      this.crudApi.create<IQuotation & { _id: string }>('/directories/quotations', data)
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          tap({
            next: (result: IQuotation & { _id: string }) => {
              this.notification.add({ severity: 'success', summary: 'Создано', detail: 'КП успешно создано' });
              this.isNew.set(false);
              this.quotation.set({ ...this.quotation(), _id: result._id, number: result.number });
              this.router.navigate(['/quotations', result._id], { replaceUrl: true });
            },
            error: (err) => {
              this.notification.add({ severity: 'error', summary: 'Ошибка', detail: err.error?.error || 'Не удалось создать КП' });
            },
          }),
          finalize(() => this.saving.set(false)),
        )
        .subscribe();
    } else if (q._id) {
      this.crudApi.update('/directories/quotations', q._id, data)
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          tap({
            next: () => {
              this.notification.add({ severity: 'success', summary: 'Сохранено', detail: 'Изменения сохранены' });
            },
            error: (err) => {
              this.notification.add({ severity: 'error', summary: 'Ошибка', detail: err.error?.error || 'Не удалось сохранить' });
            },
          }),
          finalize(() => this.saving.set(false)),
        )
        .subscribe();
    }
  }

  patchQuotationField(key: 'number' | 'counterpartyId' | 'notes', value: string): void {
    this.quotation.update((q) => ({ ...q, [key]: value }));
  }

  setItemQty(index: number, qty: number | null): void {
    this.items.update((items) => {
      const updated = [...items];
      updated[index] = { ...updated[index], qty: qty ?? 0 };
      return updated;
    });
    this.recalcItem(index);
  }

  setItemPrice(index: number, price: number | null): void {
    this.items.update((items) => {
      const updated = [...items];
      updated[index] = { ...updated[index], price: price ?? 0 };
      return updated;
    });
    this.recalcItem(index);
  }

  onTextBlockFontSizeChange(value: string | number | boolean | null): void {
    this.editingTextBlock.settings.fontSize = Number(value ?? 11);
  }

  onTextBlockPaddingChange(field: 'paddingTop' | 'paddingBottom', value: number | null): void {
    this.editingTextBlock.settings[field] = value ?? 0;
  }

  // ===== Items =====
  openProductPicker(blockIndex: number): void {
    const block = this.blocks()[blockIndex];
    if (!block || block.type !== 'table') return;
    if (!this.tableBlockHasPicker(block)) {
      const kind = this.resolveTableKind(block);
      const label = this.pickerMetaByKind()[kind]?.label ?? kind;
      this.notification.add({
        severity: 'info',
        summary: 'Подбор позиций',
        detail: `Для таблицы «${label}» подбор из справочника не настроен (поле dataSource не задано).`,
      });
      return;
    }
    this.activeTableBlockIndex.set(blockIndex);
    this.replaceItemIndex.set(null);
    this.productPickerVisible.set(true);
  }

  pickerButtonTitle(block: EditorBlock): string {
    const kind = this.resolveTableKind(block);
    const meta = this.pickerMetaByKind()[kind];
    return meta ? `Выбрать ${meta.label.toLowerCase()}` : 'Выбрать позиции';
  }

  resolveTableKind(block: EditorBlock): string {
    return block.tableKind ?? DEFAULT_TABLE_KIND;
  }

  tableBlockHasPicker(block: EditorBlock): boolean {
    if (block.type !== 'table') return false;
    const kind = this.resolveTableKind(block);
    return !!this.pickerMetaByKind()[kind];
  }

  blockHasTableKind(kind: string): boolean {
    return this.blocks().some(
      (block) => block.type === 'table' && this.resolveTableKind(block) === kind,
    );
  }

  blockItemRows(blockIndex: number): BlockItemRow[] {
    const block = this.blocks()[blockIndex];
    if (!block || block.type !== 'table') return [];
    const kind = this.resolveTableKind(block);
    return this.items()
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => (item.tableKind ?? DEFAULT_TABLE_KIND) === kind);
  }

  blockItemsTotal(block: EditorBlock): number {
    if (block.type !== 'table') return 0;
    const kind = this.resolveTableKind(block);
    return this.items()
      .filter((item) => (item.tableKind ?? DEFAULT_TABLE_KIND) === kind)
      .reduce((acc, item) => acc + (item.qty || 0) * (item.price || 0), 0);
  }

  trackByBlockItemRow(_index: number, row: BlockItemRow): string {
    return row.item._id || `${row.item.productId ?? 'row'}-${row.index}`;
  }

  private sidebarItemsKind(): string | null {
    const activeBlockIndex = this.activeBlockIndex();
    if (activeBlockIndex === null) return null;
    const block = this.blocks()[activeBlockIndex];
    if (!block || block.type !== 'table') return null;
    return this.resolveTableKind(block);
  }

  private tableKindForPicker(): string {
    const blockIndex = this.activeTableBlockIndex();
    if (blockIndex === null) return DEFAULT_TABLE_KIND;
    const block = this.blocks()[blockIndex];
    return block?.type === 'table' ? this.resolveTableKind(block) : DEFAULT_TABLE_KIND;
  }

  private normalizeItems(items: QuotationItem[]): QuotationItem[] {
    return items.map((item, order) => ({
      ...item,
      tableKind: item.tableKind ?? DEFAULT_TABLE_KIND,
      order,
    }));
  }

  private mergeTableBlockOptions(fromApi: KpSelectOption[]): KpSelectOption[] {
    const merged = new Map<string, KpSelectOption>();
    for (const option of FALLBACK_TABLE_BLOCK_OPTIONS) {
      merged.set(String(option.value ?? ''), option);
    }
    for (const option of fromApi) {
      merged.set(String(option.value ?? ''), option);
    }
    return Array.from(merged.values());
  }

  private syncSelectedTableKind(): void {
    const available = this.availableTableBlockOptions();
    if (available.length === 0) return;
    const current = this.selectedTableKind();
    if (!available.some((option) => option.value === current)) {
      this.selectedTableKind.set(String(available[0].value ?? DEFAULT_TABLE_KIND));
    }
  }

  onTableRowDblclick(event: MouseEvent, index: number): void {
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'SELECT' ||
      target.closest('input, select, .p-inputnumber, .p-select, .p-inputtext')
    ) {
      return;
    }
    this.replaceItem(index);
  }

  onTableRowClick(event: MouseEvent, index: number): void {
    const target = event.target as HTMLElement;
    if (target.closest('input, select, .p-inputnumber, .p-select, .p-inputtext, .editor__table-photo')) {
      return;
    }
    this.selectItem(index);
  }

  onTablePhotoClick(event: Event, index: number): void {
    event.stopPropagation();
    this.selectItem(index);
    this.showPhotoInput(index);
  }

  openRowActions(index: number): void {
    this.selectItem(index);
    this.rowActionState.set({ index });
    this.showRowActionsDialog = true;
  }

  closeRowActionsDialog(): void {
    this.showRowActionsDialog = false;
    this.rowActionState.set(null);
  }

  replaceItemFromActions(): void {
    const state = this.rowActionState();
    if (!state) return;
    this.closeRowActionsDialog();
    this.replaceItem(state.index);
  }

  editProductFromActions(): void {
    const state = this.rowActionState();
    if (!state) return;
    const item = this.items()[state.index];
    this.closeRowActionsDialog();
    if (item?.productId) {
      this.router.navigate(['/products'], { queryParams: { editProductId: item.productId } });
      this.notification.add({
        severity: 'info',
        summary: 'Редактирование товара',
        detail: 'Открыт справочник товаров. Выберите нужную карточку для редактирования.',
      });
      return;
    }
    this.notification.add({
      severity: 'warn',
      summary: 'Нет связи с товаром',
      detail: 'Эта позиция не привязана к карточке товара. Используйте "Заменить товар".',
    });
  }

  removeItemFromActions(): void {
    const state = this.rowActionState();
    if (!state) return;
    this.closeRowActionsDialog();
    this.removeItem(state.index);
  }

  selectItem(index: number): void {
    if (index >= 0 && index < this.items().length) {
      this.selectedItemIndex.set(index);
    }
  }

  replaceItem(index: number): void {
    const item = this.items()[index];
    const blockIndex = this.blocks().findIndex(
      (block) =>
        block.type === 'table'
        && this.resolveTableKind(block) === (item?.tableKind ?? DEFAULT_TABLE_KIND),
    );
    if (blockIndex >= 0) {
      this.activeTableBlockIndex.set(blockIndex);
    }
    this.selectItem(index);
    this.replaceItemIndex.set(index);
    this.productPickerVisible.set(true);
  }

  openPhotoZoom(url: string): void {
    if (!url) return;
    this.photoZoomUrl = url;
    this.showPhotoZoomDialog = true;
  }

  onProductsSelected(products: IProduct[]): void {
    const tableKind = this.tableKindForPicker();
    const start = this.items().length;
    this.items.update((items) => [
      ...items,
      ...products.map((p, i) => ({
        productId: p._id,
        tableKind,
        sku: p.sku,
        photo: p.photos?.[0]?.url,
        name: p.name,
        qty: 1,
        unit: p.unit,
        price: p.listPrice ?? 0,
        sum: p.listPrice ?? 0,
        order: start + i,
      })),
    ]);
    for (let i = 0; i < products.length; i++) {
      this.recalcItem(start + i);
    }
    if (products.length > 0) {
      this.selectItem(start);
    }
    this.productPickerVisible.set(false);
  }

  onProductReplaced(product: IProduct): void {
    const idx = this.replaceItemIndex();
    if (idx === null) return;
    const qty = this.items()[idx]?.qty ?? 1;
    this.items.update((items) => {
      const updated = [...items];
      updated[idx] = {
        ...updated[idx],
        productId: product._id,
        sku: product.sku,
        photo: product.photos?.[0]?.url,
        name: product.name,
        unit: product.unit,
        price: product.listPrice ?? 0,
        sum: (product.listPrice ?? 0) * qty,
      };
      return updated;
    });
    this.recalcItem(idx);
    this.replaceItemIndex.set(null);
    this.productPickerVisible.set(false);
  }

  removeItem(index: number): void {
    this.items.update((items) => items.filter((_, i) => i !== index));
    const sel = this.selectedItemIndex();
    if (sel === null) return;
    if (sel === index) {
      const next = this.items();
      this.selectedItemIndex.set(next.length ? Math.min(index, next.length - 1) : null);
    } else if (sel > index) {
      this.selectedItemIndex.set(sel - 1);
    }
  }

  recalcItem(index: number): void {
    const item = this.items()[index];
    if (item) {
      item.sum = (item.qty || 0) * (item.price || 0);
    }
  }

  computeSum(item: QuotationItem): number {
    return (item.qty || 0) * (item.price || 0);
  }

  showPhotoInput(index: number): void {
    this.selectItem(index);
    this.photoDialogIndex = index;
    this.photoDialogUrl = this.items()[index]?.photo || '';
    this.showPhotoDialog = true;
  }

  confirmPhoto(): void {
    if (this.photoDialogUrl && this.photoDialogIndex >= 0) {
      this.items.update(items => {
        const updated = [...items];
        updated[this.photoDialogIndex] = { ...updated[this.photoDialogIndex], photo: this.photoDialogUrl };
        return updated;
      });
    }
    this.showPhotoDialog = false;
    this.photoDialogIndex = -1;
  }

  trackByItem(index: number): number {
    return index;
  }

  // ===== Blocks =====
  addBlock(type: 'text' | 'separator'): void {
    this.showAddMenu = false;
    const newBlock: EditorBlock = {
      type,
      order: this.blocks().length,
      content: type === 'text' ? 'Новый текст...' : '',
      settings: {
        fontSize: type === 'text' ? 11 : 11,
        fontWeight: 'normal',
        align: 'center',
        paddingTop: 8,
        paddingBottom: 8,
      },
    };
    if (type === 'text') {
      newBlock.title = '';
      newBlock.cells = [{ content: 'Новый текст...' }];
      newBlock.content = '';
    }
    this.blocks.update((blocks) => [...blocks, this.withClientKey(newBlock)]);
  }

  addTableBlock(): void {
    this.showAddMenu = false;
    const options = this.availableTableBlockOptions();
    const kind = this.selectedTableKind();
    const option = options.find((o) => o.value === kind) ?? options[0];
    if (!option) {
      this.notification.add({
        severity: 'info',
        summary: 'Таблицы',
        detail: 'В документе уже есть все доступные типы таблиц.',
      });
      return;
    }
    const tableKind = String(option.value ?? '');
    if (this.blockHasTableKind(tableKind)) {
      this.notification.add({
        severity: 'warn',
        summary: 'Таблица уже есть',
        detail: `На листе может быть только одна таблица «${option.label}».`,
      });
      return;
    }
    const newBlock: EditorBlock = {
      type: 'table',
      order: this.blocks().length,
      title: option.label,
      tableKind,
      content: '',
      settings: {
        fontSize: 10,
        fontWeight: 'normal',
        align: 'left',
        paddingTop: 8,
        paddingBottom: 8,
      },
    };
    this.blocks.update((blocks) => [...blocks, this.withClientKey(newBlock)]);
    this.syncSelectedTableKind();
  }

  toggleBlocksReorderLock(): void {
    this.blocksReorderLocked.update((locked) => !locked);
    this.activeBlockIndex.set(null);
  }

  hasEditableControls(block: EditorBlock): boolean {
    return block.type === 'text' || block.type === 'header' || block.type === 'separator' || block.type === 'table';
  }

  selectBlockKey(index: number, event: Event): void {
    event.preventDefault();
    if (this.isDraggingBlock()) return;
    this.activeBlockIndex.set(index);
  }

  selectBlock(index: number, event: MouseEvent): void {
    if (this.isDraggingBlock()) return;
    const target = event.target as HTMLElement;
    if (this.shouldIgnoreBlockSelectClick(target)) {
      event.stopPropagation();
      return;
    }
    event.stopPropagation();
    this.activeBlockIndex.set(index);
  }

  onCanvasClick(): void {
    this.activeBlockIndex.set(null);
  }

  private shouldIgnoreBlockSelectClick(target: HTMLElement): boolean {
    return !!target.closest(
      'input, select, textarea, .p-inputnumber, .p-select, .p-inputtext, .editor__table-photo, .editor__table-number',
    );
  }

  isLightSwatchColor(value: string): boolean {
    return value === '#ffffff' || value === '#fafafa' || value === '#f8fbff' || value === '#fffef5' || value === '#f8fefb';
  }

  /** Не начинать drag блока таблицы при работе с сеткой или кнопками toolbar. */
  stopTableBlockDrag(event: MouseEvent): void {
    event.stopPropagation();
  }

  isBlockControlsVisible(index: number, block: EditorBlock): boolean {
    return this.hasEditableControls(block) && this.activeBlockIndex() === index && !this.isDraggingBlock();
  }

  onBlockDragStarted(index: number): void {
    this.isDraggingBlock.set(true);
    this.activeBlockIndex.set(index);
  }

  onBlockDragEnded(): void {
    this.isDraggingBlock.set(false);
    this.activeBlockIndex.set(null);
  }

  setBlockAlign(index: number, align: 'left' | 'center' | 'right'): void {
    if (!this.isValidBlockIndex(index)) return;
    this.blocks.update((blocks) => {
      const updated = [...blocks];
      const block = updated[index];
      if (!block || (block.type !== 'text' && block.type !== 'header')) return blocks;

      if (block.type === 'text') {
        const normalized = this.normalizeTextBlock(block);
        const cells = (normalized.cells ?? []).map((cell) => ({
          ...this.normalizeCell(cell, align),
          align,
        }));
        updated[index] = this.syncTextBlockContent({
          ...normalized,
          cells,
          settings: { ...normalized.settings, align },
        });
      } else {
        updated[index] = {
          ...block,
          settings: { ...block.settings, align },
        };
      }
      return updated;
    });
  }

  setBlockColor(index: number, value: string): void {
    if (!this.isValidBlockIndex(index)) return;
    this.blocks.update((blocks) => {
      const updated = [...blocks];
      const block = updated[index];
      if (!block) return blocks;
      const settings = { ...block.settings };
      if (value) {
        settings.color = value;
      } else {
        delete settings.color;
      }
      updated[index] = { ...block, settings };
      return updated;
    });
  }

  setBlockBackgroundColor(index: number, value: string): void {
    if (!this.isValidBlockIndex(index)) return;
    this.blocks.update((blocks) => {
      const updated = [...blocks];
      const block = updated[index];
      if (!block) return blocks;
      const settings = { ...block.settings };
      if (value) {
        settings.backgroundColor = value;
      } else {
        delete settings.backgroundColor;
      }
      updated[index] = { ...block, settings };
      return updated;
    });
  }

  toggleBlockFontWeight(index: number): void {
    if (!this.isValidBlockIndex(index)) return;
    this.blocks.update((blocks) => {
      const updated = [...blocks];
      const block = updated[index];
      if (!block) return blocks;
      const next = block.settings.fontWeight === 'bold' ? 'normal' : 'bold';
      updated[index] = {
        ...block,
        settings: { ...block.settings, fontWeight: next },
      };
      return updated;
    });
  }

  cycleBlockBorder(index: number): void {
    if (!this.isValidBlockIndex(index)) return;
    const order: ('none' | 'dashed' | 'solid')[] = ['none', 'dashed', 'solid'];
    this.blocks.update((blocks) => {
      const updated = [...blocks];
      const block = updated[index];
      if (!block || (block.type !== 'text' && block.type !== 'header')) return blocks;
      const current = block.settings.borderStyle ?? (block.type === 'text' ? 'dashed' : 'none');
      const next = order[(order.indexOf(current) + 1) % order.length];
      updated[index] = {
        ...block,
        settings: { ...block.settings, borderStyle: next },
      };
      return updated;
    });
  }

  blockColorActive(block: EditorBlock, value: string): boolean {
    return (block.settings.color ?? '') === value;
  }

  blockBackgroundColorActive(block: EditorBlock, value: string): boolean {
    return (block.settings.backgroundColor ?? '') === value;
  }

  blockBorderActive(block: EditorBlock): boolean {
    const style = block.settings.borderStyle ?? (block.type === 'text' ? 'dashed' : 'none');
    return style !== 'none';
  }

  blockVisualStyles(block: EditorBlock): Record<string, string> {
    const s = block.settings;
    const styles: Record<string, string> = {};
    if (s.color) {
      styles['color'] = s.color;
    }
    if (s.backgroundColor) {
      styles['background-color'] = s.backgroundColor;
    }
    const border = s.borderStyle ?? (block.type === 'text' ? 'dashed' : 'none');
    if (border === 'solid') {
      styles['border'] = '1px solid var(--kp-border)';
      styles['border-radius'] = 'var(--kp-radius-sm)';
    } else if (border === 'dashed') {
      styles['border'] = '1px dashed var(--kp-border)';
      styles['border-radius'] = 'var(--kp-radius-sm)';
    }
    return styles;
  }

  onBlockDropped(event: KpSortableDropEvent<EditorBlock>): void {
    if (this.blocksReorderLocked()) return;
    if (event.previousIndex === event.currentIndex) return;
    const len = this.blocks().length;
    if (
      event.previousIndex < 0 ||
      event.currentIndex < 0 ||
      event.previousIndex >= len ||
      event.currentIndex >= len
    ) {
      return;
    }

    this.blocks.update(blocks => {
      const reordered = moveSortableItems(blocks, event);
      return reordered.map((block, order) => ({ ...block, order, clientKey: block.clientKey ?? this.nextBlockClientKey() }));
    });
  }

  removeBlock(index: number): void {
    if (!this.isValidBlockIndex(index) || this.blocks().length <= 1) return;
    this.blocks.update((blocks) => blocks.filter((_, i) => i !== index));
  }

  editTextBlock(index: number): void {
    if (!this.isValidBlockIndex(index)) return;
    const block = this.blocks()[index];
    if (block.type !== 'text') return;
    this.editingTextIndex = index;
    this.editingTextBlock = JSON.parse(JSON.stringify(this.normalizeTextBlock(block)));
    this.showTextEditor = true;
  }

  editTextCell(blockIndex: number, cellIndex: number): void {
    if (!this.isValidBlockIndex(blockIndex)) return;
    const block = this.blocks()[blockIndex];
    if (block.type !== 'text') return;
    this.editingTextIndex = blockIndex;
    this.editingTextBlock = JSON.parse(JSON.stringify(this.normalizeTextBlock(block)));
    this.openCellEditor(cellIndex);
  }

  openCellEditor(cellIndex: number): void {
    this.editingCellIndex = cellIndex;
    const cells = this.editingTextBlock.cells ?? [{ content: this.editingTextBlock.content }];
    const cell = this.normalizeCell(cells[cellIndex] ?? { content: '' });
    this.editingCellContent = cell.content;
    this.editingCellAlign = cell.align ?? 'center';
    this.showCellEditor = true;
  }

  addCell(): void {
    const cells = [...(this.editingTextBlock.cells ?? [{ content: this.editingTextBlock.content }])];
    if (cells.length >= this.maxTextCells) return;
    cells.push({ content: '', align: 'center' });
    this.editingTextBlock = { ...this.editingTextBlock, cells };
  }

  deleteCell(cellIndex: number): void {
    const cells = [...(this.editingTextBlock.cells ?? [{ content: this.editingTextBlock.content }])];
    if (cells.length <= 1) return;
    cells.splice(cellIndex, 1);
    this.editingTextBlock = { ...this.editingTextBlock, cells };
  }

  confirmCellEdit(): void {
    if (this.editingCellIndex >= 0) {
      const cells = [...(this.editingTextBlock.cells ?? [{ content: this.editingTextBlock.content }])];
      cells[this.editingCellIndex] = {
        content: this.editingCellContent,
        align: this.editingCellAlign,
      };
      this.editingTextBlock = { ...this.editingTextBlock, cells };

      if (this.editingTextIndex >= 0 && !this.showTextEditor) {
        this.persistEditingTextBlock();
      }
    }
    this.showCellEditor = false;
    this.editingCellIndex = -1;
    this.editingCellContent = '';
    this.editingCellAlign = 'center';
  }

  confirmTextEdit(): void {
    if (this.editingTextIndex >= 0) {
      this.persistEditingTextBlock();
    }
    this.showTextEditor = false;
    this.editingTextIndex = -1;
  }

  private persistEditingTextBlock(): void {
    if (this.editingTextIndex < 0) return;
    const synced = this.syncTextBlockContent(this.editingTextBlock);
    this.blocks.update(blocks => {
      const updated = [...blocks];
      updated[this.editingTextIndex] = { ...synced };
      return updated;
    });
    this.editingTextIndex = -1;
  }

  getCells(block: EditorBlock): EditorBlockCell[] {
    return this.normalizeTextBlock(block).cells ?? [{ content: block.content }];
  }

  onAddCell(blockIndex: number): void {
    if (!this.isValidBlockIndex(blockIndex)) return;
    this.blocks.update((blocks) => {
      const updated = [...blocks];
      const block = this.normalizeTextBlock(updated[blockIndex]);
      const cells = [...(block.cells ?? [])];
      if (cells.length >= this.maxTextCells) return blocks;
      cells.push({ content: '', align: 'center' });
      updated[blockIndex] = this.syncTextBlockContent({ ...block, cells });
      return updated;
    });
  }

  onEditCell(blockIndex: number, cellIndex: number): void {
    this.editTextCell(blockIndex, cellIndex);
  }

  private isValidBlockIndex(index: number): boolean {
    return Number.isInteger(index) && index >= 0 && index < this.blocks().length;
  }

  private normalizeCell(
    cell: EditorBlockCell,
    fallbackAlign: 'left' | 'center' | 'right' = 'center',
  ): EditorBlockCell {
    return {
      content: cell.content ?? '',
      align: cell.align ?? fallbackAlign,
    };
  }

  private normalizeTextBlock(block: EditorBlock): EditorBlock {
    if (block.type !== 'text') return block;
    const fallbackAlign = block.settings.align ?? 'center';
    const settings = {
      ...block.settings,
      paddingTop: block.settings.paddingTop ?? 8,
      paddingBottom: block.settings.paddingBottom ?? 8,
    };
    if (block.cells && block.cells.length > 0) {
      return {
        ...block,
        settings,
        cells: block.cells.map((cell) => this.normalizeCell(cell, fallbackAlign)),
      };
    }
    return {
      ...block,
      settings,
      cells: [{ content: block.content || '', align: fallbackAlign }],
    };
  }

  private normalizeBlocks(blocks: EditorBlock[]): EditorBlock[] {
    return blocks.map((block) => this.withClientKey(this.normalizeTableBlock(this.normalizeTextBlock(block))));
  }

  private normalizeTableBlock(block: EditorBlock): EditorBlock {
    if (block.type !== 'table') return block;
    return {
      ...block,
      tableKind: block.tableKind ?? 'products',
      title: block.title ?? 'Товары',
    };
  }

  private syncTextBlockContent(block: EditorBlock): EditorBlock {
    if (block.type !== 'text') return block;
    const normalized = this.normalizeTextBlock(block);
    const cells = normalized.cells ?? [];
    return {
      ...normalized,
      content: cells.map((cell) => cell.content).join('\n\n') || cells[0]?.content || '',
      settings: {
        ...normalized.settings,
        columns: cells.length,
      },
    };
  }

  editBlockSettings(index: number): void {
    const block = this.blocks()[index];
    if (block.type === 'separator') {
      this.paddingDialogIndex = index;
      this.paddingDialogValue = block.settings.paddingTop;
      this.showPaddingDialog = true;
    }
  }

  confirmPadding(): void {
    if (this.paddingDialogIndex >= 0) {
      this.blocks.update(blocks => {
        const updated = [...blocks];
        updated[this.paddingDialogIndex] = {
          ...updated[this.paddingDialogIndex],
          settings: { ...updated[this.paddingDialogIndex].settings, paddingTop: this.paddingDialogValue ?? 0 },
        };
        return updated;
      });
    }
    this.showPaddingDialog = false;
    this.paddingDialogIndex = -1;
  }

  trackByBlock(index: number, _block: EditorBlock): string {
    return _block._id || _block.clientKey || `${_block.type}-${index}`;
  }

  private blockKeySeq = 0;

  private nextBlockClientKey(): string {
    this.blockKeySeq += 1;
    return `b-${this.blockKeySeq}`;
  }

  private withClientKey(block: EditorBlock): EditorBlock {
    if (block.clientKey) {
      return block;
    }
    return { ...block, clientKey: this.nextBlockClientKey() };
  }

  // ===== Background =====
  showBgInput(): void {
    this.bgDialogUrl = this.quotationBg || '';
    this.showBgDialog = true;
  }

  confirmBg(): void {
    const url = this.bgDialogUrl;
    if (!url) {
      this.showBgDialog = false;
      return;
    }

    const activeId = this.activeTemplateId();
    if (activeId) {
      this.crudApi.update('/document-templates', activeId, { backgroundImage: url })
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          tap(() => this.loadTemplates()),
        )
        .subscribe();
    } else {
      this.crudApi.create<DocumentTemplate>('/document-templates', {
        name: 'Фон для КП',
        docType: 'quotation',
        isDefault: false,
        backgroundImage: url,
        blocks: this.blocks(),
      }).pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((result: DocumentTemplate) => {
          this.activeTemplateId.set(result._id);
          this.loadTemplates();
        }),
      ).subscribe();
    }
    this.showBgDialog = false;
  }

  removeBackgroundImage(): void {
    const activeId = this.activeTemplateId();
    if (activeId) {
      this.crudApi.update('/document-templates', activeId, { backgroundImage: undefined })
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          tap(() => this.loadTemplates()),
        )
        .subscribe();
    }
  }

  // ===== Templates =====
  applyTemplate(tmpl: DocumentTemplate): void {
    this.activeTemplateId.set(tmpl._id);
    if (tmpl.blocks && tmpl.blocks.length > 0) {
      this.blocks.set(this.normalizeBlocks(JSON.parse(JSON.stringify(tmpl.blocks))));
    } else {
      this.initDefaultBlocks();
    }
    this.showTemplates = false;
  }

  showSaveTemplateInput(): void {
    this.templateNameValue = '';
    this.showTemplateNameDialog = true;
  }

  confirmSaveTemplate(): void {
    const name = this.templateNameValue;
    if (!name) {
      this.showTemplateNameDialog = false;
      return;
    }

    const template: Partial<DocumentTemplate> & { name: string } = {
      name,
      docType: 'quotation',
      isDefault: false,
      blocks: this.blocks(),
      backgroundImage: this.quotationBg,
    };

    this.crudApi.create<DocumentTemplate>('/document-templates', template)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap({
          next: (result: DocumentTemplate) => {
            this.notification.add({ severity: 'success', summary: 'Шаблон сохранён', detail: `Шаблон «${name}» создан` });
            this.loadTemplates();
            this.activeTemplateId.set(result._id);
          },
          error: () => {
            this.notification.add({ severity: 'error', summary: 'Ошибка', detail: 'Не удалось сохранить шаблон' });
          },
        }),
      )
      .subscribe();
    this.showTemplateNameDialog = false;
  }

  deleteTemplate(tmpl: DocumentTemplate): void {
    if (!tmpl._id) return;
    this.crudApi.delete('/document-templates', tmpl._id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap({
          next: () => {
            this.notification.add({ severity: 'success', summary: 'Удалено', detail: 'Шаблон удалён' });
            if (this.activeTemplateId() === tmpl._id) {
              this.activeTemplateId.set(undefined);
              this.initDefaultBlocks();
            }
            this.loadTemplates();
          },
        }),
      )
      .subscribe();
  }

  trackByTemplate(index: number, tmpl: DocumentTemplate): string | undefined {
    return tmpl._id || String(index);
  }

  // ===== Navigation =====
  goBack(): void {
    this.router.navigate(['/quotations']);
  }

  // ===== Utilities =====
  getSeverity(value: string): 'success' | 'warn' | 'danger' | 'info' | 'secondary' | 'contrast' {
    const map: Record<string, 'success' | 'warn' | 'danger' | 'info' | 'secondary' | 'contrast'> = {
      draft: 'warn', approved: 'success', sent: 'info', cancelled: 'danger',
      completed: 'success', in_progress: 'info',
    };
    return map[value] ?? 'info';
  }
}
